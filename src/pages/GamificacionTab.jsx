import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function GamificacionTab({ adminKey }) {
  const { currencyFormatter } = useCatalog();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTelefono, setFiltroTelefono] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      let url = '/api/gamificacion';
      if (filtroTelefono) url += `?telefono=${encodeURIComponent(filtroTelefono)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${adminKey}` } });
      const data = await res.json();
      if (res.ok) {
        setRanking(data.ranking || (data.cliente ? [data.cliente] : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTelefono]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <p className="text-sm font-semibold text-purple-900">🎮 Sistema de Gamificación</p>
        <p className="mt-1 text-xs text-purple-800">Puntos + Badges + Ranking = Clientes enganchados</p>
      </div>

      <input
        type="tel"
        value={filtroTelefono}
        onChange={(e) => setFiltroTelefono(e.target.value)}
        placeholder="Buscar por teléfono..."
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
      />

      {loading ? (
        <p className="text-xs text-neutral-400">Cargando ranking...</p>
      ) : ranking.length === 0 ? (
        <p className="text-xs text-neutral-400">Sin datos</p>
      ) : (
        <div className="space-y-2">
          {ranking.map((cliente, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{'🥇🥈🥉'[cliente.posicion - 1] || '•'}</span>
                    <span className="font-semibold text-sm">{cliente.nombre}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {cliente.compras} compras · Nivel {cliente.nivel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{cliente.puntos}⭐</p>
                  <p className="text-xs text-neutral-500">puntos</p>
                </div>
              </div>
              {cliente.badges && cliente.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {cliente.badges.map((badge, j) => (
                    <span key={j} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
