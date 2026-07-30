import { useState, useRef, useEffect } from 'react';

// `messages` vive en el componente padre a propósito: este panel se desmonta
// al cerrarlo, así que si el estado estuviera aquí la conversación se perdería
// entera cada vez que el cliente lo cierra sin querer.
function ChatWidgetContent({ onClose, messages, setMessages, reiniciar }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Se envía el historial MÁS la pregunta recién escrita. Antes solo se
      // mandaba el historial del estado, que todavía no la incluía, así que el
      // bot nunca llegaba a leer lo que preguntaba el cliente.
      const historial = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...historial, { role: 'user', content: userMessage }],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'No pudimos responder ahora mismo.');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${error.message}` },
      ]);
    }

    setLoading(false);
  }

  return (
    // En móvil ocupa toda la pantalla: una ventanita flotante de 384px en un
    // teléfono de 375px dejaba el texto apretado y el teclado tapaba el campo.
    // Se usa 100dvh (no vh) porque en el móvil la barra del navegador aparece
    // y desaparece: con vh el botón de enviar quedaba fuera de la pantalla.
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-2.5rem)] sm:w-96 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl"
         style={{ height: '100dvh', maxHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">🤖 CHAT-ED</h3>
          <p className="text-xs text-blue-100">Respuesta inmediata</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={reiniciar}
              className="rounded px-2 py-1 text-xs transition hover:bg-white/20"
              title="Empezar una conversación nueva"
            >
              ↺ Reiniciar
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-2xl leading-none transition hover:bg-white/20"
            title="Cerrar (la conversación se guarda)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-lg border border-gray-200">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-white flex gap-2 flex-shrink-0">
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
          placeholder="Escribe algo..."
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 disabled:opacity-50"
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex-shrink-0"
          title="Enviar"
        >
          📤
        </button>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-t flex-shrink-0">
        Powered by IA Groq • Para cotizar: +51951278010
      </div>
    </div>
  );
}

const SALUDO = {
  role: 'assistant',
  content: '👋 Hola! Soy CHAT-ED, asistente de E|D Espacios. ¿En qué puedo ayudarte?',
};

// La charla se guarda en el navegador para que recargar la página no la borre.
// Caduca a las 4 horas SIN ACTIVIDAD: quien está comparando muebles suele
// volver a la pestaña un rato después, y perder el hilo a los pocos minutos
// obliga a repetirlo todo. Se usa sessionStorage, así que al cerrar el
// navegador desaparece igualmente (en una computadora compartida, la
// conversación de una persona no le queda a la vista de la siguiente).
const CLAVE = 'ed-chat';
const HORAS_VIDA = 4;

function leerGuardado() {
  try {
    const raw = sessionStorage.getItem(CLAVE);
    if (!raw) return null;
    const { mensajes, ultimo } = JSON.parse(raw);
    if (!Array.isArray(mensajes) || !ultimo) return null;
    if (Date.now() - ultimo > HORAS_VIDA * 3600 * 1000) {
      sessionStorage.removeItem(CLAVE);
      return null;
    }
    return mensajes;
  } catch {
    return null;
  }
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // La conversación se guarda aquí, fuera del panel, para que cerrar no la
  // borre: el cliente puede cerrar sin querer y volver donde lo dejó.
  const [messages, setMessages] = useState([SALUDO]);

  // Se recupera después de montar, no en el useState inicial: leer
  // sessionStorage durante el primer render rompe si algún día se renderiza
  // en el servidor.
  useEffect(() => {
    const guardado = leerGuardado();
    if (guardado?.length) setMessages(guardado);
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return; // no se guarda solo el saludo
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify({ mensajes: messages, ultimo: Date.now() }));
    } catch { /* modo incógnito o almacenamiento lleno: no pasa nada */ }
  }, [messages]);

  function reiniciar() {
    setMessages([SALUDO]);
    try { sessionStorage.removeItem(CLAVE); } catch { /* da igual */ }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;


  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          // Justo ENCIMA del botón de WhatsApp. Antes los dos estaban en la
          // esquina inferior derecha casi en la misma posición, así que el
          // chat tapaba el de WhatsApp y no se podía tocar.
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          title="Abrir chat (IA responde al instante)"
          aria-label="Chat support"
        >
          <span className="text-2xl">💬</span>
          {/* Aviso de que la charla sigue ahí donde se dejó. */}
          {messages.length > 1 && (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" />
          )}
        </button>
      )}

      {isOpen && (
        <ChatWidgetContent
          onClose={() => setIsOpen(false)}
          messages={messages}
          setMessages={setMessages}
          reiniciar={reiniciar}
        />
      )}
    </>
  );
}
