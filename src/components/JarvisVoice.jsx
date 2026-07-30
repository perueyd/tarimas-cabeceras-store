import { useState, useRef, useEffect, useCallback } from 'react';

// Asistente de voz del panel. Dos formas de usarlo:
//
//  · Modo escribir  → como un chat normal, con botón de micrófono para dictar.
//  · Modo conversación → manos libres: escucha, responde hablando y vuelve a
//    escuchar sola, como el modo voz de las apps de móvil.
//
// Todo funciona con lo que trae el navegador (Web Speech API), sin ningún
// servicio de pago: reconocimiento de voz + voz sintética del sistema.
//
// LÍMITES CONOCIDOS, para que no sorprendan:
//  · Requiere Chrome, Edge u Opera. Firefox no reconoce voz.
//  · Mientras JARVIS habla, el micrófono se apaga. Si no, se oiría a sí mismo
//    y se respondería solo. Para cortarle, se toca el botón de interrumpir.
//  · La calidad de la voz es la que tenga instalada el sistema operativo.

const ACTIONS = {
  generateDescription: 'generar descripción',
  generateEmail: 'generar email',
  analyzeSales: 'analizar ventas',
  suggestPrice: 'sugerir precio',
  seoAdvice: 'consejo seo',
};

// Silencio tras el cual se da por terminada la frase y se envía.
const MS_SILENCIO = 1100;

// Lo que se ve en pantalla no es lo que conviene escuchar: los asteriscos,
// almohadillas y emojis se leerían literalmente ("asterisco asterisco hola").
function limpiarParaVoz(texto) {
  return String(texto || '')
    .replace(/```[\s\S]*?```/g, ' Te lo dejo escrito en pantalla. ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [texto](enlace) -> texto
    .replace(/https?:\/\/\S+/g, ' el enlace que ves en pantalla ')
    .replace(/[*_`#>|]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Corta el texto en frases para poder ir hablando mientras el resto se
// escribe. Devuelve [frasesCompletas, restoPendiente].
function partirFrases(buffer) {
  const frases = [];
  let resto = buffer;
  const re = /[^.!?¿¡\n]+[.!?\n]+/g;
  let m;
  let ultimo = 0;
  while ((m = re.exec(buffer)) !== null) {
    const frase = m[0].trim();
    if (frase) frases.push(frase);
    ultimo = re.lastIndex;
  }
  resto = buffer.slice(ultimo);
  return [frases, resto];
}

// De todas las voces del sistema, la mejor para español latino. Las que
// llevan "Google" o "Natural" suelen sonar bastante mejor que las clásicas.
function elegirVoz() {
  const voces = window.speechSynthesis?.getVoices?.() || [];
  if (!voces.length) return null;
  const puntua = (v) => {
    const l = (v.lang || '').toLowerCase();
    const n = (v.name || '').toLowerCase();
    let p = 0;
    if (l.startsWith('es')) p += 10;
    else return -1;
    if (l.includes('pe')) p += 5;
    else if (l.includes('mx') || l.includes('us') || l.includes('419')) p += 4;
    else if (l.includes('co') || l.includes('ar') || l.includes('cl')) p += 3;
    if (n.includes('google')) p += 4;
    if (n.includes('natural') || n.includes('neural')) p += 4;
    if (n.includes('online')) p += 2;
    return p;
  };
  return voces.filter((v) => puntua(v) >= 0).sort((a, b) => puntua(b) - puntua(a))[0] || null;
}

export default function JarvisVoice({ adminKey }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [soportaVoz, setSoportaVoz] = useState(true);
  const [modoConversacion, setModoConversacion] = useState(false);
  // 'quieto' | 'escuchando' | 'pensando' | 'hablando'
  const [estado, setEstado] = useState('quieto');
  const [parcial, setParcial] = useState(''); // lo que se va oyendo, en vivo
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy JARVIS. Activa el modo conversación y hablamos.', audio: true },
  ]);
  const [input, setInput] = useState('');

  const recognitionRef = useRef(null);
  const vozRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Los callbacks del reconocimiento se crean una sola vez, así que leen el
  // estado por referencia: con useState verían siempre el valor inicial.
  const modoRef = useRef(false);
  const estadoRef = useRef('quieto');
  const finalRef = useRef('');
  const silencioRef = useRef(null);
  const hablandoRef = useRef(false);
  const colaRef = useRef([]);
  const mensajesRef = useRef(messages);

  useEffect(() => { mensajesRef.current = messages; }, [messages]);
  useEffect(() => { estadoRef.current = estado; }, [estado]);
  useEffect(() => { modoRef.current = modoConversacion; }, [modoConversacion]);

  const cambiarEstado = useCallback((e) => {
    estadoRef.current = e;
    setEstado(e);
  }, []);

  // ---------------------------------------------------------------- hablar

  const detenerVoz = useCallback(() => {
    colaRef.current = [];
    hablandoRef.current = false;
    try { window.speechSynthesis.cancel(); } catch { /* nada que cancelar */ }
  }, []);

  // Reproduce la cola de frases una tras otra. Al vaciarse, si el modo
  // conversación sigue activo, vuelve a abrir el micrófono.
  const seguirCola = useCallback(() => {
    if (hablandoRef.current) return;
    const frase = colaRef.current.shift();
    if (!frase) {
      if (estadoRef.current === 'hablando') {
        if (modoRef.current) escucharRef.current?.();
        else cambiarEstado('quieto');
      }
      return;
    }
    const u = new SpeechSynthesisUtterance(frase);
    if (vozRef.current) u.voice = vozRef.current;
    u.lang = vozRef.current?.lang || 'es-ES';
    u.rate = 1.05; // un pelín rápido: suena más natural que el ritmo por defecto
    u.pitch = 1;
    hablandoRef.current = true;
    u.onend = () => { hablandoRef.current = false; seguirCola(); };
    u.onerror = () => { hablandoRef.current = false; seguirCola(); };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      hablandoRef.current = false;
    }
  }, [cambiarEstado]);

  const encolar = useCallback((frase) => {
    const limpio = limpiarParaVoz(frase);
    if (!limpio) return;
    colaRef.current.push(limpio);
    seguirCola();
  }, [seguirCola]);

  const hablar = useCallback((texto) => {
    detenerVoz();
    cambiarEstado('hablando');
    const limpio = limpiarParaVoz(texto);
    if (!limpio) { cambiarEstado('quieto'); return; }
    // Se trocea igual que en streaming: frases sueltas suenan mejor que un
    // bloque enorme, y permiten cortar a la mitad si el dueño interrumpe.
    const [frases, resto] = partirFrases(limpio + '\n');
    [...frases, resto].forEach((f) => f.trim() && colaRef.current.push(f.trim()));
    seguirCola();
  }, [detenerVoz, cambiarEstado, seguirCola]);

  // -------------------------------------------------------------- escuchar

  const escucharRef = useRef(null);

  const escuchar = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    finalRef.current = '';
    setParcial('');
    try {
      rec.start();
      cambiarEstado('escuchando');
    } catch {
      // start() lanza si ya estaba arrancado: no es un fallo real.
    }
  }, [cambiarEstado]);

  useEffect(() => { escucharRef.current = escuchar; }, [escuchar]);

  const dejarDeEscuchar = useCallback(() => {
    clearTimeout(silencioRef.current);
    try { recognitionRef.current?.stop(); } catch { /* ya estaba parado */ }
  }, []);

  // ------------------------------------------------------------ enviar

  const enviarRef = useRef(null);

  async function handleSend(texto) {
    const message = (texto ?? input).trim();
    if (!message) return;

    dejarDeEscuchar();
    detenerVoz();
    setInput('');
    setParcial('');
    finalRef.current = '';

    const conVoz = modoRef.current;
    // El historial se congela AQUÍ, antes de tocar el estado. Si se leyera más
    // tarde dependería de cuándo React haya refrescado, y el mensaje recién
    // escrito podía faltar o venir duplicado.
    const historial = construirHistorial(message);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    cambiarEstado('pensando');

    try {
      const accion = detectAction(message);
      if (accion) {
        const r = await ejecutarAccion(accion, message, conVoz, historial);
        setMessages((prev) => [...prev, { role: 'assistant', content: r, audio: true }]);
        if (conVoz) hablar(r);
        else cambiarEstado('quieto');
        return;
      }

      if (conVoz) {
        await preguntarHablando(historial);
      } else {
        const r = await preguntar(historial, false);
        setMessages((prev) => [...prev, { role: 'assistant', content: r, audio: true }]);
        cambiarEstado('quieto');
      }
    } catch (error) {
      console.error('Error:', error);
      detenerVoz();
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${error.message}` }]);
      cambiarEstado('quieto');
      setModoConversacion(false); // no reintentar en bucle si el servidor falla
    }
  }

  useEffect(() => { enviarRef.current = handleSend; });

  // Pide la respuesta por partes y va hablando cada frase en cuanto está
  // completa, sin esperar al texto entero.
  async function preguntarHablando(historial) {
    const res = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey || ''}` },
      body: JSON.stringify({ messages: historial, voz: true }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'No se pudo contactar al asistente.');
    }

    cambiarEstado('hablando');
    // La posición del mensaje que se va rellenando se captura dentro del propio
    // setState, que es el único sitio donde la lista está garantizada al día.
    let idx = -1;
    setMessages((prev) => {
      idx = prev.length;
      return [...prev, { role: 'assistant', content: '', audio: true }];
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let completo = '';
    let pendiente = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const trozo = decoder.decode(value, { stream: true });
      completo += trozo;
      pendiente += trozo;

      const [frases, resto] = partirFrases(pendiente);
      pendiente = resto;
      frases.forEach(encolar);

      const texto = completo;
      setMessages((prev) => {
        const copia = [...prev];
        if (copia[idx]) copia[idx] = { ...copia[idx], content: texto };
        return copia;
      });
    }

    if (pendiente.trim()) encolar(pendiente);
    if (!completo.trim()) {
      setMessages((prev) => prev.filter((_, i) => i !== idx));
      throw new Error('El asistente no devolvió respuesta.');
    }
    seguirCola();
  }

  function construirHistorial(message) {
    const historial = mensajesRef.current
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
    return [...historial, { role: 'user', content: message }];
  }

  async function preguntar(historial, voz) {
    const res = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey || ''}` },
      body: JSON.stringify({ messages: historial, voz: !!voz }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'No se pudo contactar al asistente.');
    return data.reply;
  }

  function detectAction(text) {
    const lower = text.toLowerCase();
    for (const [key, trigger] of Object.entries(ACTIONS)) {
      if (lower.includes(trigger)) return key;
    }
    return null;
  }

  async function ejecutarAccion(accion, contexto, voz, historial) {
    const prompts = {
      generateDescription: `Genera una descripción profesional y atractiva para el producto mencionado en: "${contexto}". Concisa, persuasiva, con material y disponibilidad.`,
      generateEmail: `Redacta un email profesional basado en: "${contexto}". Conciso, con llamada a la acción clara, tono amigable.`,
      seoAdvice: `Dame 3 consejos SEO específicos para: "${contexto}". Incluye palabras clave y meta descripción sugerida.`,
    };
    if (prompts[accion]) {
      // Se sustituye el último turno (lo que dijo el dueño) por la instrucción
      // detallada, conservando el contexto de la conversación anterior.
      const conPrompt = [...historial.slice(0, -1), { role: 'user', content: prompts[accion] }];
      return await preguntar(conPrompt, voz);
    }
    if (accion === 'analyzeSales') return '¿Cuántos pedidos tuviste este mes? Dame el número y lo analizo.';
    if (accion === 'suggestPrice') return 'Dime tu costo actual y el precio de la competencia y te sugiero uno.';
    return '¿Qué necesitas?';
  }

  // ------------------------------------------------------------- arranque

  useEffect(() => {
    setMounted(true);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSoportaVoz(false); return; }

    const rec = new SR();
    rec.lang = 'es-PE';
    rec.continuous = true;      // no se corta sola tras cada frase
    rec.interimResults = true;  // texto en vivo mientras hablas
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      let interino = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += t + ' ';
        else interino += t;
      }
      setParcial(interino);
      setInput((finalRef.current + interino).trim());

      // Cada vez que sigue habiendo voz se reinicia la cuenta atrás: el envío
      // ocurre cuando dejas de hablar, no cuando el navegador decide cortar.
      clearTimeout(silencioRef.current);
      if (modoRef.current) {
        silencioRef.current = setTimeout(() => {
          const dicho = finalRef.current.trim();
          if (dicho) enviarRef.current?.(dicho);
        }, MS_SILENCIO);
      }
    };

    rec.onend = () => {
      // En modo conversación el micrófono se reabre solo, salvo que estemos
      // pensando o hablando (ahí se reabre al terminar de hablar).
      if (modoRef.current && estadoRef.current === 'escuchando') {
        try { rec.start(); } catch { /* aún cerrándose */ }
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return; // normal
      console.error('Speech recognition error:', event.error);
      const motivo = {
        'not-allowed': 'El navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones.',
        'service-not-allowed': 'El navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones.',
        'audio-capture': 'No encontré ningún micrófono conectado.',
        network: 'Sin conexión para procesar la voz. Puedes escribir.',
      }[event.error] || `No se pudo usar el micrófono (${event.error}).`;
      setModoConversacion(false);
      cambiarEstado('quieto');
      setMessages((prev) => [...prev, { role: 'assistant', content: `🎤 ${motivo}` }]);
    };

    // La lista de voces llega de forma asíncrona en algunos navegadores.
    const cargarVoz = () => { vozRef.current = elegirVoz(); };
    cargarVoz();
    window.speechSynthesis?.addEventListener?.('voiceschanged', cargarVoz);

    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', cargarVoz);
      clearTimeout(silencioRef.current);
      try { rec.abort(); } catch { /* ya cerrado */ }
      try { window.speechSynthesis.cancel(); } catch { /* nada sonando */ }
    };
  }, [cambiarEstado]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, parcial]);

  function alternarConversacion() {
    if (modoConversacion) {
      setModoConversacion(false);
      modoRef.current = false;
      dejarDeEscuchar();
      detenerVoz();
      cambiarEstado('quieto');
    } else {
      setModoConversacion(true);
      modoRef.current = true;
      escuchar();
    }
  }

  // Al cerrar hay que soltar el micrófono y callar la voz: si no, sigue
  // escuchando y hablando con el panel cerrado.
  function cerrar() {
    setModoConversacion(false);
    modoRef.current = false;
    dejarDeEscuchar();
    detenerVoz();
    cambiarEstado('quieto');
    setIsOpen(false);
  }

  // Corta a JARVIS a media frase y devuelve el turno al dueño.
  function interrumpir() {
    detenerVoz();
    if (modoRef.current) escuchar();
    else cambiarEstado('quieto');
  }

  if (!mounted) return null;

  const etiquetaEstado = {
    quieto: modoConversacion ? 'Modo conversación listo' : 'Escribe o toca el micrófono',
    escuchando: '🎤 Te escucho...',
    pensando: '💭 Pensando...',
    hablando: '🔊 Hablando...',
  }[estado];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          title="Abrir JARVIS (voz + acciones)"
          aria-label="Admin voice assistant"
        >
          <span className="text-2xl">🎙️</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 flex h-[680px] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border-2 border-purple-600 bg-white shadow-2xl">
          <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">🎙️ JARVIS</h3>
              <p className="truncate text-xs text-purple-100">{etiquetaEstado}</p>
            </div>
            <button
              onClick={cerrar}
              className="flex-shrink-0 text-2xl transition hover:opacity-80"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {!soportaVoz && (
            <div className="flex-shrink-0 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Este navegador no reconoce voz. Usa Chrome o Edge para hablar; aquí puedes escribir.
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-none bg-purple-600 text-white'
                      : 'rounded-bl-none border border-purple-200 bg-white text-gray-800'
                  }`}
                >
                  {msg.content || '…'}
                  {msg.audio && msg.role === 'assistant' && msg.content && (
                    <button
                      onClick={() => hablar(msg.content)}
                      className="ml-2 text-xs opacity-70 transition hover:opacity-100"
                      title="Escuchar de nuevo"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {parcial && (
              <div className="flex justify-end">
                <div className="max-w-xs rounded-lg rounded-br-none bg-purple-200 px-4 py-3 text-sm italic text-purple-900">
                  {parcial}
                </div>
              </div>
            )}

            {estado === 'pensando' && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-purple-200 bg-white px-4 py-3">
                  <div className="flex gap-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0.2s' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 border-t bg-white p-4">
            {/* Botón principal: activa/desactiva la conversación manos libres */}
            <button
              onClick={alternarConversacion}
              disabled={!soportaVoz}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition disabled:opacity-40 ${
                modoConversacion
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <span className={`text-xl ${estado === 'escuchando' ? 'animate-pulse' : ''}`}>
                {modoConversacion ? '⏹️' : '🎙️'}
              </span>
              <span>{modoConversacion ? 'Terminar conversación' : 'Modo conversación'}</span>
            </button>

            {estado === 'hablando' && (
              <button
                onClick={interrumpir}
                className="mb-3 w-full rounded-lg border border-purple-300 px-4 py-2 text-sm text-purple-700 transition hover:bg-purple-50"
              >
                ✋ Interrumpir y hablar yo
              </button>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={modoConversacion ? 'Habla y se envía sola…' : 'Escribe algo…'}
                className="flex-1 rounded-lg border border-purple-300 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="flex-shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700 disabled:opacity-40"
                aria-label="Enviar"
              >
                📤
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 border-t bg-purple-50 px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['📝 Descripción', 'Generar descripción para tarima queen'],
                ['✉️ Email', 'Generar email de bienvenida'],
                ['🔍 SEO', 'Consejo SEO para tarimas'],
                ['📊 Análisis', 'Analizar ventas'],
              ].map(([etiqueta, texto]) => (
                <button
                  key={etiqueta}
                  onClick={() => handleSend(texto)}
                  className="rounded border border-purple-200 bg-white px-2 py-1 text-xs transition hover:bg-purple-100"
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
