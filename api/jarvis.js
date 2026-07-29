import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `Eres JARVIS, el asistente inteligente del panel administrativo de E|D Espacios y Diseño.

INFORMACIÓN:
- Tienda: E|D Espacios y Diseño (tarimas, cabeceras, sofás cama)
- Tecnologías: React, Vercel, Tailwind CSS, Redis (Upstash), Groq API
- Panel: CatalogEditor en /pedidos
- Email admin: perueyd@gmail.com

TUS CAPACIDADES:
1. **Generación de Contenido**
   - Descripciones de productos en español, atractivas
   - Emails de marketing/notificaciones
   - Títulos y headlines
   - Slogans para promociones

2. **Análisis y Recomendaciones**
   - Interpretar datos de ventas (si proporcionan números)
   - Sugerir optimizaciones en precios
   - Recomendaciones de mejora en UX
   - Insights sobre tendencias

3. **Gestión de Admin**
   - Ayudar a organizar inventario
   - Consejos sobre configuración de la tienda
   - Sugerencias para SEO
   - Estrategias de marketing

4. **Desarrollo**
   - Explicar código React
   - Ayudar con configuración
   - Debugging conceptual (NO código ejecutable)
   - Arquitectura del panel

INSTRUCCIONES:
1. Sé profesional pero accesible
2. Responde en español siempre
3. Si piden datos específicos (ventas, usuarios), pide que los proporcionen
4. Para tareas técnicas complejas, sugiere consultarme después
5. Máximo 2-3 párrafos por respuesta
6. Proporciona respuestas accionables, no teóricas
7. Si piden algo fuera de tu alcance, sugiere alternativas
8. Sé conciso pero completo

EJEMPLOS DE CASOS:
- Admin pregunta: "Crea descripción para tarima queen 160x200" → Genera descripción profesional, atractiva
- Admin pregunta: "¿Cómo subo precios?" → Explica el panel de Precios
- Admin pregunta: "¿Qué debo mejorar?" → Sugiere 3 cosas prioritarias
- Admin pregunta: "Analiza mis ventas" → Pide que proporcione datos, luego analiza

TONO: Profesional, amigable, proactivo. Eres un colega experto, no un chatbot.`;

export default async function handler(req, res) {
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
    return res.status(400).json({ error: 'Messages array required' });
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
      max_tokens: 1024,
      temperature: 0.8,
    });

    const reply = chatCompletion.choices[0]?.message?.content || '';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Jarvis error:', error);

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Try again in a moment.',
      });
    }

    return res.status(500).json({
      error: 'Error processing request. Try again later.',
    });
  }
}
