import { useEffect, useState } from 'react';
import { descargarHoja } from './descargas.js';

// El botón «Reiniciar» del panel.
//
// Deja en cero todo lo de clientes (pedidos, carritos, visitas, reseñas,
// suscriptores, encuestas, registrados del live) para empezar limpio antes de
// vender de verdad. No se lleva el catálogo, los precios, los textos ni el
// Libro de Reclamaciones.
//
// Es el botón más delicado del panel, así que no se deja tocar a la ligera:
// va al final del resumen, enseña antes QUÉ hay y QUÉ se va a quitar, pide
// escribir una palabra y la clave del administrador otra vez, y guarda una
// copia que se puede restaurar desde aquí mismo.

function fechaBonita(iso) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// [campo, "uno", "varios"]
const PARTES = [
  ['pedidos', 'pedido', 'pedidos'],
  ['carritos', 'carrito abandonado', 'carritos abandonados'],
  ['diasDeVisitas', 'día de visitas', 'días de visitas'],
  ['resenas', 'reseña', 'reseñas'],
  ['suscriptores', 'suscriptor', 'suscriptores'],
  ['encuestas', 'encuesta', 'encuestas'],
  ['registrados', 'registrado del live', 'registrados del live'],
];

const enPalabras = (r) =>
  PARTES.filter(([clave]) => r?.[clave] > 0)
    .map(([clave, uno, varios]) => `${r[clave]} ${r[clave] === 1 ? uno : varios}`)
    .join(' · ') || 'nada';

export default function ReiniciarDatos({ adminKey, orders, onHecho }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [palabra, setPalabra] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function pedir(metodo = 'GET', cuerpo, consulta = '') {
    const res = await fetch(`/api/reiniciar${consulta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${adminKey}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudo completar.');
    return data;
  }

  async function cargar() {
    try {
      setDatos(await pedir());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (abierto && !datos) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const hayAlgo = datos && PARTES.some(([c]) => datos.ahora?.[c] > 0);
  const listo = palabra === 'REINICIAR' && clave === adminKey;

  async function reiniciar() {
    if (!listo) return;
    setOcupado(true);
    setError('');
    try {
      // Además de la copia que guarda el servidor, la hoja de pedidos baja al
      // equipo del dueño: esa sobrevive aunque a la base le pase algo.
      if (orders?.length) descargarHoja(orders);
      const data = await pedir('POST', { confirmar: 'REINICIAR' });
      setDatos({ ahora: data.ahora, copias: data.copias });
      setPalabra('');
      setClave('');
      setAviso(
        data.copia
          ? 'Listo: la tienda quedó en cero. La copia está guardada aquí abajo y puedes restaurarla cuando quieras.'
          : 'No había nada que reiniciar.'
      );
      onHecho?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function restaurar(copia) {
    const ahora = hayAlgo
      ? '\n\nLo que hay AHORA en la tienda no se pierde: se guarda en otra copia.'
      : '';
    if (!window.confirm(`¿Volver a como estaba el ${fechaBonita(copia.fecha)}?\n\nRegresan: ${enPalabras(copia.resumen)}.${ahora}`)) return;
    setOcupado(true);
    setError('');
    try {
      const data = await pedir('POST', { accion: 'restaurar', id: copia.id });
      setDatos({ ahora: data.ahora, copias: data.copias });
      setAviso('Copia restaurada: la tienda volvió a como estaba.');
      onHecho?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(copia) {
    if (!window.confirm(`¿Borrar para siempre la copia del ${fechaBonita(copia.fecha)}?\n\nContiene: ${enPalabras(copia.resumen)}.\nNo se puede deshacer.`)) return;
    setOcupado(true);
    try {
      const data = await pedir('DELETE', null, `?id=${encodeURIComponent(copia.id)}`);
      setDatos((d) => ({ ...d, copias: data.copias }));
      setAviso('Copia borrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-neutral-800">Reiniciar la tienda</span>
          <span className="block text-xs text-neutral-500">
            Solo para el administrador. Deja en cero los pedidos y demás datos de clientes, guardando una copia.
          </span>
        </span>
        <span className={`shrink-0 text-neutral-400 transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {abierto && (
        <div className="border-t border-neutral-200 p-4">
          {!datos && !error && <p className="text-sm text-neutral-500">Cargando…</p>}
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {aviso && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p>}

          {datos && (
            <>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="font-medium text-red-900">Se deja en cero</p>
                  <p className="mt-1 text-xs text-red-900">
                    Ahora hay: <strong>{enPalabras(datos.ahora)}</strong>.
                  </p>
                  <p className="mt-1 text-xs text-red-800">
                    También vuelven a cero las ventas del resumen, las analíticas de ofertas, el historial de códigos y
                    las veces que se usó cada cupón.
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="font-medium text-green-900">No se toca</p>
                  <p className="mt-1 text-xs text-green-900">
                    Tus productos, precios, fotos y textos; servicios, portafolio y aliados; los cupones y ofertas; y el
                    Libro de Reclamaciones, que la ley obliga a conservar.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-800">Para reiniciar</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Se guarda una copia en la tienda (puedes restaurarla abajo) y, si hay pedidos, se descarga su hoja a
                  tu equipo.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-xs">
                    <span className="mb-1 block text-neutral-600">Escribe REINICIAR</span>
                    <input
                      value={palabra}
                      onChange={(e) => setPalabra(e.target.value.toUpperCase())}
                      placeholder="REINICIAR"
                      autoComplete="off"
                      className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-neutral-600">Tu clave de administrador, otra vez</span>
                    <input
                      type="password"
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      autoComplete="off"
                      className="w-56 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={reiniciar}
                    disabled={!listo || ocupado || !hayAlgo}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
                  >
                    {ocupado ? 'Trabajando…' : 'Reiniciar ahora'}
                  </button>
                </div>
                {!hayAlgo && <p className="mt-2 text-xs text-neutral-500">La tienda ya está en cero: no hay nada que reiniciar.</p>}
                {clave && clave !== adminKey && <p className="mt-2 text-xs text-red-600">Esa no es la clave con la que entraste.</p>}
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-neutral-800">Copias guardadas</p>
                <p className="text-xs text-neutral-500">
                  Se conservan las tres últimas. Contienen datos de clientes: borra las que ya no necesites.
                </p>
                {datos.copias.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500">
                    Todavía no hay copias.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {datos.copias.map((copia) => (
                      <li key={copia.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-xs">
                        <span>
                          <span className="block font-medium text-neutral-800">{fechaBonita(copia.fecha)}</span>
                          <span className="block text-neutral-500">
                            {enPalabras(copia.resumen)}
                            {copia.motivo ? ` — ${copia.motivo}` : ''}
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => restaurar(copia)}
                            disabled={ocupado}
                            className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-ink disabled:opacity-50"
                          >
                            Restaurar
                          </button>
                          <button
                            type="button"
                            onClick={() => borrar(copia)}
                            disabled={ocupado}
                            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-red-600 hover:border-red-300 disabled:opacity-50"
                          >
                            Borrar copia
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
