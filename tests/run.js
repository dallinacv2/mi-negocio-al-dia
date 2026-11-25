/* Corre todas las pruebas sobre ../index.html. Uso:  cd tests && npm install && npm test  */
const fs = require('fs'), os = require('os'), path = require('path'), {spawnSync} = require('child_process');
const raiz = path.join(__dirname, '..'), indexHtml = path.join(raiz, 'index.html');
const html = fs.readFileSync(indexHtml, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const js = scripts.reduce((a, b) => (b.length > a.length ? b : a), '').split('\n');
/* Corta el script principal desde la línea que cumple `ini` hasta (sin incluir) la que cumple `fin` */
const corte = (ini, fin) => {
  const a = js.findIndex(l => ini.test(l)); if (a < 0) throw new Error('No encontré el inicio ' + ini);
  const b = js.findIndex((l, i) => i > a && fin.test(l)); if (b < 0) throw new Error('No encontré el final ' + fin);
  return js.slice(a, b).join('\n');
};
const cols = corte(/^const DATA_COLS/, /^const UI =/);
const core = corte(/^const \$ = s =>/, /^\/\* ----- almacenamiento/);
const loans = corte(/^\/\* ----- préstamos ----- \*\//, /^\/\* =====+ Pantallas: navegación/);
const nube = corte(/^const NBK = /, /^\/\* Conecta a la nube/);
const leer = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mnad-pruebas-'));
const calc = path.join(tmp, 'calculos.js'), sync = path.join(tmp, 'sync.js');
fs.writeFileSync(calc, 'const document={querySelector(){return null}};\n' + cols + '\n' + core + '\n' + loans + '\n' + leer('calc_cases.js'));
fs.writeFileSync(sync, leer('sync_cases.js').replace('/*COLS*/', () => cols).replace('/*NUBE*/', () => nube.replace(/setInterval\(/g, 'setIntervalStub(')));
fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
const pasos = [['Fórmulas (préstamos, mora, pago total, ventas)', [calc]], ['Sincronización con la nube', [sync]], ['Recorrido de la app completa', [path.join(__dirname, 'smoke.js'), indexHtml]], ['Editar préstamos, ventas, gastos y cobros', [path.join(__dirname, 'editar.js'), indexHtml]]];
let mal = 0;
for (const [nombre, args] of pasos) {
  console.log('\n### ' + nombre);
  const r = spawnSync(process.execPath, args, {stdio: 'inherit', cwd: __dirname, timeout: 180000});
  if (r.status !== 0) { mal++; console.log('>>> FALLÓ: ' + nombre); }
}
fs.rmSync(tmp, {recursive: true, force: true});
console.log(mal ? `\nRESULTADO: ${mal} grupo(s) de pruebas con fallos` : '\nRESULTADO: todo bien');
process.exit(mal ? 1 : 0);
