import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo E|D — Espacios y Diseño */}
        <Link to="/" className="flex items-center gap-3">
          <span className="text-3xl font-bold leading-none tracking-tight">
            E<span className="mx-0.5 font-thin text-neutral-400">|</span>D
          </span>
          <span className="hidden flex-col justify-center leading-tight sm:flex">
            <span className="text-[13px] font-semibold tracking-[0.22em]">ESPACIOS Y DISEÑO</span>
            <span className="text-[9px] tracking-[0.34em] text-neutral-400">PROYECTOS INMOBILIARIOS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/tienda" className="hidden hover:text-neutral-500 sm:inline">
            Tienda
          </Link>
          <Link to="/tienda" className="hover:text-neutral-500">
            Productos
          </Link>
          <Link to="/carrito" className="relative flex items-center gap-1">
            <span>Carrito</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
