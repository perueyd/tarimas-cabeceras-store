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

1. Copia tus fotos a la carpeta `public/images/` del proyecto.
2. Usa nombres simples sin espacios: `ropero-6-puertas.jpg`, `sofa-cama-gris.jpg`.
3. En el producto, referencia la foto así: `baseImage: '/images/ropero-6-puertas.jpg'`.

**¿Foto gris o foto a color?**
- Si subes la foto del mueble en **tonos grises/neutros** → pon `tintable: true`.
  La web la teñirá automáticamente con cada color que elija el cliente.
- Si subes la foto **ya con su acabado real** (ej. melamina roble) → pon `tintable: false`.
  La foto se muestra tal cual. (En este caso los círculos de color son solo referenciales;
  si quieres una foto distinta por acabado, crea un producto por cada acabado — ver
  "Foto propia por color" más abajo.)

**Importante si usas `tintable: true`: sube la foto SIN FONDO (PNG transparente).**
El teñido usa la transparencia de tu propia foto para saber "hasta dónde" pintar. Si tu
foto es un JPG con fondo (pared, piso, etc.), el color se aplicará sobre TODO el
rectángulo, incluido el fondo — se va a ver mal. La solución:
1. Recorta el mueble dejando el fondo transparente (hay editores gratis online tipo
   "remove background" — busca "quitar fondo de imagen gratis").
2. Guarda el archivo como **PNG** (no JPG — el JPG no admite transparencia).
3. Súbelo con el botón "📷 Subir" del panel como siempre.

Con el fondo transparente, el color solo pinta el mueble; el resto de la tarjeta queda
con tu fondo neutro de la web, limpio.

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

Solo edita los números en `sizePricing` del producto. Están en soles (S/).

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
- Cambiar el estado de un pedido también actualiza la fila en tu hoja de
  Google y le envía un correo automático al cliente (si configuraste
  `SHEETS_WEBHOOK_URL`, ver sección anterior).
- Para que el panel y las reseñas funcionen necesitas la base de datos gratuita:
  Vercel → Storage → Marketplace → **Upstash Redis** (plan gratis) → conectar al
  proyecto → Redeploy.

## Seguimiento de pedido para el cliente (/seguimiento)

- Cualquier cliente puede entrar a `tudominio.vercel.app/seguimiento`, poner
  su código de pedido (ej. `ED-XXXXXXXX`) y ver un círculo de progreso con el
  % de avance: Por verificar (20%) → Pagado (60%) → Entregado (100%), o
  Cancelado.
- El botón "Ver el estado de mi pedido" aparece solo en la página de gracias
  después de comprar, y el link también llega en el correo de confirmación.

## Seguridad incluida

- El **precio siempre se recalcula en el servidor** desde el catálogo: aunque
  alguien manipule la página, no puede pagar menos del precio real.
- Cabeceras de seguridad (anti-clickjacking, anti-sniffing, HSTS).
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
