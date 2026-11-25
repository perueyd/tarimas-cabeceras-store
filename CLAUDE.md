# E|D Espacios y Diseño — tienda de muebles a medida

Tienda peruana (Lima): tarimas, cabeceras y sofás cama hechos a medida.
**El dueño no es programador.** Escribe en español y necesita explicaciones sin
jerga. Los comentarios del código están en español y explican el PORQUÉ, no el
qué — mantén ese estilo.

- Producción: https://www.corporacionagamenon.com (dominio propio desde
  noviembre de 2026; sin «www» redirige aquí; la dirección vive en
  `src/data/sitio.js`). Las anteriores
  `corporacionagamenon.vercel.app`, `eydperu.vercel.app` y
  `tarimas-cabeceras-store.vercel.app` siguen abriendo la tienda, pero ya no se
  usan en enlaces ni en `robots.txt`.
- Stack: React + Vite · funciones serverless de Vercel en `api/` · Redis Upstash
  · Tailwind · Culqi (pagos) · Groq (los dos asistentes de IA)

## Restricciones del plan gratuito — respétalas o el despliegue falla

**Máximo 12 funciones serverless.** Cada archivo suelto en `api/` cuenta como
una. El proyecto llegó a 24 y Vercel rechazó TODOS los despliegues durante días
sin que se notara. Ahora hay 10.

Para añadir un endpoint nuevo: NO crees `api/loquesea.js`. Ponlo en
`api/_rutas/` y regístralo en el mapa de `api/[ruta].js`. Los archivos que
empiezan por `_` no cuentan como función y la dirección pública no cambia.

**Fotos de productos:** viven en `public/productos/` (se suben con
`node scripts/elegir-fotos.mjs`), no en Vercel Blob. La cuota de transferencia
de Blob (10 GB) se agotó en octubre de 2026 y el almacén quedó bloqueado; las
subidas desde el panel se comprimen en el navegador
(`src/lib/comprimirImagen.js`) antes de viajar. Comprobado el 12/11/2026: el
catálogo apunta a 176 fotos, todas en el propio sitio.

**Fichas de medidas** (`public/productos/medidas-*.webp`, 28 imágenes): son
dibujos ya hechos, no salen de ningún programa. En noviembre de 2026 se les
cambió la marca a mano (logo de las dos cumbres + «CORPORACIÓN AGAMENÓN» arriba
y `corporacionagamenon.com` abajo); antes decían «E|D ESPACIOS Y DISEÑO» y
`eydperu.vercel.app`. Los originales están en el historial de git (commit
`72d5546`). Si se rehacen, que lleven la marca nueva.

**Una foto que no existe da 404** (no la portada): `vercel.json` no reescribe
`/productos/` ni `/assets/`. Los archivos de `/assets/` (con huella en el
nombre) se guardan un año en el navegador y las fotos un día; si cambias una
foto y quieres que se vea ya, súbela con otro nombre.

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

## Boletas y facturas: la tienda NO emite

La tienda y el facturador electrónico (repositorio `facturador-sunat`) son
**independientes** por decisión del dueño (07/11/2026). La tienda no llama al
facturador ni guarda llaves suyas: el dueño emite cada boleta o factura desde
el panel del facturador. No vuelvas a conectarlos sin que el dueño lo pida.

- El checkout sigue pidiendo DNI o RUC (`src/lib/documento.js`) y la ficha del
  pedido los muestra con base, IGV y total, listos para copiar
  (`BloqueComprobante` en `src/pages/panel/PedidoCard.jsx`).
- Yape y Plin son métodos separados (la boleta debe decir con cuál se pagó).
  `src/lib/metodosPago.js` mantiene válida la configuración antigua `yapePlin`.
- Los pagos (métodos, números, QR) se editan SOLO en la pestaña Pagos.

**La constancia de pedido** (`src/components/Constancia.jsx`,
`src/lib/constancia.js`) es el documento PROPIO de la tienda: el dueño usa dos
papeles, esta constancia y la boleta o factura del facturador (decisión del
14/11/2026). No es un comprobante de pago y no puede parecerlo — entregar un
documento «no previsto como comprobante de pago» en lugar de la boleta es una
infracción (Código Tributario, art. 174 num. 1). Por eso:

- No se llama boleta, factura ni comprobante; no lleva serie ni correlativo
  (su número es el código del pedido); y pinta SIEMPRE la leyenda
  `LEYENDA_CONSTANCIA`. Hay pruebas que lo vigilan (`pruebas/constancia.test.js`).
- La pública (`/constancia?codigo=…`) sale del seguimiento por código, que
  **no devuelve datos personales**: la lista de campos es cerrada. La completa
  (nombre, DNI, dirección) solo se ve en el panel.
- El dueño anota en el pedido el número del comprobante que emitió en el
  facturador (`order.comprobante`, ej. `B001-00000123`): así se ve qué pedidos
  ya tienen su boleta. La tienda sigue sin llamar al facturador.
- Se imprime con `HojaImprimible` (una copia colgada de `<body>`).

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

`/panel`, protegido con `ORDERS_ADMIN_KEY`. Se carga aparte con `lazy()` para
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

## Errores en producción: `api/_alertas.js`

`avisarError(origen, mensaje, detalle)` guarda el error en Redis (los últimos
50) y, si existe `ALERTAS_URL` (p. ej. un tema de ntfy.sh), avisa al teléfono
— como mucho una vez cada 30 min por error. El panel los muestra en "Qué hacer
hoy" y en Mi tienda → Errores. Ya lo llaman: `api/[ruta].js`, los cobros
fallidos o sin pedido guardado, y el navegador (`src/lib/reportarError.js` +
`src/components/ErrorBoundary.jsx`, que evita la pantalla en blanco). Si
añades un camino donde se cobra o se pierde un pedido, avisa desde ahí.
**Nunca metas datos personales en el mensaje.**

**Piezas que se cargan a pedido: `lazyConRecarga()` (`src/lib/cargarPieza.js`),
nunca `lazy()` a secas.** Al publicar, las piezas cambian de nombre y las viejas
desaparecen; quien tenía la tienda abierta pedía una vieja y la página se caía
con «Importing a module script failed» (dos veces en noviembre de 2026). Con
la ayuda, la página se recarga sola una vez y trae la versión nueva. El chat y
«Ver en mi pared» van además dentro de `<ErrorBoundary silencioso>`: si fallan,
desaparecen sin tumbar la página. `pruebas/piezas.test.js` avisa si queda un
`import()` sin la ayuda.

## Órdenes de Culqi: PagoEfectivo, billeteras y Cuotéalo

Tarjeta y Yape cobran al momento (`api/create-charge.js`). PagoEfectivo
(banca móvil, agentes), billeteras con QR y Cuotéalo NO: el cliente recibe un
código (CIP) o un QR y paga después. Para eso (`api/_rutas/culqi-orden.js`):

1. `crear`: antes de abrir la ventana se crea la orden en Culqi
   (`confirm: false`), con el MISMO cálculo de precio que la tarjeta
   (`api/_cobro.js`). Todavía no hay pedido: si el cliente paga con tarjeta,
   la orden vence sola.
2. `registrar`: cuando el cliente generó su código, se guarda el pedido como
   «Pago por verificar», con su CIP. Nunca dos veces.
3. Aviso de Culqi (`api/_rutas/culqi-webhook.js`, evento
   `order.status.changed`, se configura en el CulqiPanel → Eventos →
   Webhooks): marca «Pagado» o, si venció, «Cancelado». **No se cree lo que
   dice el aviso**: el estado se consulta a Culqi con la llave privada
   (hay prueba en `pruebas/culqi-ordenes.test.js`).

Montos que acepta Culqi: billeteras con QR de S/ 6 a S/ 500, Cuotéalo desde
S/ 100 (`src/lib/mediosCulqi.js`). Las cuotas con tarjeta de crédito viajan al
cargo como `installments`.

## Cupones: reservar y devolver

El uso de un cupón se reserva ANTES de cobrar (`reservaDeCupon()` en
`api/_promo.js`). Todo camino que no termine en venta tiene que llamar a
`reserva.liberar()`: tarjeta rechazada, precio que no cuadra, oferta
automática que gana. Si no, el cupón se agota sin ventas
(`pruebas/cupones.test.js`).

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

## Reiniciar la tienda: `api/_rutas/reiniciar.js`

Botón al final del Resumen del panel (`src/pages/panel/ReiniciarDatos.jsx`):
deja en cero todo lo de clientes para empezar limpio — pedidos, carritos,
visitas, historial de códigos, usos de cupones, reseñas, suscriptores,
encuestas y registrados del live.

- **No borra: cambia de nombre.** Cada clave se aparta con `RENAME` a
  `reinicio:<fecha>:…`. Restaurar es devolverle el nombre. Se guardan las tres
  últimas copias; las que sobran se borran de verdad (son datos personales).
- **Lo que se reinicia está en una lista cerrada (`SE_REINICIA`)**. Nunca el
  catálogo, los cupones (solo su contador de usos), el Libro de Reclamaciones
  ni las solicitudes ARCO. Si añades una clave nueva de clientes, añádela ahí;
  si añades un patrón, la prueba comprueba que no alcance nada protegido.
- **El nombre de cada copia tiene que ser único**: `RENAME` pisa el destino sin
  avisar. Dos copias en el mismo instante se pisaban (lo cazó una prueba).
- Restaurar aparta primero lo que haya ahora en otra copia: nada se pierde.
- Exige la clave, la palabra REINICIAR y, en el panel, la clave otra vez.

## Servicios y portafolio: `src/lib/servicios.js`

La página `/servicios` muestra planes de servicio y proyectos realizados. Son
dos listas más del catálogo (`services` y `projects`, recursos `service` y
`project` de `/api/catalog`) y se editan en Editar página → Servicios /
Portafolio. Los textos de la página viven en `storeConfig.servicios`.

**Nacen vacías y la sección está oculta** hasta que el dueño publique algo:
el enlace del menú, la franja de la portada y el mapa del sitio dependen de
`hayServicios()`. No añadas planes ni proyectos de ejemplo (ver «Legal»).

**Un plan de precio fijo se cobra con un producto oculto** (`esServicio: true`,
`oculto: true`, id `servicio-<plan>`, tamaño `servicio`) que el servidor crea,
actualiza y borra solo al guardar el plan (`sincronizarProductos`). Así el pago
pasa por el carrito y el cobro de siempre y no hay un segundo camino de cobro.
Tres consecuencias:

- El precio que enseña la tarjeta sale de ese PRODUCTO (`cobroDePlan`), no del
  número guardado en el plan: es lo que el servidor cobra.
- `sincronizarProductos` escribe en la lista de productos. Solo puede tocar los
  marcados `esServicio`; hay pruebas que lo vigilan (`pruebas/servicios.test.js`).
- Esos productos no se enseñan en la pestaña Productos ni tienen ficha
  (`/producto/servicio-…` lleva a `/servicios`).

### Editar sobre la página: `src/pages/servicios/edicion.jsx`

El dueño edita `/servicios` viendo lo mismo que el cliente. Si la pestaña tiene
abierta la sesión del panel (`leerClaveGuardada()`), `useEdicionDeServicios()`
devuelve el modo edición; para un cliente devuelve `null` y la página se pinta
como siempre. Se entra desde el panel con «Editar sobre la página» (misma
pestaña, a propósito: la sesión vive en la memoria de la pestaña).

- `<Texto>` es el mismo texto para los dos: quieto para el cliente, escribible
  para el dueño (un campo transparente que hereda letra y tamaño; el estilo
  `.texto-editable` está en `src/index.css`). Guarda al salir del campo.
- Lo que no cabe sobre una tarjeta (fotos, área, forma de contratar,
  profesional) abre los MISMOS formularios del panel en una ventana
  (`servicios/EdicionModal.jsx`).
- **No importes nada de `src/pages/editor/` desde `Servicios.jsx` ni desde
  `edicion.jsx`**: el cliente descargaría el editor entero. Los formularios van
  por `lazy()`; hay una prueba que lo vigila.
- Editando se ve todo, también lo oculto (atenuado). «Ver como cliente» apaga
  el modo sin salir de la página.
- Hoy cubre la página de servicios. La portada, la tienda y el live se siguen
  editando desde el panel.

### Aliados: profesionales externos

Arquitectura e ingeniería NO están en el objeto social de la empresa y son
profesiones reguladas (Leyes 28966 y 28858). El dueño las ofrece a través de
profesionales de fuera: la lista `partners` (recurso `partner`, pestaña
Aliados). Un plan o un proyecto puede llevar `aliado: <id>`.

- **Lo privado del aliado no se publica**: teléfono, comisión y notas los quita
  `aliadoPublico()` en `/api/catalog`; y si el dueño eligió no nombrarlo
  (`mostrar: false`), tampoco sale su nombre. Hay prueba (`pruebas/aliados.test.js`).
- Cada aliado tiene su enlace `/servicios?de=<id>`: enseña lo suyo y recuerda
  la visita (`sessionStorage`). La referencia viaja en los mensajes de WhatsApp
  («(Ref.: id)») y en el pedido (`order.referido`).
- **`referido` se comprueba en el servidor** (`referidoValido`): solo se anota
  si es un aliado que existe y está activo. No cambia el importe.
- El panel avisa (no bloquea) cuando un plan de arquitectura o ingeniería no
  tiene asignado un profesional con colegiatura, y cuando se oculta el nombre.

## El live: `api/_rutas/live.js`

El dueño hace transmisiones en vivo y manda al público a `/live`: quien entra
deja nombre y WhatsApp y ve al instante el código de descuento de ese live. Se
enciende y se apaga en el panel → Promociones → Live (`src/pages/LiveTab.jsx`),
donde también está la lista de registrados.

- **El código solo sale DESPUÉS de registrarse.** La consulta pública
  (`GET /api/live` sin clave) se arma campo por campo y nunca lo incluye.
- El código es un cupón normal de «Códigos de descuento». No se puede encender
  el live con uno vencido, desactivado o agotado, y si se agota a mitad de la
  transmisión deja de entregarse: no se promete un descuento que el pago
  rechazaría.
- **Son datos personales (Ley 29733):** no se guarda nada sin la casilla de
  consentimiento; el permiso para avisar de OTRAS ofertas es una segunda
  casilla aparte (`promos`); se borran uno a uno desde el panel y solos al año.
  La política por defecto (`textosLegales.js`) ya declara este registro; el
  panel avisa si la política guardada es anterior.
- El tope de registros por visitante es alto (60 por hora) a propósito: en
  Perú muchos celulares comparten dirección de internet y un tope bajo dejaría
  fuera a media audiencia.
- El código viaja al pago por `sessionStorage` (`src/lib/live.js`): el campo
  del cupón aparece ya relleno, aunque esté oculto para el resto.
- **El menú enseña el live** (pedido del dueño, 18/11/2026): «🔴 En vivo»
  mientras está encendido, «Live» si hay texto en `proximo`. El estado viaja
  en `/api/catalog` como `live: { enVivo, anunciado }`, leído en el MISMO
  `MGET` del catálogo (clave `CLAVE_LIVE` de `api/_catalog.js`) para no gastar
  otro comando de Upstash por visita. Lo arma `liveParaElMenu()` con dos sí/no:
  **nunca añadas ahí el código** (hay prueba en `pruebas/live.test.js`).

## Plazos de entrega: `src/lib/entrega.js`

**Una regla por tipo de producto** (el dueño, 19/11/2026), editable en el
panel → Entrega y guardada en `storeConfig.reglasEntrega`. De fábrica:
cabeceras hasta las 8 a. m. → hoy desde las 5 p. m., con posible demora de
1 a 3 días; tarimas hasta las 9 a. m. → hoy SEGÚN DISPONIBILIDAD (no se
promete), desde las 11 a. m.; lo demás, la regla general (8 a. m. / 5 p. m.).

- Pago, ficha, carrito, armador de dormitorio y CHAT-ED usan las MISMAS
  funciones (`reglaDelPedido`, `textoDePlazo`, `plazosPorCategoria`). No
  escribas el plazo a mano en ningún texto: antes había un `leadTime` libre y
  una pregunta frecuente que se contradecían con el pago, y CHAT-ED le
  prometía a una tarima la regla de las cabeceras.
- Con varios tipos en el carrito manda la regla más exigente.
- CHAT-ED recibe los plazos y las formas de pago activas como sección
  «oficial», que manda sobre las preguntas frecuentes (`api/_bot-conocimiento.js`).
- **Correo de ventas corporativas** (`src/lib/contacto.js`, pedido del dueño
  22/11/2026): `contacto.correoCorporativo`, de fábrica
  corporacionagamenon@gmail.com, editable en Branding → Contacto. Sale en el
  pie de página, en el pago al marcar «Necesito factura», en CHAT-ED y en los
  datos de Google. `contacto` se mezcla por dentro en `getCatalog`: el guardado
  en Redis es antiguo y, mezclado de golpe, tapaba los datos nuevos de fábrica.
- **Observaciones del cliente** (`src/lib/observaciones.js`): texto libre del
  pago, limpio y con tope en el servidor; se ve en el panel y NO en el
  seguimiento público (lista cerrada de campos).

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

`npm run revisar-tienda` pide TODAS las fotos del catálogo (también las de las
opciones, como las patas) y exige que sean imágenes de verdad: en noviembre de
2026 decía "15 bien" con tres fotos rotas a la vista del cliente.

`npm run build` no basta para lo que se ve. Usa el navegador de la vista previa
y comprueba el efecto real: que el precio cobrado coincida con el mostrado, que
el micrófono se cierre, que la foto no desborde en móvil. Varios fallos graves
de este proyecto compilaban perfectamente.
