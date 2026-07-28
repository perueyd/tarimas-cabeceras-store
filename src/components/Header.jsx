import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function Header() {
  const { totalItems } = useCart();
  const { storeConfig } = useCatalog();
  const branding = storeConfig.branding || {};

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo — Editable desde panel */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold leading-none tracking-tighter">
              {branding.logo || 'E|D'}
            </span>
            <span className="hidden flex-col justify-center leading-tight sm:flex">
              <span className="text-[12px] font-semibold tracking-[0.15em] text-neutral-900">{branding.nombre || 'ESPACIOS Y DISEÑO'}</span>
              <span className="text-[8px] tracking-[0.3em] text-neutral-500">{branding.subtitulo || 'PROYECTOS INMOBILIARIOS'}</span>
            </span>
          </div>
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
