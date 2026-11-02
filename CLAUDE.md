# Mi Negocio Al Día — guía para Claude

La dueña habla español y no es técnica: explícale todo en español, simple y corto.

## Cómo está armada la app
- Todo el código vive en `index.html` (raíz). **Esa es la fuente única.** `www/index.html` es una copia: después de editar, ejecutar `cp index.html www/index.html`.
- Datos en Supabase (proyecto "administración general"), tabla `registro` (`negocio_id`, `tipo`, `id`, `datos` jsonb). Clientes, préstamos, pagos, ventas, etc. son JSON ahí, así que **casi nunca hace falta migración SQL**: agregar un campo a un préstamo es solo código.
- Dinero siempre con `r2()`; fechas como texto `AAAA-MM-DD`.

## Préstamos
- Modo normal: cuotas fijas (`detalle()`).
- Modo abierto (`modo:'abierto'`, `detalleAbierto()`): paga solo el interés de cada período sobre el saldo actual; lo que sobre del interés abona a capital. `liquidar()` calcula el Pago total (interés del período en curso proporcional a los días, o exonerado). Cualquier pantalla, recibo o reporte nuevo que toque préstamos debe contemplar ambos modos (`esAbierto(p)` / `d.abierto`).

## REGLA DE LA DUEÑA (obligatoria)
**Antes de escribir o reparar cualquier cosa que lleve a una actualización de la app, pedir confirmación.** Explicar en 2-3 líneas qué se va a cambiar y esperar el "sí". Sin ese "sí" no se edita el código ni se sube nada a `main`. Leer, revisar y proponer sí se puede sin preguntar.

## Al terminar CUALQUIER cambio, siempre
1. Agregar una entrada arriba de la lista `NOVEDADES` en `index.html` (informe que ve la dueña una vez tras actualizar; fecha y frases cortas en español).
2. Verificar sintaxis del script (`node --check` sobre el contenido del `<script>`) y probar la lógica de cálculo con casos de ejemplo.
3. `cp index.html www/index.html`, commit y push.
4. Avisar si se publicó en `main` (se despliega solo: GitHub Pages y APK, unos 2 minutos). Si hay duda, subir primero a una rama y pedir confirmación.

## Publicación
- Push a `main` con cambios en `index.html`, `sw.js` o `www/` dispara solos "Publicar web" y "Android release". No hace falta ejecutar nada a mano.
- Mensajes de commit terminan con la línea Co-Authored-By indicada por la sesión.
