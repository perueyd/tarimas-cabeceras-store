import { useEffect, useState } from 'react';

// Copias de seguridad del catálogo.
//
// POR QUÉ EXISTE: los 33 productos de la tienda desaparecieron una vez de la
// base de datos y no había ninguna copia — hubo que dictarlos de nuevo uno por
// uno, con descripciones y precios. Esta pestaña hace que eso no pueda volver
// a costar más que un clic.
//
// La copia se guarda sola antes del primer cambio de cada día. Lo que esta
// pantalla añade es poder VERLAS, bajarlas al disco duro (lo único que
// sobrevive a que la base de datos entera desaparezca) y volver a una.

const PARTES = [
  ['products', 'productos'],
  ['categories', 'categorías'],
  ['colors', 'colores'],
  ['sizes', 'medidas'],
  ['showcase', 'vitrina'],
];

function fechaBonita(iso) {
  // Las fechas llegan en UTC y el dueño está en Lima. Sin la zona explícita, una
  // copia hecha a las 8 de la noche se mostraría con la fecha del día siguiente.
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function RespaldosTab({ catalog, adminKey, flash }) {
  const [respaldos, setRespaldos] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');

  async function pedir(method, query = '') {
    const res = await fetch(`/api/respaldos${query}`, {
      method,
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
    return data;
  }

  async function cargar() {
    try {
      const data = await pedir('GET');
      setRespaldos(data.respaldos || []);
      setError('');
    } catch (err) {
      setError(err.message);
      setRespaldos([]);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crearAhora() {
    setOcupado('crear');
    try {
      const data = await pedir('POST', '?action=crear');
      setRespaldos(data.respaldos || []);
      flash('Copia guardada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setOcupado('');
    }
  }

  // Descarga un archivo .json al disco del dueño. Esto es lo que de verdad lo
  // protege: las copias de la base de datos no sirven si la base de datos es
  // justo lo que falla.
  async function descargar(id) {
    setOcupado(`bajar-${id}`);
    try {
      const data = await pedir('GET', `?id=${encodeURIComponent(id)}`);
      const texto = JSON.stringify(data.catalogo, null, 2);
      const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo-eyd-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      // Se anota para poder avisar en "Qué hacer hoy" cuando lleve mucho sin
      // bajar una copia. Si falla, da igual: la descarga ya ocurrió.
      pedir('POST', '?action=descargada').catch(() => {});
      flash('Archivo descargado. Guárdalo en un lugar seguro.');
    } catch (err) {
      alert(err.message);
    } finally {
      setOcupado('');
    }
  }

  async function restaurar(entrada) {
    const cuantos = entrada.resumen?.products ?? '?';
    const ok = window.confirm(
      `¿Devolver la tienda a la copia del ${fechaBonita(entrada.fecha)}?\n\n` +
        `Esa copia tiene ${cuantos} productos. Tu catálogo actual tiene ${catalog.products.length}.\n\n` +
        'Antes de cambiar nada se guarda una copia de cómo está AHORA, así que esto se puede deshacer.'
    );
    if (!ok) return;

    setOcupado(`restaurar-${entrada.id}`);
    try {
      const data = await pedir('POST', `?action=restaurar&id=${encodeURIComponent(entrada.id)}`);
      setRespaldos(data.respaldos || []);
      await catalog.refetch();
      flash('Catálogo restaurado.');
    } catch (err) {
      alert(err.message);
    } finally {
      setOcupado('');
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Copias de seguridad</h2>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Se guarda una copia sola, antes del primer cambio de cada día. Se conservan las últimas 7.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Descarga una copia de vez en cuando.</strong> Las copias viven en la misma base de
        datos que tu catálogo. Un archivo en tu computadora es lo único que sobrevive si esa base
        falla — que es exactamente lo que pasó la vez que se perdieron los productos.
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={crearAhora}
          disabled={ocupado === 'crear'}
          className="rounded-lg border border-ink px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50"
        >
          {ocupado === 'crear' ? 'Guardando…' : 'Guardar copia ahora'}
        </button>
        <span className="text-xs text-neutral-500">Útil justo antes de hacer un cambio grande.</span>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {respaldos === null ? (
        <p className="mt-6 text-sm text-neutral-400">Cargando…</p>
      ) : respaldos.length === 0 ? (
        <div className="mt-6 rounded-xl border border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm font-medium">Todavía no hay copias</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
            Se creará una sola en cuanto hagas el primer cambio del día. O pulsa «Guardar copia
            ahora» para tener una ya.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {respaldos.map((r, i) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {fechaBonita(r.fecha)}
                  {i === 0 && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                      la más reciente
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {PARTES.filter(([clave]) => r.resumen?.[clave] != null)
                    .map(([clave, nombre]) => `${r.resumen[clave]} ${nombre}`)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => descargar(r.id)}
                  disabled={ocupado === `bajar-${r.id}`}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-ink disabled:opacity-50"
                >
                  {ocupado === `bajar-${r.id}` ? 'Bajando…' : 'Descargar'}
                </button>
                <button
                  onClick={() => restaurar(r)}
                  disabled={ocupado === `restaurar-${r.id}`}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-ink disabled:opacity-50"
                >
                  {ocupado === `restaurar-${r.id}` ? 'Restaurando…' : 'Restaurar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
