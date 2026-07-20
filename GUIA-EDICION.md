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
  si quieres una foto distinta por acabado, crea un producto por cada acabado.)

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

## Registro de pedidos en Google Sheets (hoja de cálculo)

Cada pedido puede guardarse automáticamente en una hoja de Google tuya:

1. Entra a https://sheets.new y crea una hoja llamada "Pedidos ED".
2. En la primera fila escribe estos encabezados:
   `Fecha | Código | Estado | Método | Monto | Nombre | Teléfono | Email | Zona | Dirección | Ubicación | Entrega | Productos`
3. Menú **Extensiones → Apps Script**. Borra lo que haya y pega esto:

```js
function doPost(e) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var o = JSON.parse(e.postData.contents);
  var items = (o.items || []).map(function(i){
    return i.productName + ' x' + i.qty + ' (' + i.sizeId + ', ' + i.colorId + ')';
  }).join(' | ');
  hoja.appendRow([o.fecha, o.code, o.estado, o.metodo, o.monto, o.nombre,
    o.telefono, o.email, o.zona, o.direccion, o.ubicacion, o.entrega, items]);
  return ContentService.createTextOutput('ok');
}
```

4. Botón **Implementar → Nueva implementación → Aplicación web**:
   - "Ejecutar como": **Tú** (tu correo)
   - "Quién tiene acceso": **Cualquier persona**
   - Autoriza los permisos cuando Google te los pida.
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. En Vercel → Settings → Environment Variables agrega
   `SHEETS_WEBHOOK_URL` = esa URL, y haz **Redeploy**.

Desde ese momento, **todos los pedidos** (Culqi, Yape/Plin y transferencia)
se agregan como una fila nueva en tu hoja, además del panel `/pedidos`.

---

## Panel del negocio (/pedidos)

- Entra a `tudominio.vercel.app/pedidos` con la clave que definiste en la
  variable `ORDERS_ADMIN_KEY` de Vercel.
- Verás: ventas confirmadas, montos por verificar, ventas de hoy, calificación
  promedio, la lista completa de pedidos (con link al pin del mapa) y las
  reseñas de clientes (con opción de eliminar las inapropiadas).
- Para que el panel y las reseñas funcionen necesitas la base de datos gratuita:
  Vercel → Storage → Marketplace → **Upstash Redis** (plan gratis) → conectar al
  proyecto → Redeploy.

## Seguridad incluida

- El **precio siempre se recalcula en el servidor** desde el catálogo: aunque
  alguien manipule la página, no puede pagar menos del precio real.
- Cabeceras de seguridad (anti-clickjacking, anti-sniffing, HSTS).
- Textos de clientes recortados y validados contra datos maliciosos.
- La llave secreta de Culqi y tu clave de administrador viven SOLO en Vercel,
  nunca en el código ni en el navegador.
- Nada es 100% inhackeable: mantén tus claves largas y no las compartas.
