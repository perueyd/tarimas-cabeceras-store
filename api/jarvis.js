import Groq from 'groq-sdk';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Ver nota en api/chatbot.js: Groq retira modelos cada cierto tiempo.
const MODELO = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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

// Cuando la respuesta se va a ESCUCHAR y no a leer, las reglas cambian: los
// asteriscos, guiones y emojis se leen en voz alta y suenan ridículos, y un
// párrafo largo es insoportable de oír. Estas instrucciones se añaden a las
// de arriba solo en modo voz.
const PROMPT_VOZ = `

🔊 MODO VOZ ACTIVO — tu respuesta se va a REPRODUCIR EN VOZ ALTA:
- Escribe como HABLARÍAS, no como escribirías. Nada de listas ni viñetas.
- NUNCA uses asteriscos, almohadillas, guiones de lista, emojis ni tablas: se leen en voz alta.
- Máximo 3 frases por respuesta. Si el tema da para más, di lo esencial y pregunta si quiere que amplíes.
- Nada de direcciones web largas. Di "te lo dejo escrito en pantalla" si hace falta un enlace.
- Números redondos y en palabras cuando sea natural ("unos ciento veinte soles").
- Termina con una pregunta corta cuando tenga sentido seguir la conversación.`;

export default async function handler(req, res) {
  // NO se ponen cabeceras CORS: JARVIS es del panel, que vive en este mismo
  // dominio. Antes tenía Access-Control-Allow-Origin '*', que autorizaba a
  // cualquier web del mundo a llamarlo y gastar la cuota gratis de Groq.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // JARVIS es SOLO para el dueño. Esconder el botón no basta: la dirección
  // /api/jarvis seguía respondiendo a cualquiera que la llamara directamente.
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (await rateLimitRequest(`jarvis:${clientIp(req)}`, 60, 3600)) {
    return res.status(429).json({ error: 'Demasiadas consultas seguidas. Espera un momento.' });
  }

  // `voz: true` cambia dos cosas: el estilo de la respuesta (frases cortas, sin
  // símbolos que se lean raro) y la forma de entregarla (por partes, para que
  // JARVIS empiece a hablar sin esperar a tener el texto completo).
  const { messages, voz } = req.body || {};
  const modoVoz = voz === true;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta la lista de mensajes.' });
  }

  // Se aceptan solo turnos de conversación normales y de largo acotado: así
  // nadie puede colar un mensaje "system" que reemplace las instrucciones.
  const limpios = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-10)
    .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, 2000) }));

  if (!limpios.length) {
    return res.status(400).json({ error: 'Falta la lista de mensajes.' });
  }

  // El texto de ejemplo del .env es "verdadero" pero no sirve como clave.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.startsWith('gsk_') || apiKey.includes('YOUR_KEY')) {
    return res.status(503).json({
      error: 'Falta configurar GROQ_API_KEY. Sácala gratis en https://console.groq.com/keys y ponla en las variables de entorno de Vercel (o en .env.local para probar en tu computadora).',
    });
  }

  const peticion = {
    messages: [
      { role: 'system', content: modoVoz ? SYSTEM_PROMPT + PROMPT_VOZ : SYSTEM_PROMPT },
      ...limpios,
    ],
    model: MODELO,
    max_tokens: modoVoz ? 300 : 1024, // hablando, las respuestas largas cansan
    temperature: 0.7,
    top_p: 0.95,
  };

  try {
    // En modo voz la respuesta se manda por partes según Groq la va generando.
    // Así el navegador puede empezar a leer la primera frase mientras el resto
    // todavía se está escribiendo, que es lo que hace que suene a conversación
    // y no a "esperar a que cargue".
    if (modoVoz) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no'); // evita que un proxy lo acumule

      const stream = await groq.chat.completions.create({ ...peticion, stream: true });
      for await (const parte of stream) {
        const texto = parte.choices?.[0]?.delta?.content;
        if (texto) res.write(texto);
      }
      return res.end();
    }

    const chatCompletion = await groq.chat.completions.create(peticion);
    const reply = chatCompletion.choices[0]?.message?.content || '';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Jarvis error:', error);

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Llegaste al límite de consultas por minuto del plan gratuito. Espera unos segundos.',
      });
    }
    if (error.status === 401) {
      return res.status(503).json({
        error: 'La GROQ_API_KEY no es válida. Genera una nueva en https://console.groq.com/keys',
      });
    }
    if (error.status === 404 || error.status === 400) {
      return res.status(503).json({
        error: `Groq ya no ofrece el modelo "${MODELO}". Actualiza la constante MODELO en api/jarvis.js con uno de https://console.groq.com/docs/models`,
      });
    }

    return res.status(500).json({
      error: 'No se pudo procesar la consulta. Intenta de nuevo en un momento.',
    });
  }
}
