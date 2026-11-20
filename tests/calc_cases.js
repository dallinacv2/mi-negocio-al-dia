let fallos = 0, pasaron = 0;
const ok = (n, c, x) => { if (c) { pasaron++; } else { fallos++; console.log('  FALLA:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const reset = () => { S.pagos = []; S.prestamos = []; S.ventas = []; };
const pago = (p, monto, fecha, extra = {}) => { const x = {id: 'g' + S.pagos.length, tipo: 'prestamo', refId: p.id, monto, fecha, creado: S.pagos.length, ...extra}; S.pagos.push(x); return x; };
const mk = o => { const p = {id: 'p' + S.prestamos.length, inicio: '2026-01-01', mora: 0, base: 'total', freq: 'semanal', ...o}; S.prestamos.push(p); return p; };

console.log('== 1. Fechas');
ok('sumaMeses 31 ene +1 = 28 feb', sumaMeses('2026-01-31', 1) === '2026-02-28', sumaMeses('2026-01-31', 1));
ok('sumaMeses 31 ene +2 = 31 mar (sin arrastre)', sumaMeses('2026-01-31', 2) === '2026-03-31', sumaMeses('2026-01-31', 2));
ok('sumaMeses cruce de año', sumaMeses('2026-11-15', 3) === '2027-02-15', sumaMeses('2026-11-15', 3));
ok('sumaDias cruce de año', sumaDias('2026-12-30', 5) === '2027-01-04');
ok('diffDias', diffDias('2026-03-01', '2026-02-01') === 28);

console.log('== 2. Préstamo con cuotas fijas');
reset();
let p = mk({capital: 10000, tasa: 20, cuotas: 4});
ok('interés 20% total', interesTotal(p) === 2000, interesTotal(p));
ok('total 12000', totalPrestamo(p) === 12000);
ok('cuota 3000', valorCuota(p) === 3000);
let d = detalle(p, '2026-01-02');
ok('sin pagos: saldo 12000', d.saldo === 12000, d.saldo);
for (let i = 1; i <= 4; i++) pago(p, 3000, fechaCuota(p, i));
d = detalle(p, '2026-03-01');
ok('pagado a tiempo: saldado', d.saldado && d.saldo === 0, d);
ok('pagado a tiempo: sin mora', d.mora === 0, d.mora);

reset();
p = mk({capital: 1000, tasa: 10, cuotas: 3});
ok('redondeo: suma cuotas = total', r2(montoCuota(p, 1) + montoCuota(p, 2) + montoCuota(p, 3)) === totalPrestamo(p), [montoCuota(p,1), montoCuota(p,2), montoCuota(p,3), totalPrestamo(p)]);
pago(p, montoCuota(p, 1), fechaCuota(p, 1)); pago(p, montoCuota(p, 2), fechaCuota(p, 2)); pago(p, montoCuota(p, 3), fechaCuota(p, 3));
ok('redondeo: pagando cada cuota queda saldado', detalle(p, '2026-03-01').saldado, detalle(p, '2026-03-01').saldo);

console.log('== 3. Interés mensual por duración');
reset();
p = mk({capital: 25000, tasa: 10, base: 'mensual', cuotas: 6, freq: 'quincenal'});
ok('6 quincenas = 3 meses => 7500', interesTotal(p) === 7500, interesTotal(p));
p = mk({capital: 1000, tasa: 10, base: 'mensual', cuotas: 4, freq: 'semanal'});
ok('4 semanas = 28/30 meses', Math.abs(interesTotal(p) - 1000 * 0.1 * 28 / 30) < 1e-9, interesTotal(p));
p = mk({capital: 1000, tasa: 5, base: 'mensual', cuotas: 3, freq: 'mensual'});
ok('3 meses al 5% = 150', interesTotal(p) === 150, interesTotal(p));
ok('fechas mensuales', fechaCuota(p, 1) === '2026-02-01' && fechaCuota(p, 3) === '2026-04-01');

console.log('== 4. Mora y atraso (cuotas fijas)');
reset();
p = mk({capital: 1000, tasa: 0, cuotas: 2, freq: 'semanal', mora: 2});   // cuotas de 500 el 8 y 15 de enero
d = detalle(p, '2026-01-10');
ok('1 cuota vencida 2 días', d.cuotas[0].estado === 'vencida' && d.cuotas[0].dias === 2 && d.vencido === 500, d.cuotas[0]);
ok('mora 2%/día × 500 × 2 días = 20', d.mora === 20, d.mora);
pago(p, 500, '2026-01-10');
d = detalle(p, '2026-01-10');
ok('pago tardío deja la mora (20)', d.mora === 20 && d.vencido === 0, d);
d = detalle(p, '2026-01-12');
ok('la mora ya cobrada por pago tardío no sigue creciendo', d.mora === 20, d.mora);
S.pagos.push({id: 'm1', tipo: 'mora', refId: p.id, monto: 20, fecha: '2026-01-11', creado: 99});
d = detalle(p, '2026-01-12');
ok('mora pendiente 0 tras cobrarla', d.moraPend === 0, [d.mora, d.moraCobrada, d.moraPend]);
ok('estadoPrestamo no revienta', !!estadoPrestamo(p).txt);

console.log('== 5. Ventas a crédito');
reset();
const v = {id: 'v1', fecha: '2026-01-01', total: 1000, pagado0: 400, vence: '2026-01-10', mora: 1, items: []};
S.ventas.push(v);
ok('saldo inicial 600', ventaSaldo(v) === 600);
S.pagos.push({id: 'a1', tipo: 'venta', refId: 'v1', monto: 100, fecha: '2026-01-15', creado: 1});
ok('saldo tras abono 500', ventaSaldo(v) === 500, ventaSaldo(v));
const mv = (() => { const r = moraVenta(v); return r; })();
ok('moraVenta devuelve número', Number.isFinite(mv.mora), mv);
ok('mora tramo 1: 600 × 1% × 5 días = 30 (mínimo)', mv.mora >= 30, mv);
ok('sin tasa, sin mora', moraVenta({...v, mora: 0}).mora === 0);
ok('financiado descuenta saldo', ventaSaldo({...v, financiado: 600}) === 0);
const vf = {id: 'v2', fecha: '2026-01-01', total: 0.1 * 3, pagado0: 0.3, items: []};
ok('total con decimales flotantes no deja saldo fantasma', ventaSaldo(vf) === 0, ventaSaldo(vf));

console.log('== 6. Préstamo ABIERTO');
reset();
p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
d = detalle(p, '2026-01-15');
ok('interés del primer período 1000', d.cuotas[0].monto === 1000 && d.vc === 1000, d.cuotas[0]);
ok('capital pendiente 10000', d.capitalPend === 10000);
pago(p, 1000, '2026-02-01');
d = detalle(p, '2026-02-01');
ok('pagar solo el interés deja capital intacto', d.capitalPend === 10000 && d.interesPagado === 1000, d);
pago(p, 3000, '2026-03-01');   // 1000 interés + 2000 abono a capital
d = detalle(p, '2026-03-01');
ok('abono: capital baja a 8000', d.capitalPend === 8000, d.capitalPend);
ok('siguiente interés 800', d.cuotas.find(c => c.n === 3).monto === 800 || d.vc === 800, d.vc);

console.log('== 7. Pago total (liquidar) abierto');
const liquidarYGuardar = (p, fecha, exo) => { const L = liquidar(p, fecha, exo); const x = pago(p, L.total, fecha, {liq: true, ajuste: L.ajuste}); return {L, x}; };
const cuadra = (nombre, p, fecha, L) => {
  const d = detalle(p, fecha);
  ok(nombre + ': queda saldado', d.saldado && d.saldo === 0, {saldo: d.saldo, capPend: d.capitalPend, intPend: d.interesPend});
  const aplicado = r2(d.interesPagado + d.capitalPagado);
  ok(nombre + ': lo pagado = interés + capital aplicados', Math.abs(aplicado - d.pagado) < 0.01, {pagado: d.pagado, interesPagado: d.interesPagado, capitalPagado: d.capitalPagado, condonado: d.condonado});
  ok(nombre + ': perdonado coincide con el ajuste', Math.abs(d.condonado - L.ajuste) < 0.01, {condonado: d.condonado, ajuste: L.ajuste});
};
// 7a. a mitad de período, proporcional
reset(); p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
let r = liquidarYGuardar(p, '2026-01-16', false);
ok('7a proporcional: 15/31 días de 1000', r.L.enCurso === r2(1000 * 15 / 31), r.L);
cuadra('7a mitad de período', p, '2026-01-16', r.L);
// 7b. exonerado a mitad de período
reset(); p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
r = liquidarYGuardar(p, '2026-01-16', true);
ok('7b exonerado: total = capital 10000', r.L.total === 10000, r.L);
cuadra('7b exonerado', p, '2026-01-16', r.L);
// 7c. el día exacto de vencimiento (caso sospechoso)
reset(); p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
r = liquidarYGuardar(p, '2026-02-01', false);
console.log('   (7c) liquidar el día exacto del vencimiento:', JSON.stringify({total: r.L.total, atrasado: r.L.atrasado, enCurso: r.L.enCurso, ajuste: r.L.ajuste}));
cuadra('7c día de vencimiento', p, '2026-02-01', r.L);
// 7d. con atraso de varios períodos
reset(); p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
r = liquidarYGuardar(p, '2026-03-20', false);
cuadra('7d con 2 intereses atrasados', p, '2026-03-20', r.L);
// 7e. exonerado el día de vencimiento
reset(); p = mk({capital: 10000, tasa: 10, modo: 'abierto', cuotas: 0, freq: 'mensual', inicio: '2026-01-01'});
r = liquidarYGuardar(p, '2026-02-01', true);
cuadra('7e exonerado en vencimiento', p, '2026-02-01', r.L);

console.log('== 8. Casos límite / entradas raras');
reset(); p = mk({capital: 1000, tasa: 10, cuotas: 0});
ok('cuotas=0 (dato corrupto) no debe dar Infinity/NaN', Number.isFinite(valorCuota(p)), valorCuota(p));
reset(); p = mk({capital: 1000, tasa: 10, cuotas: 4}); S.pagos.push({id: 'z', tipo: 'prestamo', refId: p.id, monto: null, fecha: '2026-01-05', creado: 1});
d = detalle(p, '2026-01-30'); ok('un pago con monto vacío (null) no contamina el saldo', Number.isFinite(d.saldo), d.saldo);
reset(); p = mk({capital: 1000, tasa: 10, cuotas: 2}); pago(p, 5000, '2026-01-05');
d = detalle(p, '2026-01-30'); ok('sobrepago no deja saldo negativo', d.saldo === 0 && d.saldado, d.saldo);
reset(); S.ventas.push({id: 'vx', fecha: '2026-01-01', total: 100, items: []});   // sin pagado0
ok('venta sin pagado0 (dato viejo) no da NaN', Number.isFinite(ventaSaldo(S.ventas[0])), ventaSaldo(S.ventas[0]));

console.log(`\nRESULTADO: ${pasaron} correctas, ${fallos} con fallo`);

process.exitCode = fallos ? 1 : 0;
