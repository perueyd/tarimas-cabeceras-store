import { useState } from 'react';

// Compartir el producto.
//
// En el celular se usa el menú del PROPIO teléfono (navigator.share): ahí ya
// están WhatsApp, Messenger, Instagram, Telegram, correo y "copiar enlace", con
// los iconos de verdad y en el orden que esa persona usa. Poner nuestros propios
// botones de cada red seria peor: logos ajenos que envejecen, siempre falta la
// que usa el cliente, y en iPhone muchas abren mal.
//
// En computadora ese menú no existe, así que ahí sí se ponen las dos que de
// verdad se usan para esto en Perú (WhatsApp y Facebook) y copiar el enlace.
export default function BotonCompartir({ nombre, precio, className = '' }) {
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const texto = `${nombre}${precio ? ` — ${precio}` : ''}`;

  async function compartir() {
    // El menú del teléfono. Si la persona lo cierra sin elegir, no es un error:
    // se ignora en silencio en vez de mostrarle un aviso.
    if (navigator.share) {
      try {
        await navigator.share({ title: nombre, text: texto, url });
        return;
      } catch {
        return;
      }
    }
    setAbierto((v) => !v);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso al portapapeles (pasa en algunos navegadores antiguos).
      window.prompt('Copia el enlace:', url);
    }
  }

  const enlaceWhatsApp = `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;
  const enlaceFacebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={compartir}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium transition hover:border-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Compartir
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          <a
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100"
          >
            💬 WhatsApp
          </a>
          <a
            href={enlaceFacebook}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100"
          >
            👍 Facebook
          </a>
          <button
            type="button"
            onClick={copiar}
            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100"
          >
            {copiado ? '✓ Enlace copiado' : '🔗 Copiar enlace'}
          </button>
        </div>
      )}
    </div>
  );
}
