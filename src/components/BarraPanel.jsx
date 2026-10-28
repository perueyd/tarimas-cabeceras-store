import { logoEsImagen, NOMBRE_TIENDA } from '../data/sitio.js';

// La cabecera del panel.
//
// Sustituye a la de la tienda, que no pinta nada aquí: llevaba un carrito de
// compras y enlaces para navegar el catálogo como si el dueño fuera un
// cliente más.
//
// Esta dice tres cosas y ninguna más: dónde estás, cómo ver tu tienda, y cómo
// salir. Una herramienta de trabajo se usa muchas horas, así que cuanto menos
// ocupe la cabecera, más sitio queda para lo que importa.
export default function BarraPanel({ branding = {}, onSalir }) {
  // El mismo logotipo que la tienda: si es un dibujo se enseña tal cual, si
  // son letras van dentro del cuadrado oscuro de siempre.
  const esDibujo = logoEsImagen(branding.logo);
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          {esDibujo ? (
            <img src={branding.logo} alt="" width="32" height="29" className="h-7 w-auto shrink-0" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white">
              {branding.logo || 'E|D'}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">Panel del negocio</p>
            <p className="truncate text-[11px] text-neutral-500">
              {branding.nombre || NOMBRE_TIENDA}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Se abre en otra pestaña a propósito: mirar la tienda no debería
              costar perder dónde estabas en el panel. */}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-ink"
          >
            Ver tienda ↗
          </a>
          {onSalir && (
            <button
              onClick={onSalir}
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-ink"
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// La cabecera de una sección del panel: un título y, si hace falta, los
// botones que actúan sobre esa sección.
//
// Existe para que todas las secciones se vean iguales. Antes cada una
// resolvía su título a su manera y el panel parecía cosido de retazos.
export function TituloSeccion({ titulo, descripcion, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-neutral-500">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
