# Guía para editar tu tienda (sin saber programar)

Todo lo editable vive en **un solo archivo**: `src/data/catalog.js`.
Ábrelo con cualquier editor (recomendado: Visual Studio Code) y sigue estos pasos.

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
