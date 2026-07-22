import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 py-8">
      <div className="mx-auto max-w-6xl px-4 text-sm text-neutral-500">
        <p>© {new Date().getFullYear()} E|D Espacios y Diseño — Proyectos Inmobiliarios. Todos los derechos reservados.</p>
        <p className="mt-1">Pagos procesados de forma segura con Culqi. Precios en Soles (S/).</p>
        <p className="mt-3">
          <Link to="/libro-de-reclamaciones" className="underline hover:text-neutral-700">
            Libro de Reclamaciones
          </Link>
        </p>
      </div>
    </footer>
  );
}
