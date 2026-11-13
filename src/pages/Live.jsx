import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';
import { NOMBRE_TIENDA } from '../data/sitio.js';
import { useMeta } from '../lib/meta.js';
import { fechaCorta, normalizarNombre, normalizarWhatsApp, recordarCodigoDelLive } from '../lib/live.js';

// La página del live.
//
// El dueño dice en la transmisión "entren a …/live". Quien entra deja su
// nombre y su WhatsApp y ve AL INSTANTE el código de descuento de ese live.
// Si no hay transmisión, la página lo dice y enseña dónde seguir a la tienda.
//
// Está pensada para el celular (quien ve un live está en el celular) y para
// hacerse en diez segundos: dos campos y un botón.
//
// El código NO viene con la página: lo entrega el servidor solo después del
// registro. Si viajara antes, bastaría mirar la red del navegador para
// sacarlo sin registrarse.

const CLAVE_OFERTA = 'ed-live-oferta';
const REDES = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube' };

function leerOfertaGuardada() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_OFERTA) || 'null');
  } catch {
    return null;
  }
}

function PuntoEnVivo() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      En vivo
    </span>
  );
}

function Oferta({ oferta, onOtra }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(oferta.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso para el portapapeles: el código está a la vista y se
      // puede seleccionar a mano.
    }
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-neutral-900 shadow-2xl sm:p-8">
      <p className="text-sm font-medium text-neutral-500">¡Listo{oferta.nombre ? `, ${oferta.nombre.split(' ')[0]}` : ''}!</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Tu oferta del live</h2>

      {oferta.oferta && <p className="mt-4 text-3xl font-bold tracking-tight text-red-600">{oferta.oferta}</p>}

      <div className="mt-5 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Tu código</p>
        <p className="mt-1 select-all break-all font-mono text-3xl font-bold tracking-wider">{oferta.codigo}</p>
        <button
          type="button"
          onClick={copiar}
          className="mt-4 rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold transition hover:border-neutral-900"
        >
          {copiado ? '✓ Copiado' : 'Copiar código'}
        </button>
      </div>

      <ul className="mt-5 space-y-1.5 text-sm text-neutral-600">
        {oferta.vence && <li>· Válido hasta el {fechaCorta(oferta.vence)}.</li>}
        {oferta.maxUsos && <li>· Solo para las primeras {oferta.maxUsos} compras.</li>}
        <li>· Escríbelo al pagar, donde dice «¿Tienes un código de descuento?». Ya te lo dejamos puesto.</li>
      </ul>

      <Link
        to="/tienda"
        className="mt-6 block rounded-xl bg-neutral-900 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-black"
      >
        Ir a la tienda y usarlo
      </Link>
      <button type="button" onClick={onOtra} className="mt-3 w-full text-center text-xs text-neutral-500 underline">
        Registrar a otra persona
      </button>
    </div>
  );
}

export default function Live() {
  const { storeConfig } = useCatalog();
  const [estado, setEstado] = useState(null); // null = cargando; { activo, liveId, titulo, descripcion, proximo }
  const [oferta, setOferta] = useState(null);
  const [form, setForm] = useState({ nombre: '', whatsapp: '', acepta: false, promos: false });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const intentos = useRef(0);

  useMeta({ titulo: 'Live', descripcion: 'Regístrate durante la transmisión en vivo y recibe la oferta del live al instante.' });

  async function consultar() {
    try {
      const res = await fetch('/api/live');
      const data = await res.json();
      if (!res.ok) throw new Error();
      setEstado(data);
      // Quien ya se registró en ESTE live y recarga la página vuelve a ver su
      // código, sin pasar otra vez por el formulario.
      const guardada = leerOfertaGuardada();
      if (data.activo && guardada?.liveId === data.liveId) setOferta(guardada);
    } catch {
      setEstado((previo) => previo || { activo: false, sinConexion: true });
    }
  }

  useEffect(() => {
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mucha gente entra un minuto ANTES de que el dueño encienda el live. En vez
  // de dejarla mirando "no estamos en vivo", la página vuelve a preguntar sola
  // cada medio minuto durante un rato (20 veces: diez minutos).
  useEffect(() => {
    if (!estado || estado.activo) return undefined;
    const reloj = setInterval(() => {
      intentos.current += 1;
      if (intentos.current > 20) clearInterval(reloj);
      else if (document.visibilityState === 'visible') consultar();
    }, 30000);
    return () => clearInterval(reloj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const responsable = storeConfig.razonSocial || NOMBRE_TIENDA;
  const redes = Object.keys(REDES).filter((k) => storeConfig.social?.[k]);

  async function registrar(e) {
    e.preventDefault();
    setError('');
    const nombre = normalizarNombre(form.nombre);
    const whatsapp = normalizarWhatsApp(form.whatsapp);
    if (nombre.length < 2) return setError('Escribe tu nombre.');
    if (!whatsapp) return setError('Escribe tu número de WhatsApp: 9 dígitos y empieza con 9.');
    if (!form.acepta) return setError('Marca la casilla para aceptar el uso de tus datos.');

    setEnviando(true);
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, whatsapp, acepta: true, promos: form.promos }),
      });
      const data = await res.json();
      if (!res.ok) {
        // El live terminó mientras llenaba el formulario: se refresca el
        // estado para que la página deje de ofrecer el registro.
        if (data?.terminado) consultar();
        throw new Error(data?.error || 'No se pudo registrar. Intenta de nuevo.');
      }
      const nueva = { ...data, nombre, liveId: estado.liveId };
      setOferta(nueva);
      recordarCodigoDelLive(data.codigo);
      try {
        sessionStorage.setItem(CLAVE_OFERTA, JSON.stringify(nueva));
      } catch {
        // Sin almacenamiento: la oferta se ve igual, solo no sobrevive a recargar.
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    'w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900';

  return (
    // "!p-0": la hoja de estilos le pone margen a todo <main> en el celular y
    // esta página va con el fondo oscuro de borde a borde.
    <main className="!p-0 bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-[78vh] max-w-md flex-col justify-center px-5 py-10 sm:py-16">
        {estado === null && <p className="text-center text-sm text-white/60">Cargando…</p>}

        {estado && !estado.activo && (
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">Live</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Ahora no estamos en vivo</h1>
            <p className="mt-4 text-white/70">
              {estado.proximo || 'Cuando empiece la transmisión, aquí podrás registrarte y ver la oferta del live.'}
            </p>

            {redes.length > 0 && (
              <div className="mt-8">
                <p className="text-xs text-white/50">Síguenos para enterarte del próximo:</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {redes.map((k) => (
                    <a
                      key={k}
                      href={storeConfig.social[k]}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/25 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                    >
                      {REDES[k]}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={consultar}
                className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Volver a comprobar
              </button>
              <Link to="/tienda" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200">
                Ver la tienda
              </Link>
            </div>
          </div>
        )}

        {estado?.activo && oferta && (
          <>
            <div className="mb-6 text-center">
              <PuntoEnVivo />
            </div>
            <Oferta
              oferta={oferta}
              onOtra={() => {
                setOferta(null);
                setForm({ nombre: '', whatsapp: '', acepta: false, promos: false });
              }}
            />
          </>
        )}

        {estado?.activo && !oferta && (
          <>
            <div className="text-center">
              <PuntoEnVivo />
              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl [text-wrap:balance]">
                {estado.titulo || 'Oferta del live'}
              </h1>
              <p className="mt-3 text-white/75">
                {estado.descripcion || 'Regístrate y mira al instante la oferta de esta transmisión.'}
              </p>
            </div>

            <form onSubmit={registrar} noValidate className="mt-8 rounded-3xl bg-white p-6 text-neutral-900 shadow-2xl sm:p-8">
              <label className="block text-sm font-medium text-neutral-700">
                Tu nombre
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  autoComplete="name"
                  placeholder="Nombre y apellido"
                  className={`mt-1.5 ${campo}`}
                />
              </label>

              <label className="mt-4 block text-sm font-medium text-neutral-700">
                Tu WhatsApp
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="9XX XXX XXX"
                  className={`mt-1.5 ${campo}`}
                />
              </label>

              {/* Dos permisos separados, como pide la Ley 29733: uno para darle
                  ESTA oferta (sin él no hay registro) y otro, voluntario, para
                  escribirle por ofertas futuras. Ninguno viene marcado. */}
              <label className="mt-5 flex gap-3 text-xs leading-relaxed text-neutral-600">
                <input
                  type="checkbox"
                  checked={form.acepta}
                  onChange={(e) => setForm((f) => ({ ...f, acepta: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  Acepto que {responsable} use mi nombre y mi WhatsApp para darme esta oferta y contactarme sobre
                  ella, según su{' '}
                  <a href="/politica-privacidad" target="_blank" rel="noreferrer" className="font-medium text-neutral-900 underline">
                    política de privacidad
                  </a>
                  .
                </span>
              </label>
              <label className="mt-3 flex gap-3 text-xs leading-relaxed text-neutral-600">
                <input
                  type="checkbox"
                  checked={form.promos}
                  onChange={(e) => setForm((f) => ({ ...f, promos: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>Quiero que me avisen por WhatsApp de próximos lives y ofertas (opcional).</span>
              </label>

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {enviando ? 'Registrando…' : 'Ver mi oferta'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
