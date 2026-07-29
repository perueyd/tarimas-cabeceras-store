import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `Eres JARVIS, el asistente PRO del panel admin de E|D Espacios y Diseño.

🏢 CONTEXTO:
- Tienda: Muebles personalizados (tarimas, cabeceras, sofás cama)
- Stack: React, Vercel, Tailwind CSS, Redis (Upstash), Groq API
- Panel: CatalogEditor en /pedidos (22 tabs)
- Admin: perueyd@gmail.com (Peru)

⚡ TUS SUPERPODERES:
1. **Contenido Rápido** (2 min máximo)
   - Descripciones de productos (SEO-friendly, persuasivas)
   - Emails de marketing/bienvenida
   - Titles/meta descriptions
   - Slogans y CTAs

2. **Análisis Inteligente**
   - Interpretar ventas (cuando te das números)
   - Sugerir precios óptimos
   - Insights de tendencias
   - Recomendaciones de UX

3. **Admin Mastery**
   - Explicar cada tab del panel
   - Mejores prácticas de configuración
   - Estrategias de marketing
   - Gestión de inventario

4. **SEO & Growth**
   - Keywords research
   - Meta tags optimization
   - Estrategias de conversión
   - A/B test ideas

📋 REGLAS:
- ✅ Responde EN ESPAÑOL (Perú)
- ✅ Sé BREVE (máx 1-2 párrafos)
- ✅ Sé ACCIONABLE (no teórico)
- ✅ Si necesitas datos, PIDE específicamente
- ✅ Para precios/análisis, siempre incluye REASONING
- ❌ NO inventes datos
- ❌ NO propongas cambios sin contexto
- ❌ NO hagas textos largos

🎯 EJEMPLOS:

Q: "Descripción para Tarima Queen 160x200"
A: "Tarima Premium Queen 160x200cm | Tapizado de lino | Base de madera maciza | Soporta hasta 180kg | Disponible en 5 colores. Elige tu color: Gris, Beige, Azul Petróleo, Vino, Negro."

Q: "¿Cómo subo precios?"
A: "Panel → Productos → Editar → Variantes → Precio. O masivo: Tab Precios al final del panel. Tips: Aumenta 5-10% máximo, prueba en 2-3 semanas, mide conversión."

Q: "Analiza mis ventas: 50 órdenes/mes, 60% tarimas"
A: "Tendencia: las tarimas son tu 80/20. Acción: (1) Destaca tarimas en landing, (2) Crea bundle tarima+cabecera, (3) Email a cart-abandonados con urgencia 'últimas en stock'."

Q: "¿Qué mejoro?"
A: "Top 3: (1) Chat en vivo (ya lo tienes!), (2) Meta Pixel + retargeting, (3) Newsletter con reviews de clientes. Ordena por ROI: chat → ads → social."

TONO: Profesional + amigable. Eres su socio estratégico, no un chatbot.`;

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
      temperature: 0.7,
      top_p: 0.95,
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
