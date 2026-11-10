// Pestaña "Errores": lo que falló en la tienda, en palabras que se entienden.
//
// Los errores se guardan solos (api/_alertas.js): los del servidor y los que
// vio un cliente en su navegador. Aquí el dueño los ve sin entrar a Vercel, y
// los borra cuando ya los revisó o se los pasó a quien programa la tienda.

const fecha = (iso) =>
  new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });

export default function ErroresTab({ errores, onBorrar }) {
  if (!errores.length) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
        ✅ No hay errores registrados.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 px-4 py-2 text-xs text-sky-900">
        <span>
          Si un error se repite, copia el texto y pásaselo a quien programa la tienda. Los que dicen
          «PEDIDO PAGADO SIN GUARDAR» son urgentes: hay un cobro sin pedido, búscalo en Culqi.
        </span>
        <button
          onClick={() => {
            if (window.confirm('¿Borrar la lista de errores? Hazlo solo si ya los revisaste.')) onBorrar();
          }}
          className="shrink-0 rounded-md border border-sky-300 bg-white px-3 py-1 font-medium hover:bg-sky-100"
        >
          Ya los revisé, borrar
        </button>
      </div>
      {errores.map((e, i) => (
        <details key={`${e.fecha}-${i}`} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <summary className="cursor-pointer list-none">
            <span className="block text-sm font-medium text-neutral-900">{e.mensaje}</span>
            <span className="block text-xs text-neutral-500">
              {fecha(e.fecha)} · {e.origen}
            </span>
          </summary>
          {e.detalle && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-2 text-[11px] text-neutral-700">
              {e.detalle}
            </pre>
          )}
        </details>
      ))}
    </div>
  );
}
