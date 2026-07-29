import { useState, useRef, useEffect } from 'react';

const QUICK_PROMPTS = [
  { emoji: '📝', label: 'Descripción', prompt: 'Genera descripción profesional para: ' },
  { emoji: '✉️', label: 'Email', prompt: 'Redacta email para clientes: ' },
  { emoji: '🔍', label: 'SEO', prompt: 'Mejora SEO para: ' },
  { emoji: '💡', label: 'Ideas', prompt: 'Dame 3 ideas para: ' },
];

function JarvisContent({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola, soy JARVIS 🤖\n\nPuedo ayudarte con:\n• Descripción de productos\n• Redacción de emails\n• Análisis y recomendaciones\n• Configuración del panel\n• SEO y marketing\n\n¿Qué necesitas?',
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

  async function handleSend(text) {
    const message = text || input;
    if (!message.trim()) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
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

      if (!response.ok) throw new Error('Error en respuesta');

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
          content: '❌ Error. Intenta de nuevo o contacta soporte.',
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-600">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-lg">🤖 JARVIS</h3>
          <p className="text-xs text-purple-100">Admin Assistant Pro</p>
        </div>
        <button
          onClick={onClose}
          className="text-2xl hover:opacity-80 transition flex-shrink-0"
          title="Cerrar JARVIS"
        >
          ✕
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
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

      {/* Quick Actions */}
      {!loading && messages.length <= 1 && (
        <div className="px-4 py-2 flex-shrink-0 grid grid-cols-2 gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setInput(item.prompt);
              }}
              className="px-3 py-2 text-xs rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition flex items-center gap-1"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

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
          placeholder="Pregunta algo..."
          disabled={loading}
          className="flex-1 border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 disabled:opacity-50"
          autoFocus
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex-shrink-0"
          title="Enviar"
        >
          ✉️
        </button>
      </div>

      {/* Footer */}
      <div className="bg-purple-50 px-4 py-2 text-xs text-purple-700 border-t flex-shrink-0">
        💡 Tip: Sé específico para mejores respuestas
      </div>
    </div>
  );
}

export default function JarvisAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          title="Abrir JARVIS (asistente admin)"
          aria-label="Admin assistant"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {isOpen && <JarvisContent onClose={() => setIsOpen(false)} />}
    </>
  );
}
