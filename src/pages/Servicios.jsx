import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useMeta } from '../lib/meta.js';
import { trackAddToCart } from '../lib/analytics.js';
import { fotoChica } from '../lib/fotoChica.js';
import {
  TAMANO_SERVICIO,
  agruparPorArea,
  cobroDePlan,
  aliadoActivo,
  conReferencia,
  creditoDe,
  enlaceWhatsApp,
  recordarReferido,
  referidoActual,
  planesVisibles,
  proyectosVisibles,
  textosDeServicios,
} from '../lib/servicios.js';

// Página de servicios y portafolio.
//
// La tienda vendía solo muebles. Esta página enseña lo otro que hace el
// negocio: planes de servicio (cada uno se contrata por WhatsApp o se paga
// aquí mismo, según lo haya decidido el dueño) y los proyectos ya hechos, con
// sus fotos.
//
// TODO lo que se lee aquí lo escribe el dueño desde el panel: los planes, los
// proyectos, las fotos y hasta los títulos. La página no trae ningún trabajo
// de ejemplo — un portafolio inventado es publicidad engañosa (Ley 29571) — y
// mientras no haya nada publicado no aparece ni en el menú.

function IconoWhatsApp({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} fill-current`} aria-hidden="true">
      <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.9 5 2.3 7L4.5 28l6.3-1.8c1.6.8 3.3 1.3 5.2 1.3 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.6c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3.5 1 1-3.4-.2-.3c-1-1.5-1.6-3.3-1.6-5.2 0-5.2 4.2-9.4 9.3-9.4s9.3 4.2 9.3 9.4-4.2 9.4-9.3 9.4zm5.2-7c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4 0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}

// Una foto que, si falla, deja su hueco en gris en vez del icono de imagen
// rota. Un proyecto del portafolio puede apuntar a una foto que luego se
// borró del almacén, y un icono roto en la página que presume del trabajo
// hecho da justo la impresión contraria.
function Foto({ src, alt = '', className = '', ...resto }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
      className={className}
      {...resto}
    />
  );
}

// Miniatura: pide la versión liviana y, si esa foto no la tiene, vuelve a la
// original. Las fotos antiguas del almacén no siempre tienen su gemela chica.
function Miniatura({ src, className }) {
  const [fuente, setFuente] = useState(() => fotoChica(src));
  useEffect(() => setFuente(fotoChica(src)), [src]);
  return (
    <img
      src={fuente}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fuente !== src) setFuente(src);
      }}
      className={className}
    />
  );
}

function TarjetaPlan({ plan, cobro, credito, referido, storeConfig, formato, enCarrito, onContratar }) {
  const enlace = enlaceWhatsApp(
    storeConfig,
    conReferencia(
      `Hola, vi el servicio «${plan.nombre}»${plan.area ? ` (${plan.area})` : ''} en su página web y quiero una cotización.`,
      referido
    )
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
      {plan.foto && (
        <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
          <Foto
            src={plan.foto}
            alt={plan.nombre}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-semibold tracking-tight text-neutral-900">{plan.nombre}</h3>
        {/* Quién lo ejecuta, con su colegiatura: en arquitectura e ingeniería
            es lo que el cliente necesita saber antes de contratar. */}
        {credito && <p className="mt-1 text-xs font-medium text-neutral-500">A cargo de {credito}</p>}
        {plan.descripcion && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{plan.descripcion}</p>
        )}

        {plan.incluye?.length > 0 && (
          <ul className="mt-5 space-y-2.5 border-t border-neutral-100 pt-5 text-sm text-neutral-700">
            {plan.incluye.map((linea, i) => (
              <li key={i} className="flex gap-2.5">
                <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-neutral-900" aria-hidden="true">
                  <path d="M7.6 13.2 4.4 10l-1.1 1.1 4.3 4.3 9.1-9.1-1.1-1.1z" />
                </svg>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-7">
          {cobro ? (
            <>
              <p className="text-3xl font-bold tracking-tight text-neutral-900">{formato.format(cobro.precio)}</p>
              {/* La Ley 29571 pide que el precio mostrado sea el final. Se dice
                  junto al número, no en una nota al pie que nadie lee. */}
              <p className="mt-1 text-xs text-neutral-500">Precio final, IGV incluido</p>
              <button
                type="button"
                onClick={() => onContratar(plan, cobro)}
                className="mt-5 w-full rounded-xl bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black active:scale-[0.98]"
              >
                {enCarrito ? 'Ya está en tu carrito — ir a pagar' : 'Contratar este plan'}
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-neutral-900">{plan.precioTexto || 'Precio según tu proyecto'}</p>
              {plan.precioTexto && <p className="mt-1 text-xs text-neutral-500">IGV incluido</p>}
              {enlace && (
                <a
                  href={enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-neutral-900 px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white active:scale-[0.98]"
                >
                  <IconoWhatsApp className="h-4 w-4" />
                  Cotizar por WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function TarjetaProyecto({ proyecto, credito, onAbrir }) {
  const detalle = [proyecto.lugar, proyecto.anio].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ver las fotos de ${proyecto.titulo}`}
      className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-200 text-left shadow-sm transition-shadow duration-300 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-400"
    >
      <Foto
        src={proyecto.fotos[0]}
        alt={proyecto.titulo}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* El degradado no es adorno: sin él, el título en blanco no se lee
          sobre una foto clara (una pared blanca, una ventana). */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      {proyecto.fotos.length > 1 && (
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {proyecto.fotos.length} fotos
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 p-5">
        {proyecto.area && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">{proyecto.area}</span>
        )}
        <span className="mt-1 block text-lg font-semibold leading-snug text-white">{proyecto.titulo}</span>
        {detalle && <span className="mt-0.5 block text-xs text-white/75">{detalle}</span>}
        {credito && <span className="mt-0.5 block text-xs text-white/75">Proyecto de {credito}</span>}
      </span>
    </button>
  );
}

// Las fotos de un proyecto, a pantalla completa.
function GaleriaProyecto({ proyecto, credito, referido, storeConfig, onCerrar }) {
  const [indice, setIndice] = useState(0);
  const total = proyecto.fotos.length;
  const cerrarRef = useRef(null);
  const toqueX = useRef(null);

  const mover = (paso) => setIndice((i) => (i + paso + total) % total);

  useEffect(() => {
    // Con la galería abierta la página de detrás no debe moverse: en el
    // celular el dedo que pasa de foto acababa desplazando el fondo.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    function alTeclear(e) {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowRight') setIndice((i) => (i + 1) % total);
      if (e.key === 'ArrowLeft') setIndice((i) => (i - 1 + total) % total);
    }
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar, total]);

  const detalle = [proyecto.area, proyecto.lugar, proyecto.anio].filter(Boolean).join(' · ');
  const enlace = enlaceWhatsApp(
    storeConfig,
    conReferencia(`Hola, vi el proyecto «${proyecto.titulo}» en su página web y quiero algo parecido.`, referido)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={proyecto.titulo}
      className="fixed inset-0 z-[65] flex flex-col bg-neutral-950 text-white lg:flex-row"
    >
      {/* Arriba a la derecha de la pantalla, que es donde se busca la salida.
          Dentro del panel de texto, en el celular quedaba debajo de la foto. */}
      <button
        ref={cerrarRef}
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl backdrop-blur transition hover:bg-white/25"
      >
        ✕
      </button>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => {
          toqueX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (toqueX.current == null || total < 2) return;
          const distancia = e.changedTouches[0].clientX - toqueX.current;
          toqueX.current = null;
          if (Math.abs(distancia) > 45) mover(distancia < 0 ? 1 : -1);
        }}
      >
        <img
          key={proyecto.fotos[indice]}
          src={proyecto.fotos[indice]}
          alt={`${proyecto.titulo} — foto ${indice + 1} de ${total}`}
          className="hero-slide max-h-full max-w-full object-contain"
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur transition hover:bg-white/25 sm:left-4"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur transition hover:bg-white/25 sm:right-4"
            >
              ›
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur">
              {indice + 1} / {total}
            </span>
          </>
        )}
      </div>

      <aside className="flex max-h-[45vh] shrink-0 flex-col gap-4 overflow-y-auto border-t border-white/10 p-5 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0 lg:p-7">
        {/* En pantallas grandes el título comparte esquina con el botón de
            cerrar: se le deja el hueco para que no queden uno encima del otro. */}
        <div className="lg:pr-12">
          {detalle && <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{detalle}</p>}
          <h2 className="mt-1 text-xl font-semibold leading-snug">{proyecto.titulo}</h2>
          {credito && <p className="mt-1 text-xs text-white/70">Proyecto de {credito}</p>}
        </div>

        {proyecto.descripcion && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">{proyecto.descripcion}</p>
        )}

        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            {proyecto.fotos.map((foto, i) => (
              <button
                key={foto + i}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver la foto ${i + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === indice ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Miniatura src={foto} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {enlace && (
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
          >
            <IconoWhatsApp className="h-4 w-4" />
            Quiero algo así
          </a>
        )}
      </aside>
    </div>
  );
}

export default function Servicios() {
  const { services, projects, partners, products, storeConfig, currencyFormatter, loaded } = useCatalog();
  const { items, addItem } = useCart();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [parametros] = useSearchParams();

  // El enlace de un profesional aliado: /servicios?de=su-codigo. Quien llega
  // por ahí ve primero lo de ese profesional, y la visita queda anotada como
  // suya (para la consulta por WhatsApp y para el pedido).
  const aliadoDelEnlace = aliadoActivo(parametros.get('de'), partners);
  const [referido, setReferido] = useState(referidoActual);
  useEffect(() => {
    if (!aliadoDelEnlace) return;
    recordarReferido(aliadoDelEnlace.id);
    setReferido(aliadoDelEnlace.id);
  }, [aliadoDelEnlace]);

  const textos = textosDeServicios(storeConfig);
  const todosLosPlanes = useMemo(() => planesVisibles(services), [services]);
  const todosLosProyectos = useMemo(() => proyectosVisibles(projects), [projects]);
  // Si ese aliado todavía no tiene nada publicado, se enseña todo: mejor la
  // página completa que una vacía para quien viene desde sus redes.
  const soloDe =
    aliadoDelEnlace &&
    [...todosLosPlanes, ...todosLosProyectos].some((x) => x.aliado === aliadoDelEnlace.id)
      ? aliadoDelEnlace.id
      : '';
  const planes = useMemo(
    () => (soloDe ? todosLosPlanes.filter((p) => p.aliado === soloDe) : todosLosPlanes),
    [todosLosPlanes, soloDe]
  );
  const proyectos = useMemo(
    () => (soloDe ? todosLosProyectos.filter((p) => p.aliado === soloDe) : todosLosProyectos),
    [todosLosProyectos, soloDe]
  );
  const grupos = useMemo(() => agruparPorArea(planes), [planes]);

  const [areaElegida, setAreaElegida] = useState('todas');
  const [abierto, setAbierto] = useState(null); // id del proyecto en la galería
  // Con identidad fija: la galería vuelve a preparar el teclado y el foco cada
  // vez que esta función cambia, y no debe hacerlo en cada repintado.
  const cerrarGaleria = useCallback(() => setAbierto(null), []);

  // Las áreas que existen de verdad, en el orden en que el dueño las dejó.
  const areasDePlanes = grupos.map((g) => g.area).filter(Boolean);
  const areasDeProyectos = [...new Set(proyectos.map((p) => p.area).filter(Boolean))];
  const areas = [...new Set([...areasDePlanes, ...areasDeProyectos])];

  const proyectosFiltrados =
    areaElegida === 'todas' ? proyectos : proyectos.filter((p) => p.area === areaElegida);
  const proyectoAbierto = proyectos.find((p) => p.id === abierto) || null;

  // La foto de cabecera: la que eligió el dueño o, si no eligió ninguna, la
  // primera del portafolio. Así la página tiene una imagen real desde el
  // primer proyecto publicado, sin recurrir a una foto de archivo.
  const fotoPortada = textos.fotoPortada || proyectos[0]?.fotos[0] || '';

  useMeta({
    titulo: textos.titulo,
    descripcion: textos.descripcion || undefined,
    imagen: fotoPortada || undefined,
  });

  // Al llegar con "#portafolio" desde otra página, el navegador busca el
  // ancla antes de que la sección exista (el catálogo aún está cargando) y se
  // queda arriba. Se baja a mano en cuanto hay contenido.
  useEffect(() => {
    if (!hash || !loaded) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, loaded]);

  function contratar(plan, cobro) {
    const yaEsta = items.some((i) => i.productId === cobro.producto.id);
    // Tocar dos veces "Contratar" no debe dejar dos planes en el carrito.
    if (!yaEsta) {
      const item = {
        productId: cobro.producto.id,
        productName: cobro.producto.name,
        baseImage: cobro.producto.baseImage || '',
        tintable: false,
        sizeId: TAMANO_SERVICIO,
        colorId: '',
        opciones: {},
        opcionesDetalle: [],
        qty: 1,
        unitPrice: cobro.precio,
      };
      addItem(item);
      trackAddToCart(item);
    }
    navigate('/carrito');
  }

  const enlaceGeneral = enlaceWhatsApp(
    storeConfig,
    conReferencia('Hola, vengo de la página de servicios y quiero contarles mi proyecto.', referido)
  );

  // Todavía no se sabe si hay contenido: mejor una espera corta que enseñar
  // "estamos preparando esta sección" y cambiarla medio segundo después.
  if (!loaded && planes.length === 0 && proyectos.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-neutral-500">Cargando…</main>
    );
  }

  if (planes.length === 0 && proyectos.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{textos.titulo}</h1>
        <p className="mt-4 text-neutral-600">
          Estamos preparando esta sección. Mientras tanto, escríbenos y te contamos en qué podemos ayudarte.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {enlaceGeneral && (
            <a
              href={enlaceGeneral}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              <IconoWhatsApp className="h-4 w-4" />
              Escribir por WhatsApp
            </a>
          )}
          <Link
            to="/tienda"
            className="rounded-xl border border-neutral-300 px-6 py-3 text-sm font-semibold transition hover:border-neutral-900"
          >
            Ver la tienda
          </Link>
        </div>
      </main>
    );
  }

  return (
    // "!p-0": la hoja de estilos le pone un margen interior a todo <main> en
    // el celular, y la cabecera de esta página va de borde a borde.
    <main className="!p-0">
      {/* ================= CABECERA ================= */}
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        {fotoPortada && (
          <img
            src={fotoPortada}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {/* Velo oscuro: garantiza que el título se lea sea cual sea la foto. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-neutral-950/90 via-neutral-950/70 to-neutral-950/40" />

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-24 lg:py-32">
          {areas.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">{areas.join(' · ')}</p>
          )}
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl [text-wrap:balance]">
            {textos.titulo}
          </h1>
          {textos.descripcion && (
            <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/85 sm:text-lg">
              {textos.descripcion}
            </p>
          )}

          <div className="mt-9 flex flex-wrap gap-3">
            {planes.length > 0 && (
              <a
                href="#planes"
                className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
              >
                Ver los planes
              </a>
            )}
            {proyectos.length > 0 && (
              <a
                href="#portafolio"
                className={`rounded-xl px-6 py-3.5 text-sm font-semibold transition ${
                  planes.length > 0
                    ? 'border border-white/40 text-white hover:bg-white/10'
                    : 'bg-white text-neutral-900 hover:bg-neutral-200'
                }`}
              >
                Ver proyectos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Quien llegó por el enlace de un profesional ve solo lo suyo. Se le
          dice, y se le deja a un toque el resto de servicios. */}
      {soloDe && (
        <div className="border-b border-neutral-200 bg-neutral-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm sm:px-6">
            <span className="text-neutral-600">
              {creditoDe(soloDe, partners)
                ? `Servicios y proyectos de ${creditoDe(soloDe, partners)}`
                : 'Estás viendo una selección de nuestros servicios'}
            </span>
            <Link to="/servicios" className="font-medium text-neutral-900 underline">
              Ver todos los servicios
            </Link>
          </div>
        </div>
      )}

      {/* ================= PLANES ================= */}
      {planes.length > 0 && (
        <section id="planes" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{textos.planesTitulo}</h2>
            {textos.planesDescripcion && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-base text-neutral-600 sm:text-lg">
                {textos.planesDescripcion}
              </p>
            )}

            {grupos.map((grupo) => (
              <div key={grupo.area || 'sin-area'} className="mt-10 first:mt-8">
                {grupo.area && (
                  <div className="mb-6 flex items-center gap-4">
                    <h3 className="shrink-0 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      {grupo.area}
                    </h3>
                    <span className="h-px flex-1 bg-neutral-200" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {grupo.planes.map((plan) => {
                    const cobro = cobroDePlan(plan, products);
                    return (
                      <TarjetaPlan
                        key={plan.id}
                        plan={plan}
                        cobro={cobro}
                        credito={creditoDe(plan.aliado, partners)}
                        referido={referido}
                        storeConfig={storeConfig}
                        formato={currencyFormatter}
                        enCarrito={Boolean(cobro) && items.some((i) => i.productId === cobro.producto.id)}
                        onContratar={contratar}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= CÓMO TRABAJAMOS ================= */}
      {textos.pasos.length > 0 && (
        <section className="border-t border-neutral-100 bg-neutral-50">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{textos.pasosTitulo}</h2>
            <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {textos.pasos.map((paso, i) => (
                <li key={i} className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-base font-bold text-white">
                    {i + 1}
                  </span>
                  {paso.titulo && <h3 className="mt-4 text-lg font-semibold text-neutral-900">{paso.titulo}</h3>}
                  {paso.texto && <p className="mt-2 text-sm leading-relaxed text-neutral-600">{paso.texto}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ================= PORTAFOLIO ================= */}
      {proyectos.length > 0 && (
        <section id="portafolio" className="scroll-mt-24 border-t border-neutral-100 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{textos.portafolioTitulo}</h2>
            {textos.portafolioDescripcion && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-base text-neutral-600 sm:text-lg">
                {textos.portafolioDescripcion}
              </p>
            )}

            {areasDeProyectos.length > 1 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {['todas', ...areasDeProyectos].map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAreaElegida(area)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      areaElegida === area
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 text-neutral-700 hover:border-neutral-900'
                    }`}
                  >
                    {area === 'todas' ? 'Todos' : area}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {proyectosFiltrados.map((proyecto) => (
                <TarjetaProyecto
                  key={proyecto.id}
                  proyecto={proyecto}
                  credito={creditoDe(proyecto.aliado, partners)}
                  onAbrir={() => setAbierto(proyecto.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= LLAMADA FINAL ================= */}
      {enlaceGeneral && (textos.ctaTitulo || textos.ctaTexto) && (
        <section className="bg-neutral-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between">
            <div>
              {textos.ctaTitulo && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{textos.ctaTitulo}</h2>}
              {textos.ctaTexto && <p className="mt-2 max-w-xl text-white/75">{textos.ctaTexto}</p>}
            </div>
            <a
              href={enlaceGeneral}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
            >
              <IconoWhatsApp className="h-5 w-5" />
              {textos.ctaBoton}
            </a>
          </div>
        </section>
      )}

      {proyectoAbierto && (
        <GaleriaProyecto
          // La galería empieza en la primera foto de CADA proyecto: sin esta
          // clave, al abrir un segundo proyecto seguía en el número de foto
          // donde se dejó el anterior.
          key={proyectoAbierto.id}
          proyecto={proyectoAbierto}
          credito={creditoDe(proyectoAbierto.aliado, partners)}
          referido={referido}
          storeConfig={storeConfig}
          onCerrar={cerrarGaleria}
        />
      )}
    </main>
  );
}
