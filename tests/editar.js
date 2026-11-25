/* Prueba de edición: préstamos, ventas (con inventario), gastos, cobros y "+ Nuevo artículo" dentro de la venta */
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8').replace(/__BUILD__/g, '1100');
const fallos = []; let ok = 0;
const vc = new VirtualConsole();
vc.on('jsdomError', e => fallos.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.TextEncoder = w.TextEncoder || TextEncoder; w.TextDecoder = w.TextDecoder || TextDecoder; w.scrollTo = () => {}; w.confirm = () => true; w.alert = () => {}; w.matchMedia = () => ({matches: false, addEventListener() {}, addListener() {}});
    w.HTMLCanvasElement.prototype.getContext = () => ({measureText: () => ({width: 10}), fillText() {}, fillRect() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {}});
    w.localStorage.setItem('mnad-sin-nube', '1'); } });
const w = dom.window, d = w.document, sleep = ms => new Promise(r => setTimeout(r, ms));
const clic = el => el && el.dispatchEvent(new w.MouseEvent('click', {bubbles: true}));
const eq = (nombre, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else fallos.push(`${nombre}: esperado ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
const poner = (id, v) => { const e = d.getElementById('f-' + id); e.value = v; e.dispatchEvent(new w.Event('input', {bubbles: true})); e.dispatchEvent(new w.Event('change', {bubbles: true})); };
const S = () => w.eval('S');
(async () => {
  await sleep(800);
  await w.eval(`(async()=>{ S.clientes=[]; S.productos=[]; S.ventas=[]; S.prestamos=[]; S.pagos=[]; S.gastos=[];
    await guardar('clientes',{id:'c1',nombre:'Ana'}); await guardar('clientes',{id:'c2',nombre:'Beto'});
    await guardar('productos',{id:'p1',nombre:'Silla',precio:100,costo:60,stock:10,minimo:1});
    await guardar('productos',{id:'p2',nombre:'Mesa',precio:300,costo:200,stock:5,minimo:1}); })()`);

  /* --- Venta: crear y editar, el inventario se ajusta --- */
  w.formVenta(); await sleep(30);
  d.querySelector('.vp').value = 'p1'; d.querySelector('.vp').dispatchEvent(new w.Event('change', {bubbles: true}));
  d.querySelector('.vc').value = '3'; poner('cobrado', '');
  clic(d.querySelector('[data-act="save-venta"]')); await sleep(80);
  let v = S().ventas[0]; eq('venta creada total', v.total, 300); eq('stock tras vender 3', S().productos.find(p => p.id === 'p1').stock, 7);
  w.eval('cerrar()');
  w.formVenta(null, v.id); await sleep(30);
  eq('el editor muestra 3 sillas', d.querySelector('.vc').value, '3');
  eq('disponible = stock + lo de esta venta', /\(10\)/.test(d.querySelector('.vp').innerHTML), true);
  d.querySelector('.vc').value = '5'; poner('cobrado', '');
  clic(d.querySelector('[data-act="save-venta"]')); await sleep(80);
  v = S().ventas[0]; eq('total editado', v.total, 500); eq('stock tras editar a 5', S().productos.find(p => p.id === 'p1').stock, 5); eq('misma venta (no duplicó)', S().ventas.length, 1);
  w.formVenta(null, v.id); await sleep(30);
  d.querySelector('.vc').value = '11'; clic(d.querySelector('[data-act="save-venta"]')); await sleep(60);
  eq('no deja pasarse del stock', S().productos.find(p => p.id === 'p1').stock, 5); w.eval('cerrar()');
  /* cambiar de producto */
  w.formVenta(null, v.id); await sleep(30);
  d.querySelector('.vp').value = 'p2'; d.querySelector('.vp').dispatchEvent(new w.Event('change', {bubbles: true})); d.querySelector('.vc').value = '1'; poner('cobrado', '');
  clic(d.querySelector('[data-act="save-venta"]')); await sleep(80);
  eq('silla devuelta', S().productos.find(p => p.id === 'p1').stock, 10); eq('mesa descontada', S().productos.find(p => p.id === 'p2').stock, 4);
  w.eval('cerrar()');

  /* --- Venta a crédito, abono posterior y edición --- */
  await w.eval(`guardar('ventas',{id:'v2',fecha:'2026-11-01',clienteId:'c1',items:[{pid:'p1',nombre:'Silla',cant:2,precio:100,costo:60}],total:200,pagado0:50,vence:'2026-11-30',creado:1})`);
  await w.eval(`guardar('productos',{...producto('p1'),stock:8})`);
  await w.eval(`guardar('pagos',{id:'g1',tipo:'venta',refId:'v2',clienteId:'c1',monto:100,fecha:'2026-11-05',nota:'',creado:2})`);
  w.formVenta(null, 'v2'); await sleep(30);
  d.querySelector('.vc').value = '1'; poner('cobrado', '50');   /* total 100, ya hay 50+100 pagados -> se pasa */
  clic(d.querySelector('[data-act="save-venta"]')); await sleep(60);
  eq('rechaza total menor que lo ya abonado', S().ventas.find(x => x.id === 'v2').total, 200); w.eval('cerrar()');
  /* corregir el abono: tope = saldo sin ese abono */
  w.formPago('g1'); await sleep(30); poner('monto', '200');
  clic(d.querySelector('[data-act="save-pago"]')); await sleep(60);
  eq('abono mayor al tope rechazado', S().pagos.find(x => x.id === 'g1').monto, 100); w.eval('cerrar()');
  w.formPago('g1'); await sleep(30); poner('monto', '150'); poner('nota', 'transferencia');
  clic(d.querySelector('[data-act="save-pago"]')); await sleep(60);
  eq('abono corregido', S().pagos.find(x => x.id === 'g1').monto, 150); eq('saldo de la venta', w.eval(`ventaSaldo(S.ventas.find(x=>x.id==='v2'))`), 0);

  /* --- Venta financiada: solo cliente/fecha/nota --- */
  await w.eval(`guardar('ventas',{id:'v3',fecha:'2026-11-02',clienteId:'c1',items:[{pid:'p2',nombre:'Mesa',cant:1,precio:300,costo:200}],total:300,pagado0:0,financiado:300,prestamoId:'l3',creado:3})`);
  await w.eval(`guardar('prestamos',{id:'l3',clienteId:'c1',capital:300,tasa:0,base:'total',cuotas:3,freq:'mensual',inicio:'2026-11-02',mora:0,ventaId:'v3'})`);
  w.formVenta(null, 'v3'); await sleep(30);
  eq('venta financiada: sin líneas de productos', !!d.querySelector('#lineas'), false);
  poner('cli', 'c2'); poner('nota', 'cambio de cliente'); clic(d.querySelector('[data-act="save-venta"]')); await sleep(80);
  eq('cliente de la venta', S().ventas.find(x => x.id === 'v3').clienteId, 'c2'); eq('cliente del préstamo ligado', S().prestamos.find(x => x.id === 'l3').clienteId, 'c2');
  eq('total intacto', S().ventas.find(x => x.id === 'v3').total, 300);

  /* --- Préstamo: editar conservando pagos --- */
  await w.eval(`guardar('prestamos',{id:'l1',clienteId:'c1',capital:1000,tasa:10,base:'total',cuotas:4,freq:'semanal',inicio:'2026-11-01',mora:0,creado:5})`);
  await w.eval(`guardar('pagos',{id:'g2',tipo:'prestamo',refId:'l1',clienteId:'c1',monto:100,fecha:'2026-11-08',nota:'',creado:6})`);
  w.formPrestamo(undefined, 'l1'); await sleep(30);
  eq('formulario trae el monto', d.getElementById('f-capital').value, '1000'); eq('formulario trae las cuotas', d.getElementById('f-cuotas').value, '4');
  poner('capital', '2000'); poner('cuotas', '5');
  clic(d.querySelector('[data-act="save-prestamo"]')); await sleep(80);
  let l = S().prestamos.find(x => x.id === 'l1'); eq('capital editado', l.capital, 2000); eq('cuotas editadas', l.cuotas, 5); eq('mismo préstamo', S().prestamos.filter(x => x.id === 'l1').length, 1);
  eq('pago conservado', S().pagos.some(x => x.id === 'g2'), true); eq('saldo recalculado', w.eval(`detalle(S.prestamos.find(x=>x.id==='l1')).saldo`), 2200 - 100);
  /* pasar a abierto y volver */
  w.formPrestamo(undefined, 'l1'); await sleep(30); poner('modo', 'abierto'); clic(d.querySelector('[data-act="save-prestamo"]')); await sleep(80);
  eq('ahora abierto', S().prestamos.find(x => x.id === 'l1').modo, 'abierto');
  w.formPrestamo(undefined, 'l1'); await sleep(30); poner('modo', 'cuotas'); poner('cuotas', '4'); clic(d.querySelector('[data-act="save-prestamo"]')); await sleep(80);
  eq('vuelve a cuotas fijas', S().prestamos.find(x => x.id === 'l1').modo, undefined);
  /* préstamo ligado a venta: monto bloqueado */
  w.formPrestamo(undefined, 'l3'); await sleep(30); poner('capital', '999'); poner('tasa', '5'); clic(d.querySelector('[data-act="save-prestamo"]')); await sleep(80);
  eq('monto del préstamo financiado no cambia', S().prestamos.find(x => x.id === 'l3').capital, 300); eq('pero el interés sí', S().prestamos.find(x => x.id === 'l3').tasa, 5);

  /* --- Pago total: solo nota --- */
  await w.eval(`guardar('pagos',{id:'g3',tipo:'prestamo',refId:'l1',clienteId:'c1',monto:777,fecha:'2026-11-20',nota:'Pago total',liq:true,ajuste:0,creado:9})`);
  w.formPago('g3'); await sleep(30); eq('pago total: monto bloqueado', d.getElementById('f-monto').disabled, true); poner('nota', 'efectivo');
  clic(d.querySelector('[data-act="save-pago"]')); await sleep(60);
  eq('pago total solo cambia nota', [S().pagos.find(x => x.id === 'g3').monto, S().pagos.find(x => x.id === 'g3').nota], [777, 'efectivo']);

  /* --- Gasto --- */
  await w.eval(`guardar('gastos',{id:'x1',concepto:'Luz',monto:500,fecha:'2026-11-03',cat:'Servicios',creado:1})`);
  w.formGasto('x1'); await sleep(30); poner('monto', '650'); poner('concepto', 'Luz noviembre');
  clic(d.querySelector('[data-act="save-gasto"]')); await sleep(60);
  eq('gasto editado', [S().gastos.length, S().gastos[0].monto, S().gastos[0].concepto, S().gastos[0].cat], [1, 650, 'Luz noviembre', 'Servicios']);

  /* --- + Nuevo artículo dentro de una venta nueva: conserva lo escrito y deja el artículo elegido --- */
  w.formVenta(); await sleep(30);
  poner('cli', 'c2'); poner('cobrado', '10'); poner('nota', 'para mañana');
  d.querySelector('.vp').value = 'p2'; d.querySelector('.vp').dispatchEvent(new w.Event('change', {bubbles: true})); d.querySelector('.vc').value = '2';
  clic(d.querySelector('[data-act="nuevo-producto-venta"]')); await sleep(40);
  eq('abrió formulario de artículo', !!d.getElementById('f-nombre'), true);
  poner('nombre', 'Lámpara'); poner('precio', '80'); poner('stock', '7');
  clic(d.querySelector('[data-act="save-producto"]')); await sleep(80);
  eq('volvió a la venta', !!d.getElementById('lineas'), true); eq('cliente conservado', d.getElementById('f-cli').value, 'c2');
  eq('cobrado conservado', d.getElementById('f-cobrado').value, '10'); eq('nota conservada', d.getElementById('f-nota').value, 'para mañana');
  const lam = S().productos.find(p => p.nombre === 'Lámpara');
  const filas = [...d.querySelectorAll('#lineas .vl')].map(r => [r.querySelector('.vp').value, r.querySelector('.vc').value]);
  eq('línea previa conservada', filas[0], ['p2', '2']); eq('artículo nuevo elegido', filas[1] && filas[1][0], lam && lam.id);
  /* Cancelar desde el formulario de artículo también vuelve */
  clic(d.querySelector('[data-act="nuevo-producto-venta"]')); await sleep(40); clic(d.querySelector('[data-act="volver-venta"]')); await sleep(40);
  eq('cancelar vuelve a la venta con lo escrito', [!!d.getElementById('lineas'), d.getElementById('f-cli').value], [true, 'c2']);
  /* Sin artículos creados: se puede crear desde la venta */
  await w.eval(`(async()=>{ for (const p of [...S.productos]) await borrar('productos', p.id); })()`);
  w.formVenta(); await sleep(30); eq('sin artículos abre el formulario de artículo', !!d.getElementById('f-nombre'), true);
  poner('nombre', 'Taza'); poner('precio', '20'); poner('stock', '3'); clic(d.querySelector('[data-act="save-producto"]')); await sleep(80);
  eq('y vuelve a la venta con la taza elegida', d.querySelector('#lineas .vp').value, S().productos[0].id);

  console.log(`EDICIÓN: ${ok} correctas, ${fallos.length} con fallo`); fallos.slice(0, 20).forEach(e => console.log('  -', e));
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.log('EXCEPCIÓN:', e.stack || e); process.exit(2); });
