import { useState } from 'react';

export default function AITab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const ai = cfg.ai || {};
  const [data, setData] = useState({
    aiActivo: ai.aiActivo !== false,
    chatbotActivo: ai.chatbotActivo !== false,
    emailAutoActivo: ai.emailAutoActivo !== false,
    openaiKey: ai.openaiKey || '',
    recomendacionesMaximo: ai.recomendacionesMaximo || 5,
    umbralChurn: ai.umbralChurn || 60,
    diasInactividadChurn: ai.diasInactividadChurn || 30,
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, ai: data }),
      });
      if (res.ok) flash('Configuración de IA actualizada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-900">
        Sistema inteligente: recomendaciones automáticas, chatbot, emails personalizados y predicción de churn.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Funcionalidades IA</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.aiActivo}
              onChange={(e) => setData({ ...data, aiActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🤖 Recomendaciones automáticas (producto A → también compran B)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.chatbotActivo}
              onChange={(e) => setData({ ...data, chatbotActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">💬 Chatbot IA (responde preguntas automáticamente)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.emailAutoActivo}
              onChange={(e) => setData({ ...data, emailAutoActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">📧 Emails automáticos personalizados</span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Configuración IA</h3>
        <div className="space-y-3">
          <label className="block text-xs">
            <span className="text-neutral-600">Clave OpenAI (para chatbot y análisis)</span>
            <input
              type="password"
              value={data.openaiKey}
              onChange={(e) => setData({ ...data, openaiKey: e.target.value })}
              placeholder="sk-..."
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
            />
            <span className="mt-1 block text-[11px] text-neutral-400">De: https://platform.openai.com/api-keys</span>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Máximo recomendaciones por cliente</span>
            <input
              type="number"
              value={data.recomendacionesMaximo}
              onChange={(e) => setData({ ...data, recomendacionesMaximo: parseInt(e.target.value) })}
              min="1"
              max="20"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Días sin comprar para considerar churn</span>
            <input
              type="number"
              value={data.diasInactividadChurn}
              onChange={(e) => setData({ ...data, diasInactividadChurn: parseInt(e.target.value) })}
              min="7"
              max="180"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Umbral de riesgo de churn (%)</span>
            <input
              type="number"
              value={data.umbralChurn}
              onChange={(e) => setData({ ...data, umbralChurn: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
        <p className="font-medium">📊 Qué hace la IA:</p>
        <ul className="mt-2 list-inside space-y-1">
          <li>✅ Analiza compras históricas</li>
          <li>✅ Identifica patrones "quién compra qué"</li>
          <li>✅ Detecta clientes en riesgo (churn)</li>
          <li>✅ Genera ofertas personalizadas</li>
          <li>✅ Responde FAQs automáticamente</li>
        </ul>
      </section>

      <button
        onClick={guardar}
        disabled={saving}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
