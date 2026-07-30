import Groq from 'groq-sdk';
import { clientIp, rateLimitRequest } from './_ratelimit.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Modelo de Groq. OJO: Groq retira modelos viejos cada cierto tiempo y entonces
// la respuesta pasa a ser un error 404/400 aunque la clave sea correcta.
// Si algún día el chat deja de responder, revisa https://console.groq.com/docs/models
// y cambia este valor (o define GROQ_MODEL en las variables de Vercel).
const MODELO = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
  // Sin cabeceras CORS: el chat vive en esta misma web. Antes estaba abierto a
  // '*', o sea que cualquier página ajena podía usarlo como IA gratis y dejar
  // sin cuota a los clientes de verdad.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Es público a propósito (lo usan los clientes), pero con tope por IP: sin
  // esto, un bucle de peticiones agota los 25 mensajes/minuto del plan gratis
  // y el chat deja de responder a los clientes reales.
  if (await rateLimitRequest(`chatbot:${clientIp(req)}`, 40, 3600)) {
    return res.status(429).json({
      error: 'Demasiados mensajes seguidos. Espera un momento o escríbenos por WhatsApp: +51951278010',
    });
  }

  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Falta la lista de mensajes.' });
  }

  // Solo turnos normales y de largo acotado: impide que alguien cuele un
  // mensaje "system" y convierta al bot de la tienda en otra cosa.
  const limpios = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-10)
    .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, 1000) }));

  if (!limpios.length) {
    return res.status(400).json({ error: 'Falta la lista de mensajes.' });
  }

  // La clave sin configurar suele quedarse como el texto de ejemplo del
  // archivo .env, que es "verdadero" pero no sirve: hay que descartarlo aquí
  // o el error llega al cliente disfrazado de fallo del servidor.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.startsWith('gsk_') || apiKey.includes('YOUR_KEY')) {
    return res.status(503).json({
      error: 'El asistente no está configurado todavía. Escríbenos por WhatsApp: +51951278010',
    });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...limpios,
      ],
      model: MODELO,
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
        error: 'Hay muchas consultas ahora mismo. Espera unos segundos e intenta de nuevo.',
      });
    }
    if (error.status === 401) {
      return res.status(503).json({
        error: 'El asistente no está configurado todavía. Escríbenos por WhatsApp: +51951278010',
      });
    }
    // 404/400 casi siempre significa que Groq retiró el modelo: hay que
    // actualizar MODELO arriba. Se avisa en el log para poder diagnosticarlo.
    if (error.status === 404 || error.status === 400) {
      console.error(`El modelo "${MODELO}" no está disponible en Groq. Actualízalo en api/chatbot.js.`);
      return res.status(503).json({
        error: 'El asistente no está disponible ahora. Escríbenos por WhatsApp: +51951278010',
      });
    }

    return res.status(500).json({
      error: 'No pudimos procesar tu mensaje. Escríbenos por WhatsApp: +51951278010',
    });
  }
}
