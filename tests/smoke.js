const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8').replace(/__BUILD__/g, '1100');
const errores = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errores.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
vc.on('error', (...a) => errores.push('console.error: ' + a.map(x => x && x.stack || x).join(' ').slice(0, 300)));
const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.TextEncoder = w.TextEncoder || TextEncoder; w.TextDecoder = w.TextDecoder || TextDecoder; w.scrollTo = () => {}; w.confirm = () => true; w.alert = () => {}; w.matchMedia = () => ({matches: false, addEventListener() {}, addListener() {}});
    w.HTMLCanvasElement.prototype.getContext = () => ({measureText: () => ({width: 10}), fillText() {}, fillRect() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, setLineDash() {}});
    w.localStorage.setItem('mnad-sin-nube', '1'); } });
const w = dom.window, d = w.document, sleep = ms => new Promise(r => setTimeout(r, ms));
const clic = el => el && el.dispatchEvent(new w.MouseEvent('click', {bubbles: true}));
(async () => {
  await sleep(800);
  let pasos = 0;
  const vista = () => d.querySelector('#view').innerHTML.length;
  await w.cargarEjemplos(); await sleep(200);
  for (const t of ['inicio', 'cobros', 'prestamos', 'clientes', 'ventas', 'inventario', 'notas', 'reportes']) {
    clic(d.querySelector(`#nav [data-k="${t}"], #navSide [data-k="${t}"]`)); await sleep(60);
    if (vista() < 200) errores.push('pantalla vacía: ' + t); pasos++;
    // abrir el primer elemento clicable de la pantalla (préstamo, cliente, producto)
    const fila = d.querySelector('#view .row.click'); if (fila) { clic(fila); await sleep(60); if (!d.querySelector('#modal .sheet')) errores.push('no abrió detalle en ' + t); clic(d.querySelector('#modal [data-act="cerrar"]')); pasos++; }
  }
  // formularios y recibos
  const abrirYCerrar = async sel => { const b = d.querySelector(sel); if (!b) { errores.push('falta botón ' + sel); return; } clic(b); await sleep(60); if (!d.querySelector('#modal .sheet')) errores.push('no abrió ' + sel); clic(d.querySelector('#modal [data-act="cerrar"]')); pasos++; };
  clic(d.querySelector('#nav [data-k="prestamos"]')); await sleep(60);
  await abrirYCerrar('[data-act="nuevo-prestamo"]'); await abrirYCerrar('[data-act="tipos"]');
  clic(d.querySelector('#nav [data-k="ventas"]')); await sleep(60);
  await abrirYCerrar('[data-act="nueva-venta"]'); await abrirYCerrar('[data-act="recibo-venta"]'); await abrirYCerrar('[data-act="cobrar"]'); await abrirYCerrar('[data-act="financiar"]');
  clic(d.querySelector('#nav [data-k="cobros"]')); await sleep(60);
  await abrirYCerrar('[data-act="cobrar"]'); await abrirYCerrar('[data-act="recibo-pago"]');
  // detalle de préstamo y sus recibos / impresiones
  clic(d.querySelector('#nav [data-k="prestamos"]')); await sleep(60); clic(d.querySelector('#view .row.click')); await sleep(60);
  for (const a of ['ver-prestamo-cliente', 'recibo-prestamo']) { const b = d.querySelector(`#modal [data-act="${a}"]`); if (b) { clic(b); await sleep(60); pasos++; } }
  // respaldo y xlsx
  clic(d.querySelector('#modal [data-act="cerrar"]'));
  const xl = w.construirXlsx(); if (!xl || !xl.size) errores.push('xlsx vacío'); else pasos++;
  const js = w.respaldoJson(); if (!js || !js.size) errores.push('json vacío'); else pasos++;
  // préstamo abierto de ejemplo: crear, cobrar y pago total por la lógica
  await w.guardar('prestamos', {id: 'abierto1', clienteId: 'ej-c0', capital: 5000, tasa: 10, base: 'total', cuotas: 0, freq: 'mensual', inicio: '2026-10-01', mora: 0, modo: 'abierto'});
  await sleep(50); w.verPrestamo('abierto1'); await sleep(60); pasos++;
  w.formLiquidar('abierto1'); await sleep(60); pasos++;
  w.formCobro('prestamo', 'abierto1'); await sleep(60); pasos++;
  w.reciboPrestamo('abierto1'); await sleep(60); pasos++;
  console.log(`${file.split('/').slice(-2).join('/')}: ${pasos} pasos recorridos, ${errores.length} error(es)`);
  errores.slice(0, 12).forEach(e => console.log('  -', e));
  process.exit(errores.length ? 1 : 0);
})().catch(e => { console.log('EXCEPCIÓN del recorrido:', e.stack || e); process.exit(2); });
