import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Tarimas &amp; Cabeceras <span className="text-neutral-400">Perú</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/?categoria=tarimas" className="hidden hover:text-neutral-500 sm:inline">
            Tarimas
          </Link>
          <Link to="/?categoria=cabeceras" className="hidden hover:text-neutral-500 sm:inline">
            Cabeceras
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
