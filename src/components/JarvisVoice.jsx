import { useState, useRef, useEffect } from 'react';

const ACTIONS = {
  generateDescription: 'generar descripción',
  generateEmail: 'generar email',
  analyzeSales: 'analizar ventas',
  suggestPrice: 'sugerir precio',
  seoAdvice: 'consejo seo',
};

export default function JarvisVoice() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola soy JARVIS 🤖 Puedo hablar contigo y ejecutar acciones.',
      audio: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    // Setup Web Speech API
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInput((prev) => prev + transcript);
          } else {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript) {
          setInput(interimTranscript);
        }
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function speakText(text) {
    if (!synthRef.current) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  }

  function startListening() {
    if (recognitionRef.current) {
      setInput('');
      recognitionRef.current.start();
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }

  async function handleSend(text) {
    const message = text || input;
    if (!message.trim()) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      // Detectar si es una acción ejecutable
      const action = detectAction(message);

      let response;
      if (action) {
        response = await executeAction(action, message);
      } else {
        response = await callJarvisAPI(message);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response, audio: true },
      ]);

      // Hablar la respuesta
      speakText(response);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = '❌ Error procesando solicitud.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMsg },
      ]);
    }

    setLoading(false);
  }

  function detectAction(text) {
    const lower = text.toLowerCase();
    for (const [key, trigger] of Object.entries(ACTIONS)) {
      if (lower.includes(trigger)) return key;
    }
    return null;
  }

  async function executeAction(action, context) {
    // Aquí van acciones específicas que JARVIS puede ejecutar
    switch (action) {
      case 'generateDescription':
        return await generateDescription(context);
      case 'generateEmail':
        return await generateEmail(context);
      case 'analyzeSales':
        return '¿Cuántas órdenes tuviste este mes? Dame un número para analizar.';
      case 'suggestPrice':
        return 'Dime el costo actual y el de competencia para sugerir precio óptimo.';
      case 'seoAdvice':
        return await generateSEOAdvice(context);
      default:
        return 'Acción no reconocida. ¿Qué necesitas?';
    }
  }

  async function generateDescription(context) {
    // Extraer nombre del producto de la solicitud
    const prompt = `Genera una descripción profesional y atractiva para producto mencionado en: "${context}".
    Debe ser concisa (1-2 párrafos), persuasiva, con detalles de material y disponibilidad.`;

    return await callJarvisAPI(prompt);
  }

  async function generateEmail(context) {
    const prompt = `Redacta un email profesional basado en: "${context}".
    Debe ser conciso, con CTA clara, y en tono amigable pero profesional.`;

    return await callJarvisAPI(prompt);
  }

  async function generateSEOAdvice(context) {
    const prompt = `Dame 3 consejos SEO específicos para: "${context}".
    Incluye keywords, meta description sugerida, y tips prácticos.`;

    return await callJarvisAPI(prompt);
  }

  async function callJarvisAPI(message) {
    const response = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) throw new Error('Error en API');
    const data = await response.json();
    return data.reply;
  }

  if (!mounted) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all animate-pulse"
          title="Abrir JARVIS (voz + acciones)"
          aria-label="Admin voice assistant"
        >
          <span className="text-2xl">🎙️</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-96 h-[750px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-600">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-bold text-lg">🎙️ JARVIS VOICE</h3>
              <p className="text-xs text-purple-100">
                {isListening
                  ? '🎤 Escuchando...'
                  : isSpeaking
                    ? '🔊 Hablando...'
                    : 'Habla o escribe'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-2xl hover:opacity-80 transition flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-purple-200'
                  }`}
                >
                  {msg.content}
                  {msg.audio && msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="ml-2 text-xs opacity-70 hover:opacity-100"
                      title="Reproducir audio"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-lg border border-purple-200">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input */}
          <div className="border-t p-4 bg-white flex-shrink-0">
            <div className="flex gap-2 mb-3">
              {isListening ? (
                <button
                  onClick={stopListening}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <span className="text-xl">⏹️</span>
                  <span>Detener</span>
                </button>
              ) : (
                <button
                  onClick={startListening}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🎤</span>
                  <span>Habla</span>
                </button>
              )}

              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 transition flex-shrink-0"
              >
                📤
              </button>
            </div>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="O escribe algo..."
              disabled={loading}
              className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-3 bg-purple-50 border-t flex-shrink-0">
            <div className="text-xs text-purple-700 font-medium mb-2">
              Acciones:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setInput('Generar descripción para tarima queen')
                }
                className="text-xs bg-white hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition"
              >
                📝 Descripción
              </button>
              <button
                onClick={() => setInput('Generar email de bienvenida')}
                className="text-xs bg-white hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition"
              >
                ✉️ Email
              </button>
              <button
                onClick={() => setInput('Consejo SEO para tarimas')}
                className="text-xs bg-white hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition"
              >
                🔍 SEO
              </button>
              <button
                onClick={() => setInput('Analizar mis ventas')}
                className="text-xs bg-white hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition"
              >
                📊 Análisis
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-purple-50 px-4 py-2 text-xs text-purple-700 border-t flex-shrink-0">
            💡 Habla natural: "genera descripción para...", "envía email...", etc.
          </div>
        </div>
      )}
    </>
  );
}
