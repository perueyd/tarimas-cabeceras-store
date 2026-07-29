import { useState, useRef, useEffect } from 'react';

export default function JarvisAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '🤖 JARVIS aquí. Soy tu asistente de administración. Puedo ayudarte con:\n• Generación de descripciones de productos\n• Análisis de datos y recomendaciones\n• Gestión de inventory\n• Redacción de emails\n• Consejos sobre configuración\n\n¿En qué puedo asistirte?',
    },
  ]);
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

      if (!response.ok) {
        throw new Error('Error en respuesta');
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '❌ Error procesando solicitud. Por favor, intenta nuevamente.',
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <>
      {/* Botón flotante en admin */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="Abrir Jarvis"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {/* Panel Jarvis */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-600">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">🤖 JARVIS</h3>
              <p className="text-xs text-purple-100">Admin Assistant</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-2xl hover:opacity-80 transition"
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
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-purple-200'
                  }`}
                >
                  {msg.content}
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

          {/* Input */}
          <div className="border-t p-4 bg-white flex gap-2">
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
              placeholder="Pregunta algo..."
              disabled={loading}
              className="flex-1 border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              📤
            </button>
          </div>

          {/* Tips */}
          <div className="bg-purple-50 px-4 py-2 text-xs text-purple-700 border-t border-purple-200">
            💡 Prueba: "Genera descripción para [producto]" o "Análisis de ventas"
          </div>
        </div>
      )}
    </>
  );
}
