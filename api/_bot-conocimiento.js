// Lo que el chatbot SABE de la tienda.
//
// Antes toda su información estaba escrita a mano dentro de api/chatbot.js:
// una lista fija de productos y precios que nadie actualizaba. Cada vez que se
// cambiaba un precio en el panel, el bot seguía dando el viejo — y a un cliente
// se le puede exigir el precio que le prometieron.
//
// Ahora el conocimiento se arma en cada consulta desde el catálogo REAL, y la
// personalidad se edita desde el panel (Editar página → Entrenar chatbot) sin
// tocar código.

import { getCatalog } from './_catalog.js';
import { NOMBRE_TIENDA } from '../src/data/sitio.js';
import { SITIO } from './_sitio.js';

// Personalidad por defecto. El dueño puede reemplazarla desde el panel.
export const PERSONALIDAD_POR_DEFECTO = `Eres el asistente de ${NOMBRE_TIENDA}, una tienda peruana de muebles a medida.

Tu trabajo es ayudar a quien entra a la web: resolver dudas sobre productos, medidas, colores, precios y entrega, y acompañar hasta la compra.

TONO: cercano y directo, de tú, como un buen vendedor de tienda de barrio: amable pero sin rodeos. Respuestas cortas (2 o 3 frases).`;

// Reglas que NO se pueden desactivar desde el panel: son las que evitan que el
// bot prometa cosas falsas o invente precios.
const REGLAS_FIJAS = `
REGLAS QUE SIEMPRE CUMPLES:
- Usa SOLO los datos de la lista de productos de abajo. Si te preguntan por un precio, medida o color que no aparece ahí, di que lo consultas por WhatsApp. NUNCA inventes un precio ni una medida.
- Si no sabes algo, dilo claramente y pasa el WhatsApp. Es mejor eso que inventar.
- No prometas descuentos, plazos ni garantías que no aparezcan en estos datos.
- No pidas ni aceptes datos de tarjeta, contraseñas ni documentos por el chat.
- Responde siempre en español de Perú. Los precios en soles (S/).
- Si das un precio, da EL DE LA MEDIDA QUE TE PIDEN. La lista de abajo trae el precio de cada medida, no uses un rango si te preguntan por una en concreto.
- El número de WhatsApp se escribe EXACTAMENTE como aparece abajo, sin cambiarle los espacios ni agrupar los dígitos de otra forma.`;

// Precio REAL de venta de un tamaño: el mismo que ve el cliente en la ficha.
//
// Antes el bot leía sizePricing directamente, que es el precio SIN rebajar.
// Si un producto tenía precio de oferta, el bot cotizaba el original: decía
// S/ 1200 cuando la web cobraba S/ 890. Un cliente que pregunta y recibe un
// precio más alto del real, simplemente no compra.
function precioReal(producto, sizeId) {
  const original = producto?.sizePricing?.[sizeId];
  if (original == null) return null;

  // 1) Precio de oferta propio de ese tamaño, si es válido.
  const oferta = Number(producto?.offerPricing?.[sizeId]);
  if (Number.isFinite(oferta) && oferta > 0 && oferta < original) {
    return { final: Math.round(oferta * 100) / 100, rebajado: true };
  }

  // 2) Porcentaje de descuento general del producto.
  const pct = Math.min(Math.max(Number(producto?.discountPercent) || 0, 0), 100);
  if (pct > 0) {
    return { final: Math.round(original * (1 - pct / 100) * 100) / 100, rebajado: true };
  }

  return { final: original, rebajado: false };
}

function resumirProductos(products, sizes) {
  const activos = products.filter((p) => !p.oculto);
  if (!activos.length) return 'Todavía no hay productos publicados.';

  // El nombre bonito de cada medida ("Queen"), no su id interno ("queen").
  const etiqueta = new Map(sizes.map((s) => [s.id, s.label || s.id]));

  const porCategoria = {};
  for (const p of activos) {
    const calculados = Object.keys(p.sizePricing || {})
      .map((sizeId) => ({ sizeId, ...(precioReal(p, sizeId) || {}) }))
      .filter((x) => x.final > 0);

    // Antes aquí se armaba un RANGO ("S/ 220 a S/ 410") y era lo único que el
    // bot llegaba a saber. Por eso, cuando un cliente preguntaba "¿cuánto
    // cuesta la MILÁN en queen?", el bot no podía responder: le daba el rango
    // entero y lo mandaba a WhatsApp. Tenía el dato delante y no lo recibía.
    let precios = 'precio a consultar';
    if (calculados.length) {
      precios = calculados
        .map((x) => `${etiqueta.get(x.sizeId) || x.sizeId} S/ ${x.final}${x.rebajado ? ' (rebajado)' : ''}`)
        .join(' · ');
    }

    const linea = `- ${p.name}: ${precios}`;
    (porCategoria[p.category] ||= []).push(linea);
  }

  return Object.entries(porCategoria)
    .map(([cat, lineas]) => `${cat.toUpperCase()}:\n${lineas.join('\n')}`)
    .join('\n\n');
}

// Arma el texto completo de instrucciones para el modelo.
export async function construirConocimiento() {
  const catalog = await getCatalog();
  const { products = [], colors = [], sizes = [], categories = [], storeConfig = {} } = catalog;
  const bot = storeConfig.bot || {};

  const personalidad = String(bot.personalidad || PERSONALIDAD_POR_DEFECTO).slice(0, 3000);
  const extra = String(bot.instruccionesExtra || '').slice(0, 2000);

  const tamanos = sizes.map((s) => `${s.label}${s.dims ? ` (${s.dims})` : ''}`).join(', ');
  const coloresTxt = colors.map((c) => c.label).join(', ');
  const cats = categories.filter((c) => c.active !== false).map((c) => c.label || c.id).join(', ');
  // El número se guarda en dígitos pegados (51951278010) porque así lo exige
  // el enlace de WhatsApp. Pero si se le entrega así al modelo, lo reparte a su
  // gusto al escribirlo: una respuesta real decía "519 512 78010", que no es
  // el número de nadie. Se le da ya agrupado y se le prohíbe reescribirlo.
  const digitos = String(storeConfig.whatsapp || '51951278010').replace(/\D/g, '');
  const wa = digitos.startsWith('51') && digitos.length === 11
    ? `+51 ${digitos.slice(2, 5)} ${digitos.slice(5, 8)} ${digitos.slice(8)}`
    : `+${digitos}`;

  const faq = Array.isArray(storeConfig.faq)
    ? storeConfig.faq
        .slice(0, 12)
        .map((f) => `P: ${f.q || f.pregunta}\nR: ${f.a || f.respuesta}`)
        .join('\n\n')
    : '';

  return `${personalidad}
${REGLAS_FIJAS}

═══ DATOS REALES DE LA TIENDA (actualizados hoy) ═══

WhatsApp para cotizar y consultar medidas: ${wa}
Web: ${SITIO}
Categorías: ${cats || 'sin categorías'}

PRODUCTOS Y PRECIOS:
${resumirProductos(products, sizes)}

TAMAÑOS DISPONIBLES: ${tamanos || 'consultar'}

COLORES DE TELA: ${coloresTxt || 'consultar'}

${faq ? `PREGUNTAS FRECUENTES (respuestas oficiales de la tienda):\n${faq}\n` : ''}
${extra ? `INDICACIONES ADICIONALES DEL DUEÑO:\n${extra}\n` : ''}
═══ FIN DE LOS DATOS ═══

Recuerda: si algo no está aquí arriba, no te lo inventes — deriva al WhatsApp ${wa}.`;
}
