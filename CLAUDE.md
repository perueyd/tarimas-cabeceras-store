# E|D Espacios y Diseño — tienda de muebles a medida

Tienda peruana (Lima): tarimas, cabeceras y sofás cama hechos a medida.
**El dueño no es programador.** Escribe en español y necesita explicaciones sin
jerga. Los comentarios del código están en español y explican el PORQUÉ, no el
qué — mantén ese estilo.

- Producción: https://eydperu.vercel.app (el dominio antiguo
  `tarimas-cabeceras-store.vercel.app` solo redirige)
- Stack: React + Vite · funciones serverless de Vercel en `api/` · Redis Upstash
  · Tailwind · Culqi (pagos) · Groq (los dos asistentes de IA)

## Restricciones del plan gratuito — respétalas o el despliegue falla

**Máximo 12 funciones serverless.** Cada archivo suelto en `api/` cuenta como
una. El proyecto llegó a 24 y Vercel rechazó TODOS los despliegues durante días
sin que se notara. Ahora hay 10.

Para añadir un endpoint nuevo: NO crees `api/loquesea.js`. Ponlo en
`api/_rutas/` y regístralo en el mapa de `api/[ruta].js`. Los archivos que
empiezan por `_` no cuentan como función y la dirección pública no cambia.

**Vercel Blob:** la cuota de transferencia (10 GB) se agotó y el almacén quedó
bloqueado 30 días — las 33 fotos de productos devuelven 403. Las subidas nuevas
se comprimen en el navegador (`src/lib/comprimirImagen.js`) antes de viajar.

## Invariantes que no se pueden romper

**El precio lo decide el servidor.** El navegador nunca manda un importe que se
cobre. Todo cobro pasa por `priceOrder` + `calcularDescuentoAuto` +
`mejorTotal`, y `comprobarMontoEsperado` rechaza el cargo si el servidor fuera
a cobrar MÁS de lo que se mostró en pantalla. Si tocas precios, verifica que
`Checkout.jsx` y `api/_ofertas-auto.js` sigan dando el mismo número.

**Vencimientos: usa `vencida()` de `api/_ofertas-auto.js`.** Nunca
`new Date(fecha + 'T23:59:59')`: Vercel corre en UTC y Perú va 5 horas por
detrás, así que el último día de cada oferta el descuento moría a las 7 pm.

**Nunca `LSET` por índice.** Los pedidos entran con `LPUSH` (por delante), así
que entre el `LRANGE` y el `LSET` los índices se corren y se sobrescribe el
elemento equivocado — se perdían pedidos enteros. Usa `reemplazarEnLista()` de
`api/_store.js`, que identifica por valor.

**Antes de GUARDAR el catálogo: `getCatalog({ paraEditar: true })`.** Si Redis
falla, la versión normal devuelve el catálogo de fábrica (4 productos de
ejemplo) y la siguiente escritura lo guardaba encima de los 33 reales. Con esa
opción lanza un error legible y no escribe nada.

**Lo que sale al público va filtrado.** `/api/catalog` oculta `integrations`
(tokens) y `ownerEmail`. `/api/ofertas` oculta los cupones de tipo `codigo`.

## Desarrollo local

`npm run dev` levanta `dev-server.js`, que ejecuta las funciones de `api/` como
lo haría Vercel (Vite solo no las ejecuta). Sin credenciales de Upstash usa
`api/_localdb.js`, una base en archivo que imita Redis; se activa con
`LOCAL_DEV_DB=1`, que pone el propio dev-server. **En Vercel nunca se activa.**

Si añades un comando de Redis nuevo, añádelo también a `_localdb.js` o en local
fallará (ya pasó con `HGET` y `HINCRBY`).

Claves en `.env.local`: `GROQ_API_KEY`, `ORDERS_ADMIN_KEY`. La de Groq está
puesta en Vercel; en local puede estar sin configurar.

## Los dos asistentes

- **CHAT-ED** (`api/chatbot.js`) — público, para clientes. Conoce el catálogo
  real vía `api/_bot-conocimiento.js`; el dueño edita su personalidad desde el
  panel. Nunca inventa precios.
- **JARVIS** (`api/jarvis.js`) — solo admin, exige la clave. Ejecuta acciones de
  verdad con herramientas (`api/_jarvis-acciones.js`): abre secciones del panel,
  consulta ventas reales. Tiene modo voz por streaming. **Si el modelo pide una
  herramienta en modo voz, el servidor responde JSON en vez de texto** — el
  navegador la ejecuta y vuelve a preguntar.

Groq retira modelos cada cierto tiempo. Si los bots dejan de responder con
404/400, actualiza `MODELO` (o la variable `GROQ_MODEL`).

## Legal — Perú

Cumplir esto no es opcional:

- **Ley 29733** (datos personales): política que declara los proveedores y el
  flujo transfronterizo, derechos ARCO ejercitables (`api/_rutas/derechos-arco.js`
  + `src/components/FormularioARCO.jsx`), y consentimiento PREVIO de cookies
  (`src/lib/consentimiento.js` — los rastreadores no se cargan sin aceptar).
- **Ley 29571** (consumidor): Libro de Reclamaciones con folio y 30 días de
  plazo, precios con IGV incluido, RUC y razón social visibles.
- Los textos por defecto están en `src/data/textosLegales.js`. **Lo guardado en
  Redis manda sobre ellos**, por eso el panel tiene un botón para adoptarlos.

Nada que se muestre al cliente puede ser inventado: hubo testimonios de ejemplo
publicados como reales y tuvieron que quitarse (riesgo INDECOPI). Las opiniones
de la portada salen solo de reseñas reales.

## Panel de administración

`/pedidos`, protegido con `ORDERS_ADMIN_KEY`. Se carga aparte con `lazy()` para
que los clientes no descarguen las ~20 pestañas del panel.

Las pestañas reciben un helper `api(method, resource, body)` — **úsalo**. Trece
de ellas hacían `fetch` con `PUT` (que la API no acepta) y una clave de
`localStorage` que no existe: guardaban en silencio sin guardar nada.

## Comandos — empieza SIEMPRE por `npm run estado`

```
npm run estado          cómo está todo ahora: productos, funciones libres,
                        pruebas, si los bots responden, qué falta.
                        Léelo al empezar en vez de explorar archivos.
npm run verificar       pruebas + compilación (20 segundos)
npm test                solo las pruebas (1 segundo)
npm run revisar-tienda  entra a la web publicada y comprueba 15 cosas
npm run dev             tienda local en localhost:5173
```

Las pruebas viven en `pruebas/` y usan el probador que trae Node: **no añadas
librerías de pruebas**. Cada una corresponde a un fallo que ya ocurrió de
verdad; si añades una, explica en un comentario qué fallo evita.

`pruebas/estructura.test.js` vigila las reglas que no se pueden romper (el tope
de 12 funciones, que toda ruta esté registrada, que `_localdb.js` entienda los
comandos de Redis que usa el código). Si cambias esas reglas, cambia también la
prueba — no la borres.

GitHub Actions repite `npm test` y `npm run build` en cada subida
(`.github/workflows/verificar.yml`).

## Copias de seguridad del catálogo

Los productos se perdieron una vez de Redis y hubo que dictarlos de nuevo uno
por uno. Ahora, antes de la PRIMERA escritura de cada día, se guarda una foto
completa del catálogo (`api/_respaldos.js`), y se conservan las últimas 7.

**Para guardar el catálogo usa `getCatalogParaEditar()`**, no
`getCatalog({ paraEditar: true })`: la primera hace las dos cosas en el orden
correcto — lee protegido y respalda ANTES del cambio.

Si añades una lista nueva al catálogo, añádela también a `PARTES` en
`api/_respaldos.js` o las copias quedarán incompletas sin avisar (hay una
prueba que lo comprueba).

## Vencimientos: `src/lib/vencimiento.js`

`vencida()` vive ahí porque el servidor Y el navegador necesitan la misma
respuesta. Cuando no coincidían, quien compraba desde el extranjero veía un
precio en pantalla y el cobro se le rechazaba con "el precio cambió".

## Títulos y datos estructurados: `src/lib/meta.js`

La tienda es una sola página, así que el título lo pone `usarMeta()` en cada
pantalla. `datosDeProducto()` y `datosDelNegocio()` generan lo que Google lee
para mostrar precios en los resultados. **La valoración media solo se incluye
si hay reseñas reales** — inventarla es publicidad engañosa (Ley 29571).

## El editor del catálogo está partido

`src/pages/CatalogEditor.jsx` solo decide qué pestaña mostrar (176 líneas). El
contenido vive en `src/pages/editor/`: `comunes.jsx` (lo que usan todas),
`ProductosTab.jsx`, `BasicosTab.jsx`, `TextosTab.jsx`, `PortadaTab.jsx`.
Antes era un solo archivo de 3.360 líneas.

La navegación del panel usa `PestanasAgrupadas`: cuatro grupos en vez de 30
pestañas planas. **Lo urgente sube al botón del grupo** (en rojo), así que
agrupar no esconde un reclamo con plazo legal.

## Verificar antes de dar algo por hecho

`npm run build` no basta para lo que se ve. Usa el navegador de la vista previa
y comprueba el efecto real: que el precio cobrado coincida con el mostrado, que
el micrófono se cierre, que la foto no desborde en móvil. Varios fallos graves
de este proyecto compilaban perfectamente.
