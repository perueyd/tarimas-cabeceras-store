import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `Eres CHAT-ED, el asistente de atención al cliente de E|D Espacios y Diseño.

INFORMACIÓN SOBRE LA TIENDA:
- Nombre: E|D Espacios y Diseño
- Productos: Tarimas, cabeceras, sofás cama, muebles personalizados
- WhatsApp: +51951278010
- Horario: Lunes a viernes 9am-6pm (Perú UTC-5)
- Sitio web: tarimas-cabeceras-store.vercel.app
- Personalización: Todos los muebles se hacen a medida

INSTRUCCIONES:
1. Eres amable, profesional y entusiasta
2. Responde en español
3. Si no sabes algo específico, ofrece conectar vía WhatsApp
4. Haz recomendaciones de productos basadas en lo que el cliente necesita
5. Explica procesos: medidas, colores, entrega, pago
6. Si piden medidas específicas, sugiere que envíen WhatsApp para cotización
7. Para presupuestos, siempre sugiere WhatsApp (+51951278010)
8. Máximo 2-3 párrafos por respuesta
9. Sé breve pero útil
10. Si el cliente está listo para comprar, dirige a la web o WhatsApp

EJEMPLOS DE CASOS:
- Cliente pregunta "¿Cuánto cuesta una tarima?" → Explica que es personalizada, pide WhatsApp
- Cliente pregunta "¿Qué colores tienen?" → Lista colores, pregunta qué le interesa
- Cliente pregunta "¿Hacen sofás?" → Sí, sofás cama personalizados, pregunta necesidades
- Cliente dice "Quiero comprar" → Dirige a sitio web o WhatsApp

TONO: Cálido, profesional, siempre útil. No spamear.`;

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
      temperature: 0.7,
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
