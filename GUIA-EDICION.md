# Guía para editar tu tienda (sin saber programar)

Todo lo editable vive en **un solo archivo**: `src/data/catalog.js`.
Ábrelo con cualquier editor (recomendado: Visual Studio Code) y sigue estos pasos.

---

## 0. Datos de la tienda (WhatsApp, tiempos de entrega)

Al inicio de `catalog.js` está `storeConfig`:

```js
export const storeConfig = {
  whatsapp: '51987654321',        // tu número con 51 adelante, sin espacios ni +
  leadTime: '3 a 4 días hábiles', // texto que ve el cliente
  deliveryMinDays: 4,             // días mínimos para elegir fecha de entrega
  deliverySlots: [ ... ],         // rangos de horario que ofrece el checkout
};
```

- Pon tu número en `whatsapp` y aparecerá un **botón flotante de WhatsApp** en toda la web.
  El mismo número se usa para el botón **"Cotizar envío por WhatsApp"** de los pedidos a provincia.
- Si mejoras tus tiempos de producción, cambia `leadTime` y `deliveryMinDays`.

**Zonas de entrega:** el checkout tiene dos flujos automáticos:
- **Lima Metropolitana**: dirección + mapa con pin (el cliente puede usar su ubicación GPS)
  + fecha y rango de horario. El link de Google Maps del pin llega junto con el pago.
- **Provincia**: sin pago directo — el cliente arma su cotización de envío por WhatsApp
  (el envío corre por su cuenta) y su carrito queda guardado para completar después.

**Métodos de pago (editable sin tocar código):** en el panel `/pedidos` →
Editar página → Datos de la tienda → **"Métodos de pago en el checkout"**,
apaga el checkbox del que no uses:
- **Tarjeta o Yape (Culqi)** — cobro automático.
- **Yape / Plin directo** — el cliente te envía y manda su comprobante por WhatsApp.
- **Transferencia bancaria** — igual, pero a una cuenta bancaria.

El cliente solo ve en el checkout los que dejes activos. No puedes apagar los
tres — el panel te avisa si lo intentas. Si nunca tocas esta opción, los tres
quedan activos como siempre (no rompe nada en tiendas que ya estaban funcionando).

---

## 1. Agregar una categoría nueva

En la lista `categories`, cambia `active: false` a `active: true` cuando tengas
productos listos, o agrega una línea nueva:

```js
{ id: 'melamina', label: 'Muebles de Melamina', active: true },
```

- `id`: en minúsculas, sin espacios ni tildes (se usa en la URL).
- `label`: el nombre que ve el cliente.
- Al activarla, la pestaña aparece sola en la tienda y en la portada.

## 2. Subir tus fotos

Forma recomendada (sin tocar código): en el panel `/pedidos` → **Editar página** →
**Productos**, al crear o editar un producto usa el botón **"📷 Subir"** junto al
campo de imagen. Elige el archivo y la URL se completa sola — no necesitas copiar
archivos a ninguna carpeta ni editar `catalog.js`.

**Formato de archivo:**
- Aceptados: **JPG, PNG o WEBP**.
- Peso máximo: **4 MB** por foto.
- Ancho recomendado: **1200 px** es suficiente para verse nítido sin pesar de más.

**¿Foto gris o foto a color?**
- Si subes la foto del mueble en **tonos grises/neutros** → marca
  "La foto está en tonos grises..." (`tintable: true`). La web la teñirá
  automáticamente con cada color que elija el cliente.
- Si subes la foto **ya con su acabado real** (ej. melamina roble) → desmarca esa
  opción (`tintable: false`). La foto se muestra tal cual. (En este caso los
  círculos de color son solo referenciales; si quieres una foto distinta por
  acabado, usa "Foto propia por color" dentro del mismo producto.)

**Importante si tu foto es para teñir (`tintable: true`): debe ser PNG con fondo
transparente.** El teñido usa la transparencia de tu propia foto para saber
"hasta dónde" pintar. Si subes un JPG con fondo (pared, piso, etc.), el color se
aplicará sobre TODO el rectángulo, incluido el fondo — se va a ver mal. La solución:
1. Recorta el mueble dejando el fondo transparente (hay editores gratis online tipo
   "remove background" — busca "quitar fondo de imagen gratis").
2. Guarda el archivo como **PNG** (no JPG — el JPG no admite transparencia).
3. Súbelo con el botón "📷 Subir" del panel.

Con el fondo transparente, el color solo pinta el mueble; el resto de la tarjeta queda
con tu fondo neutro de la web, limpio.

*Método alternativo (avanzado, editando código directo):* copiar el archivo a
`public/images/` y referenciarlo como `baseImage: '/images/nombre.jpg'` en
`src/data/catalog.js`. Solo tiene sentido si prefieres editar el catálogo por
código en vez del panel — para el uso normal, usa el botón "📷 Subir".

**Foto propia por tamaño (opcional):** un mueble se ve distinto según el
tamaño (una cabecera King es visiblemente más ancha que una de 1.5 plaza).
Si quieres una foto específica por tamaño, en el panel → editar el producto
→ sección **"Foto propia por tamaño"** aparece un campo por cada tamaño que
tenga precio, con su propio botón "📷 Subir".

- Puedes subirlas de a poco — no hace falta tenerlas todas de una vez.
- El tamaño que no tenga foto propia usa la imagen base del producto (la de
  arriba). Si tampoco hay imagen base, se muestra "Foto próximamente" en
  vez de un ícono de foto rota — así puedes publicar el producto antes de
  tener todas las fotos listas, sin que se vea roto.
- Funciona igual que "Foto propia por color": si un color también tiene su
  propia foto, esa manda primero; si no, se usa la foto del tamaño; si
  tampoco hay, la imagen base.

**Colores por tamaño (opcional):** a veces un tamaño viene en menos colores
que el resto (ej. King solo en 2 de tus 5 colores). En el panel → editar el
producto → sección **"Colores por tamaño"**, marca "personalizar colores"
en el tamaño que quieras limitar y desmarca los colores que no apliquen ahí.
El tamaño que no personalices sigue usando la lista general de "Colores
disponibles". El cliente ve automáticamente solo los colores que correspondan
al tamaño que eligió — si tenía seleccionado un color que ya no aplica al
cambiar de tamaño, se cambia solo al primero disponible.

**Opciones del producto (opcional):** para elegir cosas además del tamaño y el
color — «Brazos: con / sin», «Tipo de patas», «Tipo de botón» de una cabecera
capitoneada, etc. En el panel → editar el producto → sección **"Opciones del
producto"**:

1. Toca **"+ Agregar grupo de opciones"** y ponle nombre al grupo (ej. `Brazos`).
2. Dentro del grupo, toca **"+ Agregar opción"** por cada alternativa
   (ej. `Sin brazos` y `Con brazos`).
3. Si una opción cuesta más, escribe el **recargo** en el campo `+S/`
   (ej. 80 para "Con brazos"). Déjalo en 0 si no cambia el precio.

Cómo se ve para el cliente: aparecen como botones debajo del color, con el
recargo visible (ej. "+S/ 80.00"), y el precio de arriba se actualiza al
instante. En el carrito cada combinación es una línea aparte — la misma
cabecera con brazos y sin brazos no se suman como si fueran el mismo producto.
Las opciones elegidas aparecen en el carrito, en el mensaje de WhatsApp y en el
detalle del pedido en tu panel.

**Truco para "más barato sin X":** pon el precio del tamaño como el precio SIN
el extra, y cobra el recargo en la opción que lo lleva. Los recargos negativos
se ignoran a propósito (evita que un error de tipeo deje un precio en cero).

**Seguridad:** igual que los precios, los recargos se vuelven a calcular en el
servidor desde tu catálogo al momento de pagar — si alguien manipula la página
para pedir "con brazos" sin pagar el extra, igual se le cobra el precio real.

## 3. Agregar un producto

Copia una de las **plantillas** que están al final de la lista `products`
(entre `/*` y `*/`), pégala arriba de ellas, quita los `/*` `*/` y edita:

```js
{
  id: 'ropero-melamina-6-puertas',      // único, sin espacios
  category: 'melamina',                  // debe existir en categories
  name: 'Ropero de Melamina 6 Puertas',
  baseImage: '/images/ropero-6-puertas.jpg',
  tintable: false,
  shortDescription: 'Texto corto que aparece en la tarjeta.',
  specs: {
    Material: 'Melamina 18 mm',
    Medidas: '180 x 55 x 200 cm',
    Garantía: '12 meses',
  },
  sizePricing: { unico: 899 },           // precio en soles
  availableColors: ['roble', 'nogal', 'blanco'],
},
```

**Precios por tamaño:** para camas usa las plazas; para muebles sueltos usa `unico`:

```js
sizePricing: { '1.5plaza': 349, '2plazas': 399, queen: 449, king: 549 }  // camas
sizePricing: { unico: 899 }                                              // otros muebles
```

## 4. Agregar un color o acabado

En la lista `colors` agrega una línea con el código de color (hex).
Puedes sacar el hex de cualquier selector de color en Google ("color picker"):

```js
{ id: 'verde-oliva', label: 'Verde Oliva', hex: '#6b7d5a' },
```

## 5. Cambiar precios

Desde el panel `/pedidos` → **Editar página** → **Productos** (recomendado, no
necesitas tocar código): edita **Precio regular** y, si quieres, **Precio de
oferta** por cada tamaño — ver la sección
["Descuento directo por producto"](#descuento-directo-por-producto-precio-regular--precio-de-oferta)
más abajo.

También puedes editar los números directamente en `sizePricing` del producto
en el archivo de catálogo, si prefieres tocar el código. Están en soles (S/).

## 6. Publicar los cambios

Cada vez que edites y guardes:

```bash
git add -A
git commit -m "Actualizo catálogo"
git push
```

Vercel detecta el cambio y publica la web actualizada sola en ~1 minuto.

---

## Errores comunes

| Problema | Causa probable |
|---|---|
| La página sale en blanco | Falta una coma o comilla en catalog.js — revisa la línea que editaste |
| La foto no aparece | El nombre del archivo no coincide exacto (mayúsculas incluidas) o no está en public/images/ |
| El producto no aparece | Su `category` no existe o la categoría tiene `active: false` |
| El tamaño no aparece | Ese tamaño no tiene precio en `sizePricing` |
| Al crear un producto desde el panel, el botón "Guardar" no deja avanzar | El panel exige al menos un precio por tamaño y al menos un color marcado antes de guardar — un producto sin ninguno de los dos rompía la tienda (página en blanco). Completa "Precios por tamaño" y "Colores disponibles" antes de guardar. |

---

## Registro de pedidos en Google Sheets + correo automático al cliente

Cada pedido puede guardarse automáticamente en una hoja de Google tuya, Y
enviarle un correo de confirmación (y de actualización de estado) al cliente
— usando tu propia cuenta de Gmail, gratis, sin ningún servicio de pago.

1. Entra a https://sheets.new y crea una hoja llamada "Pedidos ED".
2. En la primera fila escribe estos encabezados:
   `Fecha | Código | Estado | Método | Monto | Nombre | Teléfono | Email | Zona | Dirección | Ubicación | Entrega | Productos`
3. Menú **Extensiones → Apps Script**. Borra lo que haya y pega esto:

```js
function doPost(e) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var o = JSON.parse(e.postData.contents);
  var items = (o.items || []).map(function(i){
    return i.productName + ' x' + i.qty + ' (' + (i.sizeId || '') + ', ' + (i.colorId || '') + ')';
  }).join(' | ');

  if (o.evento === 'actualizado') {
    // Busca la fila por código y actualiza Estado (col C) y Método (col D).
    var data = hoja.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (data[r][1] === o.code) {
        hoja.getRange(r + 1, 3).setValue(o.estado);
        hoja.getRange(r + 1, 4).setValue(o.metodo || data[r][3]);
        break;
      }
    }
  } else {
    hoja.appendRow([o.fecha, o.code, o.estado, o.metodo, o.monto, o.nombre,
      o.telefono, o.email, o.zona, o.direccion, o.ubicacion, o.entrega, items]);
  }

  if (o.email) enviarCorreo(o, items);
  return ContentService.createTextOutput('ok');
}

function enviarCorreo(o, items) {
  var monto = 'S/ ' + Number(o.monto || 0).toFixed(2);
  var link = 'https://tarimas-cabeceras-store.vercel.app/seguimiento?codigo=' + encodeURIComponent(o.code);
  var asunto, cuerpo;

  if (o.evento === 'actualizado') {
    asunto = 'Tu pedido ' + o.code + ' cambió de estado — E|D Espacios y Diseño';
    cuerpo = 'Hola ' + o.nombre + ',\n\nTu pedido ' + o.code + ' ahora está: ' + o.estado + '.\n\n' +
      'Rastrea tu pedido aquí: ' + link + '\n\nGracias por tu compra.\nE|D Espacios y Diseño';
  } else {
    asunto = 'Confirmación de tu pedido ' + o.code + ' — E|D Espacios y Diseño';
    cuerpo = 'Hola ' + o.nombre + ',\n\nRecibimos tu pedido ' + o.code + ' por ' + monto + '.\n' +
      'Estado actual: ' + o.estado + '\nEntrega: ' + (o.entrega || 'por confirmar') + '\n\n' +
      (items ? 'Productos:\n' + items + '\n\n' : '') +
      'Rastrea tu pedido aquí: ' + link + '\n\nGracias por tu compra.\nE|D Espacios y Diseño';
  }
  MailApp.sendEmail(o.email, asunto, cuerpo);
}
```

4. Botón **Implementar → Nueva implementación → Aplicación web**:
   - "Ejecutar como": **Tú** (tu correo)
   - "Quién tiene acceso": **Cualquier persona**
   - Autoriza los permisos cuando Google te los pida (esta vez pedirá acceso a
     la hoja de cálculo Y a enviar correo en tu nombre — es normal, ambos los
     usa el mismo script).
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. En Vercel → Settings → Environment Variables agrega
   `SHEETS_WEBHOOK_URL` = esa URL, y haz **Redeploy**.

Desde ese momento: cada pedido nuevo agrega una fila y le manda un correo de
confirmación al cliente (si dejó su email); y cada vez que tú cambias el
estado en tu panel `/pedidos`, se actualiza esa fila en la hoja Y se le
envía un correo automático avisando el nuevo estado. Los correos salen desde
tu propia cuenta de Gmail (gratis, hasta ~100 correos/día).

**Si "Autorizar acceso" no abre ninguna ventana** (síntoma: haces clic y no
pasa nada) — casi siempre es el bloqueador de ventanas emergentes de Chrome:
1. Mira el ícono de "ventana bloqueada" en la barra de direcciones (a la
   derecha, junto a la estrella) → clic → "Permitir siempre emergentes de
   script.google.com" → Listo.
2. Vuelve a intentar "Autorizar acceso".

**Alternativa que casi siempre funciona** (evita el problema de las ventanas
emergentes): en el editor de Apps Script, en la lista de funciones junto al
botón "Ejecutar" (arriba), elige `enviarCorreo` en vez de `doPost`, y presiona
**Ejecutar**. Aparecerá "Se requiere autorización" **dentro de la misma
pestaña** → "Revisar permisos" → tu cuenta → "Configuración avanzada" (texto
pequeño abajo a la izquierda) → "Ir a Proyecto sin título (no seguro)" →
**Permitir**. Una vez autorizado así, el botón "Implementar" ya no debería
pedir autorización de nuevo.

---

## Panel del negocio (/pedidos)

- Entra a `tudominio.vercel.app/pedidos` con la clave que definiste en la
  variable `ORDERS_ADMIN_KEY` de Vercel.
- Pestaña **Resumen**: gráfica de ventas confirmadas por día (14 días) y
  gráfica de ventas por producto.
- Pestaña **Pedidos**: filtros (Todos / Por verificar / Pagados / Entregados /
  Cancelados). En cada pedido puedes cambiar libremente el **Estado**
  (incluye "Cancelado") y el **Método de pago** con los selectores, escribir
  al cliente por WhatsApp, agendar la entrega en tu Google Calendar, y
  **eliminar el pedido** con el botón rojo (esto no borra la fila ya escrita
  en tu hoja de Google — es tu historial permanente).
- Pestaña **Reseñas**: editar o eliminar cualquier reseña.
- Pestaña **📋 Reclamos**: ver y responder los reclamos/quejas del Libro de
  Reclamaciones (ver sección propia más abajo). Muestra cuántos están
  pendientes en el número junto al nombre de la pestaña.
- Pestaña **📧 Suscriptores**: los correos que se suscribieron a tu newsletter
  desde el pie de página. Puedes descargarlos en CSV para tu herramienta de
  correos. No se guardan duplicados.
- Pestaña **📊 Encuestas**: las respuestas de la encuesta post-compra que
  dejaron tus clientes (opcional para ellos).
- Cambiar el estado de un pedido también actualiza la fila en tu hoja de
  Google y le envía un correo automático al cliente (si configuraste
  `SHEETS_WEBHOOK_URL`, ver sección anterior).
- Para que el panel y las reseñas funcionen necesitas la base de datos gratuita:
  Vercel → Storage → Marketplace → **Upstash Redis** (plan gratis) → conectar al
  proyecto → Redeploy.

### Editar página — pestañas de catálogo

Dentro de `/pedidos` → **✏️ Editar página** hay varias sub-pestañas:

- **Categorías**: agregar, activar/desactivar, eliminar, **renombrar**, y ahora
  también editar la **descripción** que se ve en su tarjeta de la portada
  (opcional — si la dejas vacía, se usa el texto automático según esté activa
  o no). Cambia lo que quieras y aparece el botón "Guardar cambios". El ID no
  se puede cambiar una vez creada — solo el nombre y la descripción.
- **Tamaños**: edita el nombre y las medidas (ej. "135 x 190 cm") de cada
  tamaño, o agrega/elimina tamaños. Estos son los que eliges en "Precios por
  tamaño" al editar un producto. Cambiar nombre/medidas no afecta los precios
  ya guardados; eliminar un tamaño hace que los productos con precio ahí dejen
  de poder comprarse en ese tamaño (el precio queda guardado por si lo agregas
  de nuevo con el mismo ID).
- **Página principal**: los textos del hero (lo primero que ve el cliente),
  los botones, la palabra grande de la animación, el título y descripción de
  la sección "Todo para tu hogar", el título + los pasos de "Comprar es
  simple" (puedes agregar o quitar pasos — si los quitas todos, esa sección
  no se muestra pero el botón "Ir a la tienda" sigue apareciendo igual), y la
  **fila de confianza del checkout** (ej. "🚚 Entrega a tu casa") — un ícono
  (puede ser un emoji) + texto corto por ítem, se ve justo antes de que el
  cliente empiece a llenar sus datos de pago. Si quitas todos los ítems, esa
  fila no se muestra.
- **Vitrina animada**: los paneles del carrusel 3D que se arrastra en la
  portada (el de "arrastra o toca un panel"). Por cada panel puedes cambiar la
  imagen (con el botón "📷 Subir"), el color de fondo, el nombre (ahora se
  muestra visible sobre el panel) y a qué categoría lleva al tocar — o quitar
  y agregar paneles. La forma del blob y el balanceo son automáticos, no hay
  que configurarlos. Si quitas todos los paneles, esa sección simplemente no
  se muestra en la portada (no rompe nada).
- **Datos de la tienda** también incluye ahora: **redes sociales** (pega el
  enlace de Instagram/Facebook/TikTok/YouTube/X — solo se muestra el ícono de
  las que llenes en el pie de página) y el **newsletter** (interruptor para
  mostrarlo o no en el pie de página, con título y descripción editables).
- **Legal**: los textos de tu **Política de Privacidad** y **Términos y
  Condiciones**, cada uno con su interruptor para mostrarlo o no (aparecen como
  enlaces en el pie de página). Vienen con plantillas orientativas para Perú;
  {{proveedor}} y {{whatsapp}} se reemplazan solos con tus datos. ⚠️ Hazlas
  revisar por un abogado antes de confiar en ellas — no reemplazan asesoría
  legal profesional.
- **Encuesta**: la encuesta opcional que aparece después de comprar (en la
  página de gracias). Interruptor para mostrarla o no, título/descripción y
  preguntas editables (de opciones o de texto libre). El cliente puede
  responderla o tocar "Ahora no". Las respuestas las ves en la pestaña
  **📊 Encuestas** del panel.

## Seguimiento de pedido para el cliente (/seguimiento)

- Cualquier cliente puede entrar a `tudominio.vercel.app/seguimiento`, poner
  su código de pedido (ej. `ED-XXXXXXXX`) y ver un círculo de progreso con el
  % de avance: Por verificar (20%) → Pagado (60%) → Entregado (100%), o
  Cancelado.
- El botón "Ver el estado de mi pedido" aparece solo en la página de gracias
  después de comprar, y el link también llega en el correo de confirmación.

## Libro de Reclamaciones (obligatorio por ley en Perú)

`tudominio.vercel.app/libro-de-reclamaciones` — enlazado siempre en el pie de
página de toda la web (footer), como exige la norma.

**Por qué existe:** el Código de Protección y Defensa del Consumidor (Ley
29571) y su reglamento obligan a todo negocio que atiende consumidores en
Perú, incluidas las tiendas online, a tener un Libro de Reclamaciones
accesible sin necesidad de haber comprado. No es opcional.

- **Para el cliente:** un formulario público (nombre, documento, domicilio,
  teléfono, correo, tipo "Reclamo" o "Queja", detalle y qué solicita). Al
  enviarlo recibe un número de hoja (folio) correlativo, ej. `RC-2026-0001`.
- **Para ti:** en el panel `/pedidos` → pestaña **📋 Reclamos** ves todos los
  reclamos, con los días restantes para responder (el plazo legal es hasta
  30 días calendario desde la fecha del reclamo). Escribes tu respuesta ahí
  mismo y queda guardada con fecha.
- **No se pueden eliminar**: a diferencia de los pedidos, los reclamos no
  tienen botón de borrar — son un registro legal que debes conservar.
- **Datos del proveedor**: en `/pedidos` → Editar página → Datos de la
  tienda, completa **Razón social**, **RUC** y **Domicilio fiscal** — se
  muestran en la página pública del libro para identificar tu negocio.
  Puedes dejarlos vacíos por ahora; la página funciona igual, pero
  complétalos apenas los tengas a mano.

⚠️ Este texto es una guía práctica, no asesoría legal. Para confirmar que
cumples exactamente con la normativa vigente (plazos, formato, registro ante
INDECOPI si aplica a tu caso), consulta con un abogado o contador en Perú.

## Seguridad incluida

- El **precio siempre se recalcula en el servidor** desde el catálogo: aunque
  alguien manipule la página, no puede pagar menos del precio real.
- Cabeceras de seguridad (anti-clickjacking, anti-sniffing, HSTS, permisos del
  navegador restringidos) y una Política de Seguridad de Contenido (CSP) en
  modo de solo-aviso, preparando el terreno para bloquear contenido no
  autorizado más adelante sin arriesgar que se rompa el pago con Culqi.
- Tu clave de administrador se manda por una cabecera segura (no en la URL),
  se compara de una forma que no se puede adivinar midiendo tiempos, y se
  bloquea automáticamente por 5 minutos tras 20 intentos fallidos seguidos
  desde la misma conexión — a tu uso normal del panel nunca le afecta, solo
  frena a quien intente adivinar la clave a la fuerza.
- Límites de intentos en los formularios públicos (pagos, pedidos, reseñas,
  reclamos, códigos de descuento) para frenar spam y intentos de probar
  tarjetas robadas, sin afectar el uso normal de un cliente real.
- Las fotos que subes se revisan por su contenido real, no solo por el
  nombre del archivo — así no se puede subir algo disfrazado de imagen.
- Textos de clientes recortados y validados contra datos maliciosos.
- La llave secreta de Culqi y tu clave de administrador viven SOLO en Vercel,
  nunca en el código ni en el navegador.
- Nada es 100% inhackeable: mantén tus claves largas y no las compartas.

---

## Analíticas (Google Analytics + Meta Pixel)

Ambas son opcionales y gratis. No hacen nada hasta que agregues tus IDs en
Vercel → Settings → Environment Variables:

**Google Analytics 4** (saber cuánta gente visita, qué páginas ven, de dónde vienen):
1. Entra a https://analytics.google.com → Admin → Crear propiedad.
2. Copia tu "ID de medición" (empieza con `G-...`).
3. En Vercel agrega `VITE_GA_MEASUREMENT_ID` = ese ID → Redeploy.

**Meta Pixel** (para anuncios en Facebook/Instagram y remarketing):
1. Entra a https://business.facebook.com/events_manager → Conectar orígenes de datos → Web → Meta Pixel.
2. Copia tu "ID de píxel" (solo números).
3. En Vercel agrega `VITE_META_PIXEL_ID` = ese ID → Redeploy.

Una vez configurados, la web reporta automáticamente: vistas de página,
**agregar al carrito**, **iniciar checkout** y **compra completada** — así ves
en qué paso del embudo se van los visitantes que no terminan comprando.

## Vista previa al compartir el link

Ya está configurada: al pegar el link de tu tienda en WhatsApp, Facebook o
donde sea, se muestra una tarjeta con el logo E|D y el nombre de la tienda
(`public/og-image.png`). Cuando tengas fotos reales de tus muebles, puedes
reemplazar esa imagen por una foto de tu mejor producto — se ve mucho más
atractivo que un texto en fondo plano.

---

## Códigos de descuento (cupones)

Panel `/pedidos` → pestaña **🏷️ Promociones**.

- **"🎲 Generar código"** te da un código legible al azar (ej. `PROMO-K7X2Q`)
  listo para enviar a un cliente. **"+ Código manual"** te deja escribir el tuyo
  (ej. `AMIGO10`).
- Cada código tiene: **tipo** (porcentaje o monto fijo en soles), **valor**,
  **límite de usos** (opcional — déjalo vacío para uso ilimitado) y **fecha de
  vencimiento** (opcional).
- **Activar / Desactivar**: un código desactivado deja de funcionar al
  instante, sin necesidad de eliminarlo — útil para pausar una promo.
- **Eliminar**: lo borra para siempre.
- El cliente lo escribe en el checkout, en el campo "¿Tienes un código de
  descuento?", antes de pagar. El descuento se aplica al total y se ve
  reflejado en el monto que realmente se cobra (tarjeta/Yape, o el monto que
  se le pide transferir/yapear).
- Si un código se queda sin usos o vence justo cuando el cliente va a pagar,
  la compra **no se bloquea** — simplemente se cobra el precio normal.

**Seguridad:** el descuento siempre se recalcula en el servidor a partir del
código guardado — nadie puede inventarse un descuento editando el navegador.

## Descuento directo por producto (precio regular + precio de oferta)

En el panel → **Editar página** → **Productos** → al editar un producto, en
**"Precios por tamaño"** cada tamaño tiene DOS campos, independientes entre sí:

- **Precio regular**: el precio normal (lo mismo de siempre).
- **Precio de oferta** (opcional): el precio con descuento, escrito
  directamente en soles — no un porcentaje. Déjalo vacío si ese tamaño no
  está en oferta.

Es decir, tú escribes los dos números tal cual se van a ver (ej. regular
S/799, oferta S/599) y el sistema calcula solo el porcentaje para la
etiqueta. Cada tamaño puede tener su propia oferta o ninguna — no tienen
que coincidir.

- El precio de oferta **debe ser menor** al precio regular de ese mismo
  tamaño. Si escribes uno igual o mayor, se marca en rojo y al guardar se
  ignora automáticamente (el producto se vende al precio regular) — así
  no hay riesgo de "descontar" a un precio más caro por error de tipeo.
- En la tienda se ve el precio regular tachado + el precio de oferta, con
  una etiqueta roja "-XX%" calculada sola (en la tarjeta del producto, en
  su página, y en la vitrina rotativa de la portada).
- El precio final es el que realmente se cobra — el servidor lo recalcula
  igual que el precio normal, así que no hay forma de manipularlo desde el
  navegador.
- Puedes combinar un descuento de producto CON un código de descuento — se
  aplican uno sobre el otro (primero la oferta del producto, luego el cupón
  sobre ese total).

**Alternativa: descuento por porcentaje.** Debajo de "Precios por tamaño"
hay una casilla **"O, en vez de precio de oferta, usar un descuento por
porcentaje"** — la forma anterior, por si prefieres escribir un % en vez de
calcular el precio de oferta a mano. Se aplica solo a los tamaños que
dejaste SIN precio de oferta directo arriba (si un tamaño ya tiene su
propio precio de oferta, ese manda). Útil para aplicar el mismo % a varios
tamaños de una sola vez sin escribir cada precio.

## Buscador de distrito en el checkout (Lima y Provincia)

Antes el cliente escribía su distrito a mano (con riesgo de errores de
tipeo que compliquen la entrega). Ahora, tanto en **Lima Metropolitana**
como en **Provincia**, el campo de distrito es un buscador: el cliente
escribe unas letras y elige de una lista desplegable.

- **Lima Metropolitana**: la lista son los distritos de Lima + Callao (51
  en total) — solo los que corresponden a entrega local.
- **Provincia**: la lista son los 1892 distritos de todo el Perú. Al elegir
  uno, se completan solos el departamento y la provincia — el cliente ya no
  escribe esos tres campos por separado, solo busca y elige el distrito.
- La lista se carga aparte del resto de la web (no hace más lenta ninguna
  otra página), así que puede tardar un instante en activarse al entrar al
  checkout — mientras carga, el campo dice "Cargando lista...".
- **"📍 Usar mi ubicación actual"** (en Lima): además de marcar el pin en el
  mapa, ahora detecta el distrito automáticamente a partir del GPS y llena
  el campo Distrito solo. El campo sigue siendo editable — si el GPS se
  equivoca o no logra detectar el distrito, el cliente lo busca y elige a
  mano igual que siempre.
