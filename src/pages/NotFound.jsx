import { Link } from 'react-router-dom';

// Cualquier dirección que no exista (un enlace viejo compartido por WhatsApp,
// una dirección mal escrita) llegaba a una página totalmente en blanco, sin
// mensaje ni forma de volver. Esta pantalla la reemplaza.
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="mt-4 text-neutral-600">
        Es posible que el enlace sea antiguo o esté mal escrito. Puedes volver al inicio o ver
        todos nuestros productos.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/tienda"
          className="rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Ver la tienda
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium transition hover:border-ink"
        >
          Ir al inicio
        </Link>
      </div>
      <p className="mt-10 text-sm text-neutral-500">
        ¿Buscabas algo en concreto?{' '}
        <a
          className="underline hover:text-ink"
          href="https://wa.me/51951278010?text=Hola%2C%20no%20encuentro%20una%20p%C3%A1gina%20en%20la%20web."
          target="_blank"
          rel="noopener noreferrer"
        >
          Escríbenos por WhatsApp
        </a>
      </p>
    </main>
  );
}
