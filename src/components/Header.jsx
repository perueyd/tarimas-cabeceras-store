import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { logoEsImagen } from '../data/sitio.js';
import { hayServicios, textosDeServicios } from '../lib/servicios.js';

export default function Header() {
  const { totalItems } = useCart();
  const catalog = useCatalog();
  const { storeConfig } = catalog;
  const branding = storeConfig.branding || {};
  // El enlace a Servicios existe solo si hay algo publicado: un menú que
  // lleva a una página vacía hace parecer la tienda a medio hacer.
  const conServicios = hayServicios(catalog);
  // El live sale en el menú mientras está encendido («🔴 En vivo») o cuando
  // el dueño escribió cuándo es el próximo («Live»). Sin ninguna de las dos,
  // no sale: llevaría a una página que solo dice «ahora no estamos en vivo».
  const { enVivo, anunciado } = catalog.live || {};
  const conLive = Boolean(enVivo || anunciado);
  const extras = Number(conServicios) + Number(conLive);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo — Editable desde panel */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          {/* El logotipo del panel puede ser un dibujo ("/logo.svg") o unas
              letras (el antiguo "E|D"): se dibuja el que toque, así el campo
              del panel sigue mandando sobre el logotipo.

              El `alt` va vacío a propósito: el nombre está escrito al lado,
              y describir también el dibujo haría que un lector de pantalla
              dijera la marca dos veces seguidas. */}
          {logoEsImagen(branding.logo) ? (
            <img src={branding.logo} alt="" width="40" height="36" className="h-9 w-auto" />
          ) : (
            <span className="text-2xl font-bold leading-none tracking-tighter sm:text-3xl">
              {branding.logo || 'E|D'}
            </span>
          )}
          <span className="hidden flex-col justify-center leading-tight sm:flex">
            <span className="text-[13px] font-semibold tracking-[0.14em] text-neutral-900">{branding.nombre || 'CORPORACIÓN AGAMENÓN'}</span>
            {branding.subtitulo && (
              <span className="text-[8px] tracking-[0.3em] text-neutral-500">{branding.subtitulo}</span>
            )}
          </span>
        </Link>
        {/* Con Servicios o el live hay más cosas en fila: en un celular
            angosto solo caben si se juntan un poco más. Con los dos a la vez
            (probado a 320, 360 y 390 px de ancho), en celulares de menos de
            390 px la letra baja un punto y, en los de menos de 360, «Rastrear»
            se esconde: sigue en el pie de página. Sin eso, «En vivo» se partía
            en dos renglones o el menú se salía de la pantalla. */}
        <nav
          className={`flex items-center whitespace-nowrap text-sm sm:gap-8 ${
            ['gap-6', 'gap-4', 'gap-2.5 max-[389px]:text-[13px]'][extras]
          }`}
        >
          {conLive && (
            <Link
              to="/live"
              className={
                enVivo
                  ? 'flex items-center gap-1.5 font-semibold text-red-600 transition-colors hover:text-red-700'
                  : 'text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4'
              }
            >
              {enVivo && (
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
              )}
              {enVivo ? 'En vivo' : 'Live'}
            </Link>
          )}
          <Link
            to="/tienda"
            className="text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4"
          >
            Tienda
          </Link>
          {conServicios && (
            <Link
              to="/servicios"
              className="text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4"
            >
              {textosDeServicios(storeConfig).menu}
            </Link>
          )}
          <Link
            to="/seguimiento"
            className={`text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4 ${
              extras === 2 ? 'max-[359px]:hidden' : ''
            }`}
          >
            Rastrear
          </Link>
          <Link to="/carrito" className="relative flex items-center gap-2 text-neutral-600 font-medium transition-colors hover:text-neutral-900">
            <span>🛒</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
