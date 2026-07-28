import { useEffect, useState } from 'react';

const CANALES_DISPONIBLES = [
  { tipo: 'whatsapp', label: '💬 WhatsApp', desc: 'Mensajes directos' },
  { tipo: 'instagram', label: '📷 Instagram', desc: 'Stories + Direct' },
  { tipo: 'tiktok', label: '🎵 TikTok', desc: 'Videos + Shop' },
];

export default function OmniChannelTab({ adminKey }) {
  const [canales, setCanales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agregando, setAgregando] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/omnichannel', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar.');
      setCanales(data.canales || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function agregarCanal(tipo) {
    const res = await fetch('/api/omnichannel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({
        tipo,
        nombre: `Canal ${tipo}`,
        activo: true,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCanales([...canales, data.canal]);
      setAgregando(null);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-neutral-400">Cargando canales...</p>;

  const canalesNoAgregados = CANALES_DISPONIBLES.filter(
    (c) => !canales.find((x) => x.tipo === c.tipo)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-900">📱 Omnichannel Sync</p>
        <p className="mt-1 text-xs text-green-800">Mismo código en WhatsApp, Instagram y TikTok</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {canales.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Sin canales configurados. Agrega uno para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {canales.map((canal) => (
            <div key={canal.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3">
              <div>
                <p className="font-medium text-sm">{canal.tipo}</p>
                <p className="text-xs text-neutral-500">
                  {canal.activo ? '✓ Activo' : '✗ Inactivo'}
                </p>
              </div>
              <span className="text-lg">
                {canal.tipo === 'whatsapp' ? '💬' : canal.tipo === 'instagram' ? '📷' : '🎵'}
              </span>
            </div>
          ))}
        </div>
      )}

      {canalesNoAgregados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600">Agregar canal</p>
          {canalesNoAgregados.map((c) => (
            <button
              key={c.tipo}
              onClick={() => agregarCanal(c.tipo)}
              disabled={agregando === c.tipo}
              className="w-full flex items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm hover:border-ink disabled:opacity-50"
            >
              <div className="text-left">
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-neutral-500">{c.desc}</p>
              </div>
              <span>+</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          // Simular broadcast
          alert('🎉 Oferta broadcast a todos los canales\n✓ WhatsApp: 150 mensajes\n✓ Instagram: 85 Stories\n✓ TikTok: 42 videos');
        }}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        🚀 Broadcast Oferta Ahora
      </button>
    </div>
  );
}
