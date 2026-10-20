import Groq from 'groq-sdk';
import { clientIp, rateLimitRequest } from './_ratelimit.js';
import { construirConocimiento } from './_bot-conocimiento.js';
import { conModeloDisponible, listaDeModelos } from './_modelo-ia.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Modelo de Groq. OJO: Groq retira modelos viejos cada cierto tiempo y entonces
// la respuesta pasa a ser un error 404/400 aunque la clave sea correcta.
// Si algún día el chat deja de responder, revisa https://console.groq.com/docs/models
// y cambia este valor (o define GROQ_MODEL en las variables de Vercel).
// Groq apagó llama-3.3-70b-versatile el 16 de agosto de 2026 para las cuentas
// gratuitas y de desarrollo. Los dos asistentes llevaban caídos desde entonces
// devolviendo "no está disponible ahora", y nadie se enteró: el cliente solo
// veía un bot que no contestaba. Lo cazó 'npm run revisar-tienda'.
// Este es el reemplazo que recomienda el propio Groq.
// La lista de modelos y el reintento viven en api/_modelo-ia.js.

// El texto de instrucciones ya no vive aqui: se arma en cada consulta desde
// el catalogo real (precios, colores, tamanos) y desde lo que el dueno escriba
// en el panel. Ver api/_bot-conocimiento.js.

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
    const conocimiento = await construirConocimiento();
    // Si Groq apaga el modelo, se prueba el siguiente de la lista en esta
    // misma petición: el cliente recibe su respuesta igual y en el log queda
    // anotado cuál murió. Ver api/_modelo-ia.js.
    const { resultado: chatCompletion } = await conModeloDisponible((modelo) =>
      groq.chat.completions.create({
        messages: [{ role: 'system', content: conocimiento }, ...limpios],
        model: modelo,
        max_tokens: 512,
        temperature: 0.6,
        top_p: 0.9,
      })
    );

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
    // Llegar aquí con un 404/400 significa que se probaron TODOS los modelos
    // de la lista y Groq los ha retirado todos. Antes bastaba con que cayera
    // uno; ahora esto es de verdad excepcional, y por eso el log lo nombra.
    if (error.status === 404 || error.status === 400) {
      console.error(`Ningún modelo de IA respondió. Probados: ${listaDeModelos().join(', ')}.`);
      return res.status(503).json({
        error: 'El asistente no está disponible ahora. Escríbenos por WhatsApp: +51951278010',
      });
    }

    return res.status(500).json({
      error: 'No pudimos procesar tu mensaje. Escríbenos por WhatsApp: +51951278010',
    });
  }
}
