# Tarimas & Cabeceras Perú

Tienda online minimalista para venta de tarimas y cabeceras, hecha con React + Vite + Tailwind CSS, carrito de compras y pagos con Culqi (Soles peruanos). El backend de pagos es una función serverless de Node.js, pensada para desplegarse gratis en Vercel.

## Estructura

```
src/
  components/   Header, Footer, tarjetas de producto, selector de color, imagen con teñido
  pages/        Home (catálogo), ProductDetail, Cart, Checkout, ThankYou
  data/         catalog.js — productos, tamaños, colores y precios
  context/      CartContext.jsx — estado del carrito (persistido en localStorage)
api/
  create-charge.js   Función serverless que crea el cargo en Culqi (usa la llave secreta)
public/images/       SVGs de ejemplo (grises) usados como base para el teñido de color
```

## Cómo funciona el selector de color

En vez de requerir una foto distinta por cada color (fotografía cara y lenta de actualizar),
`ProductImage.jsx` tiñe la imagen base en escala de grises con el color elegido usando
`mix-blend-mode` en CSS. El cambio es instantáneo, sin llamadas a servidor.

Cuando tengas fotos reales de tus productos:
- Sube fotos en tonos neutros/grises de cada modelo (sin el color final) a `public/images/`.
- Reemplaza los SVG de ejemplo por esas fotos en `src/data/catalog.js` (`baseImage`).
- Si prefieres usar una foto distinta por cada color en vez del teñido automático, cambia
  `availableColors` por un objeto `{ colorId: urlDeFoto }` y ajusta `ProductImage` para
  mostrar la foto correspondiente en lugar del filtro.

## Instalación local

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` con tus llaves de Culqi (modo prueba mientras desarrollas):

```
VITE_CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CULQI_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
```

Las obtienes creando una cuenta en https://culqi.com y activando tu comercio.

```bash
npm run dev
```

> Nota: `npm run dev` (Vite) sirve el frontend, pero no ejecuta la función `api/create-charge.js`
> por sí solo. Para probar el flujo de pago completo en local, usa `vercel dev` (ver abajo) o
> despliega directamente a Vercel con tus llaves de prueba.

## Despliegue gratuito

**Recomendado: Vercel.** Vercel aloja el frontend estático y la carpeta `api/` como funciones
serverless de Node automáticamente, todo en el mismo despliegue y sin costo en el plan Hobby.
(Heroku eliminó su plan gratuito en 2022, por eso no se usa aquí.)

1. Sube este proyecto a un repositorio de GitHub.
2. Entra a https://vercel.com, importa el repositorio.
3. En "Environment Variables" agrega `VITE_CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY` (usa tus
   llaves de producción cuando estés listo para cobrar de verdad).
4. Despliega. Vercel detecta Vite automáticamente.

Para probar todo (frontend + función serverless) en tu máquina antes de subir:

```bash
npm install -g vercel
vercel dev
```

## Antes de salir a producción

- Verifica la integración de Culqi contra su documentación oficial vigente
  (https://docs.culqi.com), ya que los SDKs y endpoints pueden actualizarse.
- Cambia las llaves de prueba (`pk_test_...`, `sk_test_...`) por las de producción
  (`pk_live_...`, `sk_live_...`) solo cuando hayas probado el flujo completo.
- Revisa los métodos de pago habilitados (tarjeta, Yape, etc.) en `Checkout.jsx`
  según lo que tengas activado en tu cuenta de Culqi.
- Ajusta textos legales (términos, política de cambios/devoluciones) según tu negocio.
