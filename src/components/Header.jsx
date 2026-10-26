import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { logoEsImagen } from '../data/sitio.js';

export default function Header() {
  const { totalItems } = useCart();
  const { storeConfig } = useCatalog();
  const branding = storeConfig.branding || {};

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
        <nav className="flex items-center gap-6 text-sm sm:gap-8">
          <Link
            to="/tienda"
            className="text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4"
          >
            Tienda
          </Link>
          <Link
            to="/seguimiento"
            className="text-neutral-600 font-medium transition-colors hover:text-neutral-900 hover:underline underline-offset-4"
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
