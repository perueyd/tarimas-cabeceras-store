// La ficha de un reclamo del Libro de Reclamaciones.
//
// Lleva su plazo a la vista porque la Ley 29571 da 30 días calendario para
// responder, y pasarse no es un despiste: es una infracción.

import { useState } from 'react';

export function ReclamoCard({ r, onResponder }) {
  const [respuesta, setRespuesta] = useState(r.respuesta || '');
  const [guardando, setGuardando] = useState(false);
  const diasRestantes = Math.ceil((new Date(r.fecha).getTime() + 30 * 86400000 - Date.now()) / 86400000);

  async function guardar() {
    if (!respuesta.trim()) return;
    setGuardando(true);
    try {
      await onResponder(r, respuesta.trim());
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{r.folio}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.tipo === 'Reclamo' ? 'bg-orange-100 text-orange-800' : 'bg-neutral-100 text-neutral-700'}`}>
            {r.tipo}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.estado === 'Respondido' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {r.estado}
          </span>
        </div>
      </div>

      {r.estado === 'Pendiente' && (
        <p className={`mt-1 text-xs ${diasRestantes < 0 ? 'font-medium text-red-600' : diasRestantes <= 5 ? 'font-medium text-amber-600' : 'text-neutral-400'}`}>
          {diasRestantes < 0 ? `⚠️ Vencido hace ${Math.abs(diasRestantes)} día(s)` : `Vence en ${diasRestantes} día(s)`}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p><span className="text-neutral-500">Nombre:</span> {r.consumidor?.nombre}</p>
        <p><span className="text-neutral-500">Documento:</span> {r.consumidor?.tipoDocumento} {r.consumidor?.numeroDocumento}</p>
        <p><span className="text-neutral-500">Teléfono:</span> {r.consumidor?.telefono}</p>
        <p><span className="text-neutral-500">Correo:</span> {r.consumidor?.email}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Domicilio:</span> {r.consumidor?.domicilio}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Sobre:</span> {r.bien?.tipo}{r.bien?.descripcion ? ` — ${r.bien.descripcion}` : ''}</p>
        <p className="sm:col-span-2"><span className="text-neutral-500">Fecha:</span> {new Date(r.fecha).toLocaleString('es-PE')}</p>
      </div>

      <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-sm">
        <p><span className="text-neutral-500">Detalle:</span> {r.detalle}</p>
        {r.pedido && <p><span className="text-neutral-500">Solicita:</span> {r.pedido}</p>}
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        {r.estado === 'Respondido' ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p className="text-xs font-medium text-green-800">Tu respuesta ({new Date(r.fechaRespuesta).toLocaleDateString('es-PE')}):</p>
            <p className="mt-1 text-neutral-700">{r.respuesta}</p>
          </div>
        ) : (
          <>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-neutral-700">Escribe tu respuesta</span>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <button
              onClick={guardar}
              disabled={guardando || !respuesta.trim()}
              className="mt-2 rounded-lg bg-ink px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar respuesta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
