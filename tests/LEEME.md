# Pruebas de Mi Negocio Al Día

Revisan que las fórmulas, la sincronización y las pantallas sigan funcionando después de cambiar `index.html`.
**No forman parte de la app** y no cambian nada de lo que ve la dueña.

## Cómo correrlas
```
cd tests
npm install     # solo la primera vez
npm test
```
Debe terminar con `RESULTADO: todo bien`. Si alguna falla, no publicar hasta corregirla.

## Qué comprueban
- `calc_cases.js`: préstamos con cuotas, mora, préstamo abierto, pago total, ventas a crédito y datos dañados.
- `sync_cases.js`: cambios de otro equipo, más de 1000 registros y cambios hechos sin internet.
- `smoke.js`: abre la app completa y recorre pestañas, formularios, recibos, Excel y respaldo.

Las pruebas leen `../index.html`; no hace falta copiar nada. Tienen su propio `package.json` a propósito: así no se dispara el APK, que se reconstruye cuando cambia el de la raíz.
