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

// Silencio tras el cual se da por terminada la frase y se envía.
const MS_SILENCIO = 1100;

// Espera entre que JARVIS deja de hablar y se reabre el micrófono, para que no
// capte la cola de su propia voz saliendo del altavoz.
const MS_PAUSA_TRAS_HABLAR = 400;

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

// Nombres de voz masculinos habituales en Windows/Chrome/Android. Se usan para
// dar preferencia a una voz de hombre, que es lo que se espera de JARVIS.
const NOMBRES_HOMBRE = /pablo|jorge|miguel|carlos|juan|diego|alvaro|álvaro|dalia_?male|male|hombre|enrique|liam|raul|raúl/i;

// Puntúa una voz para JARVIS: español LATINO primero (el dueño es de Perú y
// prefiere el acento neutro del doblaje, no el de España), voz de hombre, y
// motores modernos ("Natural"/"Neural"/Google) que suenan mucho menos robóticos.
export function puntuarVoz(v) {
  const l = (v.lang || '').toLowerCase();
  const n = (v.name || '').toLowerCase();
  if (!l.startsWith('es')) return -1;
  let p = 10;
  // Acento: Perú > resto de Latinoamérica > España.
  if (l.includes('pe')) p += 12;
  else if (l.includes('mx') || l.includes('419') || l.includes('us')) p += 10;
  else if (l.includes('co') || l.includes('cl') || l.includes('ar') || l.includes('ve')) p += 8;
  else if (l.includes('es')) p += 1; // España: último recurso
  // Calidad del motor.
  if (n.includes('natural') || n.includes('neural')) p += 8;
  if (n.includes('google')) p += 5;
  if (n.includes('online')) p += 2;
  // Voz de hombre.
  if (NOMBRES_HOMBRE.test(n)) p += 6;
  return p;
}

export function vocesDisponibles() {
  return (window.speechSynthesis?.getVoices?.() || [])
    .filter((v) => puntuarVoz(v) >= 0)
    .sort((a, b) => puntuarVoz(b) - puntuarVoz(a));
}

// Devuelve la voz guardada por el dueño, o la mejor disponible.
function elegirVoz() {
  const lista = vocesDisponibles();
  if (!lista.length) return null;
  try {
    const guardada = localStorage.getItem('jarvis-voz');
    if (guardada) {
      const v = lista.find((x) => x.name === guardada);
      if (v) return v;
    }
  } catch { /* sin localStorage: se usa la mejor */ }
  return lista[0];
}

export default function JarvisVoice({ adminKey, onNavegar }) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
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
  const velocidadRef = useRef(1.15);
  const [ajustes, setAjustes] = useState(false);
  const [voces, setVoces] = useState([]);
  const [vozNombre, setVozNombre] = useState('');
  // Se lee dentro de try/catch: en modo incógnito o con el almacenamiento
  // bloqueado por política del navegador, localStorage LANZA al leerlo, y al
  // hacerlo durante el render se llevaba por delante el panel entero.
  const [velocidad, setVelocidad] = useState(() => {
    try {
      const v = Number(localStorage.getItem('jarvis-velocidad'));
      return Number.isFinite(v) && v >= 0.7 && v <= 1.8 ? v : 1.15;
    } catch {
      return 1.15;
    }
  });
  const messagesEndRef = useRef(null);
  // Los callbacks del reconocimiento se crean una sola vez, así que leen el
  // estado por referencia: con useState verían siempre el valor inicial.
  const modoRef = useRef(false);
  const estadoRef = useRef('quieto');
  const finalRef = useRef('');
  const silencioRef = useRef(null);
  const hablandoRef = useRef(false);
  // Barrera contra el eco: solo cuando esto es true se hace caso a lo que
  // capta el micrófono. Se apaga ANTES de pedir parar el reconocimiento,
  // porque rec.stop() no es instantáneo y sigue entregando audio un rato.
  // Sin esto, JARVIS se oía a sí mismo por el altavoz, lo transcribía y se lo
  // reenviaba como si se lo hubiera dicho el dueño: un bucle infinito.
  const micPermitidoRef = useRef(false);
  const colaRef = useRef([]);
  const mensajesRef = useRef(messages);

  useEffect(() => { mensajesRef.current = messages; }, [messages]);
  useEffect(() => { estadoRef.current = estado; }, [estado]);
  useEffect(() => {
    velocidadRef.current = velocidad;
    try { localStorage.setItem('jarvis-velocidad', String(velocidad)); } catch { /* da igual */ }
  }, [velocidad]);
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

  // Mientras suene el altavoz, nada de lo que capte el micrófono cuenta.
  const cerrarMicrofono = useCallback(() => {
    micPermitidoRef.current = false;
    clearTimeout(silencioRef.current);
    finalRef.current = '';
    try { recognitionRef.current?.stop(); } catch { /* ya estaba parado */ }
  }, []);

  // Reproduce la cola de frases una tras otra. Al vaciarse, si el modo
  // conversación sigue activo, vuelve a abrir el micrófono.
  const seguirCola = useCallback(() => {
    if (hablandoRef.current) return;
    const frase = colaRef.current.shift();
    if (!frase) {
      if (estadoRef.current === 'hablando') {
        if (modoRef.current) {
          // Pequeña pausa antes de volver a abrir el micrófono: reabrirlo en
          // el mismo instante en que calla el altavoz hace que capte la cola
          // de la última palabra y se la reenvíe a sí mismo.
          setTimeout(() => {
            if (modoRef.current && estadoRef.current === 'hablando') escucharRef.current?.();
          }, MS_PAUSA_TRAS_HABLAR);
        } else {
          cambiarEstado('quieto');
        }
      }
      return;
    }
    const u = new SpeechSynthesisUtterance(frase);
    if (vozRef.current) u.voice = vozRef.current;
    u.lang = vozRef.current?.lang || 'es-MX';
    // El ritmo por defecto (1.0) suena lento y artificial al escucharlo seguido.
    // Ajustable por el dueño desde el panel de JARVIS.
    u.rate = velocidadRef.current;
    u.pitch = 0.95; // un punto más grave: más serio, estilo asistente de película
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
    cerrarMicrofono();
    cambiarEstado('hablando');
    const limpio = limpiarParaVoz(texto);
    if (!limpio) { cambiarEstado('quieto'); return; }
    // Se trocea igual que en streaming: frases sueltas suenan mejor que un
    // bloque enorme, y permiten cortar a la mitad si el dueño interrumpe.
    const [frases, resto] = partirFrases(limpio + '\n');
    [...frases, resto].forEach((f) => f.trim() && colaRef.current.push(f.trim()));
    seguirCola();
  }, [detenerVoz, cerrarMicrofono, cambiarEstado, seguirCola]);

  // -------------------------------------------------------------- escuchar

  const escucharRef = useRef(null);

  const escuchar = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    // Se descarta lo captado mientras JARVIS hablaba: si algo se coló por el
    // altavoz, no debe salir enviado como si lo hubiera dicho el dueño.
    finalRef.current = '';
    setParcial('');
    clearTimeout(silencioRef.current);
    micPermitidoRef.current = true;
    try {
      rec.start();
      cambiarEstado('escuchando');
    } catch {
      // start() lanza si ya estaba arrancado: no es un fallo real.
      cambiarEstado('escuchando');
    }
  }, [cambiarEstado]);

  useEffect(() => { escucharRef.current = escuchar; }, [escuchar]);

  const dejarDeEscuchar = useCallback(() => {
    // El orden importa: primero se cierra la barrera, después se pide parar.
    micPermitidoRef.current = false;
    clearTimeout(silencioRef.current);
    finalRef.current = '';
    setParcial('');
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
      // Ya no hay "acciones" adivinadas por palabras clave: ahora es el propio
      // modelo el que decide qué herramienta usar, y se ejecuta de verdad
      // dentro de preguntar(). Antes esto solo cambiaba el texto del prompt y
      // hacía creer que había hecho algo.
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
  async function preguntarHablando(historialInicial) {
    let historial = historialInicial;
    let res;

    // Hasta 3 rondas de herramientas antes de que haya respuesta hablada. El
    // servidor responde en JSON cuando el modelo pide una acción (abrir una
    // sección, consultar ventas) y en texto cuando ya tiene algo que decir.
    for (let ronda = 0; ronda < 3; ronda++) {
      res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey || ''}` },
        body: JSON.stringify({ messages: historial, voz: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo contactar al asistente.');
      }

      // Texto: se sale del bucle y se lee en voz alta más abajo.
      if (!(res.headers.get('content-type') || '').includes('application/json')) break;

      const data = await res.json().catch(() => ({}));
      if (!data.tool_calls?.length) {
        // Respondió sin texto y sin acción: no hay nada que decir.
        if (data.reply) { hablar(data.reply); return; }
        throw new Error('El asistente no devolvió respuesta.');
      }

      const resultados = await Promise.all(
        data.tool_calls.map(async (ll) => ({
          role: 'tool',
          tool_call_id: ll.id,
          content: JSON.stringify(await ejecutarHerramienta(ll)),
        }))
      );
      historial = [
        ...historial,
        { role: 'assistant', content: data.reply || '', tool_calls: data.tool_calls },
        ...resultados,
      ];
      if (ronda === 2) throw new Error('Me enredé con esa petición. ¿Puedes decírmelo de otra forma?');
    }

    cerrarMicrofono(); // el altavoz va a sonar: micrófono fuera
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

  // Ejecuta de verdad lo que JARVIS pidió y devuelve el resultado real.
  // Las de navegación las hace el propio navegador; las de consulta van al
  // servidor porque necesitan la base de datos.
  async function ejecutarHerramienta(llamada) {
    let args = {};
    try { args = JSON.parse(llamada.function?.arguments || '{}'); } catch { /* sin argumentos */ }
    const nombre = llamada.function?.name;

    if (nombre === 'abrir_seccion') {
      const ok = onNavegar?.(args.seccion, args.subseccion);
      return ok
        ? { hecho: true, abierto: args.subseccion ? `${args.seccion} → ${args.subseccion}` : args.seccion }
        : { hecho: false, motivo: 'No existe esa sección del panel.' };
    }

    const res = await fetch('/api/jarvis-accion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey || ''}` },
      body: JSON.stringify({ accion: nombre, args }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error || 'No se pudo ejecutar.' };
    return data.resultado;
  }

  async function preguntar(historial, voz) {
    let mensajes = historial;

    // Hasta 3 rondas: el modelo pide herramientas, se ejecutan, y con el
    // resultado real redacta la respuesta. El tope evita quedarse en bucle.
    for (let ronda = 0; ronda < 3; ronda++) {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey || ''}` },
        body: JSON.stringify({ messages: mensajes, voz: !!voz }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo contactar al asistente.');

      if (!data.tool_calls?.length) return data.reply;

      const resultados = await Promise.all(
        data.tool_calls.map(async (ll) => ({
          role: 'tool',
          tool_call_id: ll.id,
          content: JSON.stringify(await ejecutarHerramienta(ll)),
        }))
      );

      mensajes = [
        ...mensajes,
        { role: 'assistant', content: data.reply || '', tool_calls: data.tool_calls },
        ...resultados,
      ];
    }
    return 'Me enredé con esa petición. ¿Puedes decírmelo de otra forma?';
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
      // Si la barrera está cerrada, lo que llega es eco del altavoz o restos
      // de audio de antes de parar: se tira sin mirarlo.
      if (!micPermitidoRef.current || estadoRef.current !== 'escuchando') return;
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
      // El navegador corta el reconocimiento cada cierto tiempo por su cuenta;
      // en modo conversación hay que reabrirlo. Pero SOLO si la barrera sigue
      // abierta: antes se comprobaba el estado, que todavía no había cambiado
      // a "pensando", así que reabría el micrófono justo cuando JARVIS iba a
      // hablar y se oía a sí mismo.
      if (modoRef.current && micPermitidoRef.current) {
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
    const cargarVoz = () => {
      vozRef.current = elegirVoz();
      setVoces(vocesDisponibles());
      setVozNombre(vozRef.current?.name || '');
    };
    cargarVoz();
    window.speechSynthesis?.addEventListener?.('voiceschanged', cargarVoz);

    return () => {
      // El orden importa: abort() dispara onend, y onend reabre el micrófono
      // si la barrera sigue abierta. Sin cerrarla antes, el reconocimiento se
      // volvía a arrancar DESPUÉS de desmontar el componente y el micrófono
      // seguía grabando aunque el dueño ya hubiera salido del panel.
      modoRef.current = false;
      micPermitidoRef.current = false;
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

  // Minimizar NO interrumpe nada: el panel se encoge a una barra pequeña y
  // JARVIS sigue escuchando y respondiendo. Sirve para dictar mientras se
  // trabaja en el panel sin tener la ventana encima.
  function minimizar() {
    setIsOpen(false);
    setMinimizado(true);
  }

  function restaurar() {
    setMinimizado(false);
    setIsOpen(true);
  }

  // Cerrar sí suelta el micrófono y calla la voz (si no, seguiría escuchando
  // con el panel cerrado). La conversación NO se borra: al volver a abrir
  // sigue donde estaba.
  function cerrar() {
    setModoConversacion(false);
    modoRef.current = false;
    dejarDeEscuchar();
    detenerVoz();
    cambiarEstado('quieto');
    setMinimizado(false);
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
      {/* Cerrado del todo: solo el botón redondo. */}
      {!isOpen && !minimizado && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          title="Abrir JARVIS (voz + acciones)"
          aria-label="Admin voice assistant"
        >
          <span className="text-2xl">🎙️</span>
          {messages.length > 1 && (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" />
          )}
        </button>
      )}

      {/* Minimizado: barra pequeña que SIGUE escuchando y hablando. */}
      {minimizado && (
        <button
          onClick={restaurar}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 py-2.5 pl-3 pr-5 text-white shadow-lg transition hover:shadow-xl"
          title="Volver a abrir JARVIS"
        >
          <span className={`text-xl ${estado === 'escuchando' ? 'animate-pulse' : ''}`}>
            {estado === 'escuchando' ? '🎤' : estado === 'hablando' ? '🔊' : estado === 'pensando' ? '💭' : '🎙️'}
          </span>
          <span className="text-sm font-medium">{etiquetaEstado}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 flex h-[680px] max-h-[calc(100vh-3rem)] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border-2 border-purple-600 bg-white shadow-2xl">
          <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">🎙️ JARVIS</h3>
              <p className="truncate text-xs text-purple-100">{etiquetaEstado}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => setAjustes((v) => !v)}
                className="rounded px-2 py-1 text-lg leading-none transition hover:bg-white/20"
                title="Voz y velocidad"
                aria-label="Ajustes de voz"
              >
                ⚙️
              </button>
              <button
                onClick={minimizar}
                className="rounded px-2 pb-1.5 text-2xl leading-none transition hover:bg-white/20"
                title="Minimizar (sigue escuchando)"
                aria-label="Minimizar"
              >
                –
              </button>
              <button
                onClick={cerrar}
                className="rounded px-2 py-1 text-xl leading-none transition hover:bg-white/20"
                title="Cerrar (la conversación se guarda)"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          {!soportaVoz && (
            <div className="flex-shrink-0 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Este navegador no reconoce voz. Usa Chrome o Edge para hablar; aquí puedes escribir.
            </div>
          )}

          {ajustes && (
            <div className="flex-shrink-0 space-y-3 border-b bg-purple-50 px-4 py-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-purple-900">Voz</span>
                <select
                  value={vozNombre}
                  onChange={(e) => {
                    const v = voces.find((x) => x.name === e.target.value);
                    vozRef.current = v || null;
                    setVozNombre(e.target.value);
                    try { localStorage.setItem('jarvis-voz', e.target.value); } catch { /* da igual */ }
                  }}
                  className="w-full rounded-lg border border-purple-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-purple-600"
                >
                  {voces.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} · {v.lang}
                    </option>
                  ))}
                </select>
                {/* Solo hay voces de España instaladas: se avisa de cómo poner
                    las latinas, que es lo que el dueño prefiere oír. */}
                {voces.length > 0 && voces.every((v) => (v.lang || '').toLowerCase().includes('es-es')) && (
                  <span className="mt-1 block text-xs text-purple-700">
                    Solo tienes voces de España. Para el acento latino: Inicio → Configuración → Hora e
                    idioma → Voz → <strong>Agregar voces</strong> → «Español (México)» o «Español (Perú)».
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-purple-900">
                  Velocidad: {velocidad.toFixed(2)}×
                </span>
                <input
                  type="range"
                  min="0.8"
                  max="1.6"
                  step="0.05"
                  value={velocidad}
                  onChange={(e) => setVelocidad(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </label>

              <button
                onClick={() => hablar('Sistemas en línea. ¿En qué puedo ayudarte con la tienda?')}
                className="w-full rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs transition hover:bg-purple-100"
              >
                🔊 Escuchar una prueba
              </button>
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
