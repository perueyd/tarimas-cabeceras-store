import Groq from 'groq-sdk';
import { checkAdminAuth } from './_auth.js';
import { clientIp, rateLimitRequest } from './_ratelimit.js';
import { HERRAMIENTAS, INSTRUCCIONES_ACCIONES } from './_jarvis-acciones.js';

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

TONO — importante, esto define quién eres:
Hablas como un mayordomo británico muy competente: sereno, educado, con una ironía seca y elegante. Nunca pierdes la calma ni te entusiasmas de más.
- Trátalo de "tú", en español neutro de Latinoamérica (nada de "vosotros" ni "vale").
- Permítete UN comentario ingenioso de vez en cuando, siempre breve y de humor seco. Nunca chistes fáciles, ni sarcasmo hiriente, ni bromas cuando la cosa es seria (dinero, un cliente molesto, un error grave).
- Si te pide algo imposible o absurdo, señálalo con elegancia y ofrece la alternativa.
- Primero resuelves, luego bromeas. La broma nunca sustituye la respuesta.

Ejemplo de tono: "Las ventas de tarimas duplican a las de cabeceras. Yo pondría las tarimas primero en la portada, aunque reconozco que mi opinión estética no ha sido nunca muy solicitada."

Eres su socio estratégico, no un chatbot.`;

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

  // Se aceptan turnos de conversación normales, y además los mensajes de
  // herramienta ("tool") con el resultado real de una acción ya ejecutada.
  // Nunca "system": eso reemplazaría las instrucciones.
  const limpios = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'tool'))
    .slice(-12)
    .map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: String(m.tool_call_id || '').slice(0, 80),
          content: String(m.content ?? '').slice(0, 4000),
        };
      }
      const base = { role: m.role, content: String(m.content ?? '').slice(0, 2000) };
      // Un turno del asistente que pidió herramientas debe conservarlas, o el
      // modelo no entiende a qué responde el mensaje "tool" siguiente.
      if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
        base.tool_calls = m.tool_calls;
      }
      return base;
    });

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

  const instrucciones =
    SYSTEM_PROMPT + INSTRUCCIONES_ACCIONES + (modoVoz ? PROMPT_VOZ : '');

  const peticion = {
    messages: [{ role: 'system', content: instrucciones }, ...limpios],
    model: MODELO,
    // Las herramientas son lo que le permite EJECUTAR de verdad en vez de
    // decir "ya te llevé" sin haber hecho nada.
    tools: HERRAMIENTAS,
    tool_choice: 'auto',
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
      // La conexión con Groq se abre ANTES de mandar cabeceras: si falla aquí
      // (clave mala, modelo retirado, límite), todavía se puede responder con
      // un error normal, que es lo que el navegador sabe interpretar.
      const stream = await groq.chat.completions.create({ ...peticion, stream: true });

      // El modelo hará UNA de dos cosas: escribir texto, o pedir herramientas
      // (para abrir una sección, consultar ventas...). Hasta saber cuál, no se
      // mandan cabeceras: si son herramientas hay que responder en JSON, y una
      // vez enviadas las cabeceras de texto ya no se puede cambiar.
      //
      // Sin esto, pedirle "llévame al catálogo" en modo voz devolvía un flujo
      // de texto VACÍO (solo llegaban trozos de herramienta) y el navegador
      // mostraba "El asistente no devolvió respuesta".
      const herramientas = [];
      let empezoTexto = false;

      try {
        for await (const parte of stream) {
          const delta = parte.choices?.[0]?.delta || {};

          // Los argumentos de una herramienta llegan troceados: hay que ir
          // pegándolos por índice hasta tener el JSON completo.
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0;
              herramientas[i] ||= { id: '', type: 'function', function: { name: '', arguments: '' } };
              if (tc.id) herramientas[i].id = tc.id;
              if (tc.function?.name) herramientas[i].function.name = tc.function.name;
              if (tc.function?.arguments) herramientas[i].function.arguments += tc.function.arguments;
            }
          }

          if (delta.content) {
            if (!empezoTexto) {
              empezoTexto = true;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('X-Accel-Buffering', 'no'); // evita que un proxy lo acumule
            }
            res.write(delta.content);
          }
        }
      } catch (errStream) {
        console.error('Jarvis: el stream de Groq se cortó:', errStream?.message);
        if (empezoTexto) {
          // Las cabeceras ya salieron: solo se puede avisar en texto y cerrar.
          try { res.write(' … perdona, se me cortó la conexión.'); } catch { /* ya cerrada */ }
          try { res.end(); } catch { /* ya cerrada */ }
          return;
        }
        return res.status(503).json({ error: 'Se cortó la conexión con el asistente. Inténtalo otra vez.' });
      }

      if (empezoTexto) {
        try { res.end(); } catch { /* ya cerrada */ }
        return;
      }

      // No hubo texto: o pidió herramientas, o no dijo nada.
      const llamadas = herramientas.filter((h) => h?.function?.name);
      if (llamadas.length) {
        return res.status(200).json({ reply: '', tool_calls: llamadas });
      }
      return res.status(200).json({ reply: '' });
    }

    const chatCompletion = await groq.chat.completions.create(peticion);
    const mensaje = chatCompletion.choices[0]?.message || {};

    // Si el modelo decidió usar herramientas, se devuelven al navegador para
    // que las ejecute de verdad (abrir una sección, consultar ventas...) y
    // vuelva con el resultado. Esto es lo que hace que JARVIS EJECUTE en vez
    // de limitarse a decir que lo hizo.
    if (Array.isArray(mensaje.tool_calls) && mensaje.tool_calls.length) {
      return res.status(200).json({
        reply: mensaje.content || '',
        tool_calls: mensaje.tool_calls,
      });
    }

    return res.status(200).json({ reply: mensaje.content || '' });
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
