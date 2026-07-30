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

// Personalidad por defecto. El dueño puede reemplazarla desde el panel.
export const PERSONALIDAD_POR_DEFECTO = `Eres el asistente de E|D Espacios y Diseño, una tienda peruana de muebles a medida.

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
- Responde siempre en español de Perú. Los precios en soles (S/).`;

function resumirProductos(products) {
  const activos = products.filter((p) => !p.oculto);
  if (!activos.length) return 'Todavía no hay productos publicados.';

  const porCategoria = {};
  for (const p of activos) {
    const precios = Object.values(p.sizePricing || {}).filter((n) => Number(n) > 0);
    const rango = precios.length
      ? precios.length > 1 && Math.min(...precios) !== Math.max(...precios)
        ? `S/ ${Math.min(...precios)} a S/ ${Math.max(...precios)}`
        : `S/ ${precios[0]}`
      : 'precio a consultar';
    const linea = `- ${p.name}: ${rango}${p.discountPercent ? ` (${p.discountPercent}% de descuento)` : ''}`;
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
  const wa = storeConfig.whatsapp || '+51951278010';

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
Web: https://eydperu.vercel.app
Categorías: ${cats || 'sin categorías'}

PRODUCTOS Y PRECIOS:
${resumirProductos(products)}

TAMAÑOS DISPONIBLES: ${tamanos || 'consultar'}

COLORES DE TELA: ${coloresTxt || 'consultar'}

${faq ? `PREGUNTAS FRECUENTES (respuestas oficiales de la tienda):\n${faq}\n` : ''}
${extra ? `INDICACIONES ADICIONALES DEL DUEÑO:\n${extra}\n` : ''}
═══ FIN DE LOS DATOS ═══

Recuerda: si algo no está aquí arriba, no te lo inventes — deriva al WhatsApp ${wa}.`;
}
