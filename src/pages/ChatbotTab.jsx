import { useState } from 'react';

// Entrenar el chatbot de la tienda sin tocar código.
//
// El bot NO se "entrena" como se entrena una IA de verdad (eso costaría dinero
// y días). Lo que se cambia aquí son sus INSTRUCCIONES: quién es, cómo habla y
// qué debe tener en cuenta. Los datos duros (productos, precios, colores,
// tamaños) los lee solo del catálogo en cada consulta, así que nunca se quedan
// desactualizados.

const PERSONALIDAD_POR_DEFECTO = `Eres el asistente de E|D Espacios y Diseño, una tienda peruana de muebles a medida.

Tu trabajo es ayudar a quien entra a la web: resolver dudas sobre productos, medidas, colores, precios y entrega, y acompañar hasta la compra.

TONO: cercano y directo, de tú, como un buen vendedor de tienda de barrio: amable pero sin rodeos. Respuestas cortas (2 o 3 frases).`;

const EJEMPLOS = [
  {
    titulo: 'Vendedor cercano (recomendado)',
    texto: PERSONALIDAD_POR_DEFECTO,
  },
  {
    titulo: 'Formal y de usted',
    texto: `Eres el asistente virtual de E|D Espacios y Diseño, tienda peruana de muebles a medida.

Atiendes consultas sobre productos, medidas, colores, precios y entregas.

TONO: formal y respetuoso, tratando siempre de usted. Respuestas breves y precisas, sin exceso de confianza.`,
  },
  {
    titulo: 'Enfocado en cerrar la venta',
    texto: `Eres el asistente de ventas de E|D Espacios y Diseño, tienda peruana de muebles a medida.

Tu objetivo es que la persona termine comprando o escribiendo por WhatsApp. Resuelve la duda concreta y luego propón el siguiente paso: ver el producto, pedir la medida a medida o cotizar por WhatsApp.

TONO: entusiasta y resolutivo, de tú. Máximo 3 frases, siempre terminando con una pregunta o una propuesta.`,
  },
];

export default function ChatbotTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const bot = cfg.bot || {};
  const [personalidad, setPersonalidad] = useState(bot.personalidad || PERSONALIDAD_POR_DEFECTO);
  const [extra, setExtra] = useState(bot.instruccionesExtra || '');
  const [saving, setSaving] = useState(false);

  // Prueba en vivo, para ver el efecto de un cambio antes de publicarlo.
  const [prueba, setPrueba] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [probando, setProbando] = useState(false);

  const productosVisibles = (catalog.products || []).filter((p) => !p.oculto).length;

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', {
        bot: {
          personalidad: personalidad.trim().slice(0, 3000),
          instruccionesExtra: extra.trim().slice(0, 2000),
        },
      });
      flash('Chatbot actualizado. Ya responde con las nuevas instrucciones.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function probar() {
    if (!prueba.trim()) return;
    setProbando(true);
    setRespuesta('');
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prueba.trim() }] }),
      });
      const data = await res.json().catch(() => ({}));
      setRespuesta(res.ok ? data.reply : `⚠️ ${data.error || 'No se pudo probar.'}`);
    } catch (err) {
      setRespuesta(`⚠️ ${err.message}`);
    } finally {
      setProbando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
        🤖 El bot lee <strong>solo</strong> lo que hay en tu catálogo. Ahora mismo conoce{' '}
        <strong>{productosVisibles} productos</strong> con sus precios, {(catalog.colors || []).length} colores
        y {(catalog.sizes || []).length} tamaños. Si cambias un precio, lo sabe al instante — no hay que
        volver a entrenarlo.
      </div>

      <section>
        <h3 className="text-lg font-semibold">Quién es y cómo habla</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Describe su papel y su tono. No hace falta poner precios ni productos aquí: eso lo saca solo.
        </p>
        <textarea
          value={personalidad}
          onChange={(e) => setPersonalidad(e.target.value)}
          rows={9}
          maxLength={3000}
          className="mt-3 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-ink"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
          <span>{personalidad.length} / 3000</span>
          <button onClick={() => setPersonalidad(PERSONALIDAD_POR_DEFECTO)} className="underline hover:text-ink">
            Restaurar el original
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EJEMPLOS.map((e) => (
            <button
              key={e.titulo}
              onClick={() => setPersonalidad(e.texto)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs transition hover:border-ink"
            >
              {e.titulo}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Cosas que debe saber o repetir</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Avisos, promociones del momento, formas de pago, zonas de reparto... Una línea por idea.
        </p>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder={'Ej.\n- Solo repartimos en Lima Metropolitana y Callao.\n- Si preguntan por provincia, deriva a WhatsApp.\n- Esta semana hay 10% en cabeceras.'}
          className="mt-3 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <p className="mt-1 text-xs text-neutral-400">{extra.length} / 2000</p>
      </section>

      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        ⚠️ Lo que el bot le diga a un cliente <strong>te compromete</strong>. Por eso tiene reglas fijas
        que no se pueden quitar desde aquí: no inventar precios, no prometer plazos ni garantías que no
        estén en tus datos, y no pedir nunca datos de tarjeta.
      </div>

      <button
        onClick={guardar}
        disabled={saving}
        className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar y publicar'}
      </button>

      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-semibold">Pruébalo</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Escribe lo que preguntaría un cliente. Ojo: prueba lo que está <strong>guardado</strong>, así que
          guarda antes si acabas de cambiar algo.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={prueba}
            onChange={(e) => setPrueba(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') probar(); }}
            placeholder="¿Cuánto cuesta una tarima queen?"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={probar}
            disabled={probando || !prueba.trim()}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {probando ? '...' : 'Probar'}
          </button>
        </div>
        {respuesta && (
          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-3 text-sm">
            {respuesta}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['¿Cuánto cuesta una tarima queen?', '¿Hacen medidas especiales?', '¿En cuánto llega a Surco?', '¿Qué colores tienen?'].map((q) => (
            <button
              key={q}
              onClick={() => setPrueba(q)}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs hover:border-ink"
            >
              {q}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
