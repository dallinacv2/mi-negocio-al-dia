const sleep = ms => new Promise(r => setTimeout(r, ms));
const _ls = {}; const localStorage = {getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; }};
let _tick = null; const setIntervalStub = f => { _tick = f; return 1; };
const document = {visibilityState: 'visible', _vc: null, addEventListener(t, f) { if (t === 'visibilitychange') this._vc = f; }};
const navigator = {onLine: true};
const location = {origin: 'http://x', pathname: '/'};
const ES_APP = false; const avisos = []; const aviso = m => avisos.push(m);
let remoto = [], caido = false, subidas = [];
const fetch = async (url, o = {}) => {
  const met = o.method || 'GET';
  const res = b => ({ok: true, status: 200, text: async () => JSON.stringify(b)});
  if (caido && /\/rest\/v1\/registro\?on_conflict/.test(url)) throw new Error('sin red');
  if (/\/rest\/v1\/negocio\?/.test(url)) return res([{codigo: 'ABC', nombre: 'Neg', creado_por: 'u1'}]);
  if (/\/rest\/v1\/registro\?negocio_id/.test(url) && met === 'GET') {   // imita PostgREST: máximo 1000 filas por consulta
    const q = new URL(url, 'http://x').searchParams, lim = Math.min(+q.get('limit') || 1000, 1000), off = +q.get('offset') || 0;
    const orden = [...remoto].sort((a, b) => (a.tipo + a.id) < (b.tipo + b.id) ? -1 : 1);
    return res(orden.slice(off, off + lim));
  }
  if (/\/rest\/v1\/registro\?on_conflict/.test(url)) { const b = JSON.parse(o.body)[0]; subidas.push(b.tipo + '::' + b.id); return res([{updated_at: new Date().toISOString()}]); }
  return res(null);
};
/*COLS*/
/*NUBE*/
const nuevaDB = async () => { COLS.forEach(c => S[c] = []); const db = await crearSupabaseDB({url: 'https://x.supabase.co', key: 'k'}, {access: 't', uid: 'u1'}, {id: 'n1'}); COLS.forEach(c => db.collection(c).onSnapshot(snap => { S[c] = snap.docs.map(d => d.data()); })); await sleep(40); return db; };
(async () => {
  let fallos = 0, bien = 0; const ok = (n, c, x) => { if (!c) { fallos++; console.log('  FALLA:', n, x !== undefined ? JSON.stringify(x) : ''); } else bien++; };
  const row = (id, nombre, t) => ({id, tipo: 'clientes', datos: {id, nombre}, updated_at: t});
  console.log('== A. Sincronización entre equipos');
  remoto = [row('c1', 'Ana', '2026-11-01T10:00:00Z')];
  let db = await nuevaDB();
  ok('carga inicial trae el cliente de la nube', S.clientes.length === 1 && S.clientes[0].nombre === 'Ana');
  remoto = [row('c1', 'Ana MODIFICADA', '2026-11-02T10:00:00Z'), row('c2', 'Beto NUEVO', '2026-11-02T10:05:00Z')];
  await db.repicar(false); await sleep(30);
  ok('trae el cliente NUEVO creado en otro equipo', S.clientes.some(c => c.id === 'c2'), S.clientes.map(c => c.nombre));
  ok('trae la EDICIÓN hecha en otro equipo', (S.clientes.find(c => c.id === 'c1') || {}).nombre === 'Ana MODIFICADA', S.clientes.map(c => c.nombre));
  remoto = [row('c2', 'Beto NUEVO', '2026-11-02T10:05:00Z')];
  await db.repicar(false); await sleep(30);
  ok('un borrado hecho en otro equipo se aplica', !S.clientes.some(c => c.id === 'c1'), S.clientes.map(c => c.nombre));
  db.cerrar();

  console.log('== B. Más de 1000 registros en la nube');
  remoto = Array.from({length: 2500}, (_, i) => row('k' + String(i).padStart(5, '0'), 'N' + i, '2026-11-01T10:00:00Z'));
  db = await nuevaDB();
  ok('la carga inicial trae los 2500 (no solo 1000)', S.clientes.length === 2500, S.clientes.length);
  await db.repicar(false); await sleep(30);
  ok('la sincronización periódica NO borra registros de pantalla', S.clientes.length === 2500, S.clientes.length);
  db.cerrar();

  console.log('== C. Cambios hechos sin internet');
  remoto = []; localStorage.removeItem('mnad-nube-pend'); subidas = [];
  db = await nuevaDB(); caido = true;
  let fallo = false; try { await db.collection('clientes').doc('p1').set({id: 'p1', nombre: 'Pendiente'}); } catch (e) { fallo = true; }
  ok('sin red el guardado falla y queda en la cola', fallo && JSON.parse(localStorage.getItem('mnad-nube-pend') || '[]').length === 1);
  caido = false; subidas = [];
  if (_tick) _tick(); await sleep(120);
  ok('al volver la red la cola se sube SOLA (sin reiniciar la app)', subidas.includes('clientes::p1'), subidas);
  ok('la cola queda vacía', JSON.parse(localStorage.getItem('mnad-nube-pend') || '[]').length === 0);
  // una edición pendiente no debe ser pisada por la versión vieja de la nube
  S.clientes = [{id: 'p2', nombre: 'LOCAL NUEVO'}]; caido = true;
  try { await db.collection('clientes').doc('p2').set(S.clientes[0]); } catch (e) {}
  remoto = [row('p2', 'NUBE VIEJA', '2099-01-01T00:00:00Z')];
  await db.repicar(false); await sleep(30);
  ok('un cambio pendiente de subir no se pisa con la versión de la nube', (S.clientes.find(c => c.id === 'p2') || {}).nombre === 'LOCAL NUEVO', S.clientes);
  db.cerrar();
  console.log(`SINCRONIZACIÓN: ${bien} correctas, ${fallos} con fallo`); process.exitCode = fallos ? 1 : 0;
})();
