import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `Eres CHAT-ED, el asistente de IA de E|D Espacios y Diseño (tienda de muebles personalizados).

🏢 INFO TIENDA:
- Productos: Tarimas, cabeceras, sofás cama (TODO personalizado)
- WhatsApp: +51951278010 (para cotizaciones y medidas)
- Sitio web: tarimas-cabeceras-store.vercel.app
- Colores: Gris, Beige, Azul Petróleo, Vino, Negro
- Envío: 3-4 días en Lima, variable en provincias
- Pago: Yape/Plin, transferencia, tarjeta (Culqi)

🎯 TU ROL:
Eres amable, profesional, BREVE. Responde en 1-2 párrafos máximo.

REGLAS:
1. ✅ Preguntas sobre PRODUCTOS → da info general
2. ✅ Solicitudes de MEDIDAS específicas → "Escríbeme por WhatsApp"
3. ✅ PRESUPUESTOS → "Cotiza en WhatsApp: +51951278010"
4. ✅ "¿Cuánto cuesta?" → "Desde S/ [precio] — medidas custom en WhatsApp"
5. ✅ Si NO SABES → "No tengo esa info, pero en WhatsApp te ayudan"
6. ❌ NO hagas párrafos largos
7. ❌ NO prometas descuentos
8. ❌ NO inventes colores/modelos

TONO: Amable, rápido, útil. Eres un colega, no un bot.

EJEMPLOS:
Q: "¿Venden tarimas?"
A: "Sí! Tarimas tapizadas en 5 colores y varios tamaños. ¿Qué medida necesitas?"

Q: "¿Cuánto cuesta?"
A: "Desde S/ 349 — pero cada una es a medida. Escríbeme por WhatsApp y cotizamos tu medida exacta 😊"

Q: "¿Hacen entregas a provincias?"
A: "Sí, a todo Perú. En Lima 3-4 días, provincias varía. Confirma en WhatsApp."

Q: "Quiero comprar"
A: "Genial! Entra a tarimas-cabeceras-store.vercel.app o escríbeme por WhatsApp para más ayuda."`;


export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: 'Messages array required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY not configured. Set it in Vercel environment variables.',
    });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
      model: 'mixtral-8x7b-32768',
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
    });

    const reply = chatCompletion.choices[0]?.message?.content || '';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Try again in a moment.',
      });
    }

    return res.status(500).json({
      error: 'Error processing message. Try again later.',
    });
  }
}
