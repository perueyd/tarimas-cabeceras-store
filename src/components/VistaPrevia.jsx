import { useEffect, useRef, useState } from 'react';

// Muestra la tienda de verdad dentro del panel, mientras se edita.
//
// Antes había que guardar, abrir otra pestaña y recargar a mano para ver el
// efecto de cada cambio. Aquí la web va al lado y se refresca sola cada vez
// que se guarda algo.
//
// Es la web REAL (un iframe a la propia página), no una imitación: lo que se
// ve aquí es exactamente lo que ve el cliente.

const TAMANOS = {
  movil: { w: 390, h: 780, label: '📱 Móvil', desc: '390px' },
  tablet: { w: 768, h: 900, label: '📱 Tablet', desc: '768px' },
  escritorio: { w: 1280, h: 800, label: '🖥️ Escritorio', desc: '1280px' },
};

const PAGINAS = [
  { url: '/', label: 'Portada' },
  { url: '/tienda', label: 'Tienda' },
  { url: '/carrito', label: 'Carrito' },
];

export default function VistaPrevia({ recargarToken, productoEjemplo }) {
  const [tamano, setTamano] = useState('movil');
  const [pagina, setPagina] = useState('/');
  const [cargando, setCargando] = useState(true);
  // Cambiar la key del iframe lo vuelve a montar: es la forma fiable de
  // recargarlo, porque al ser el mismo origen pero otra ruta no siempre basta
  // con tocar el src.
  const [version, setVersion] = useState(0);
  const primeraVez = useRef(true);

  // Cada vez que el editor guarda algo, sube `recargarToken` y refrescamos.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    setCargando(true);
    setVersion((v) => v + 1);
  }, [recargarToken]);

  const paginas = productoEjemplo
    ? [...PAGINAS, { url: `/producto/${productoEjemplo}`, label: 'Un producto' }]
    : PAGINAS;

  const t = TAMANOS[tamano];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {Object.entries(TAMANOS).map(([id, v]) => (
            <button
              key={id}
              onClick={() => setTamano(id)}
              title={v.desc}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                tamano === id ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:border-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {paginas.map((p) => (
            <button
              key={p.url}
              onClick={() => { setPagina(p.url); setCargando(true); setVersion((v) => v + 1); }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                pagina === p.url ? 'border-ink bg-neutral-100' : 'border-neutral-300 hover:border-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setCargando(true); setVersion((v) => v + 1); }}
          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs transition hover:border-ink"
          title="Volver a cargar"
        >
          ↻
        </button>

        <a
          href={pagina}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs transition hover:border-ink"
          title="Abrir en una pestaña aparte"
        >
          ↗ Abrir
        </a>
      </div>

      <div className="relative flex-1 overflow-auto rounded-xl border border-neutral-200 bg-neutral-100 p-3">
        {cargando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100/80 text-sm text-neutral-500">
            Cargando vista previa…
          </div>
        )}
        <div
          className="mx-auto overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm transition-all"
          style={{ width: t.w, maxWidth: '100%' }}
        >
          <iframe
            key={`${version}-${pagina}-${tamano}`}
            src={pagina}
            title="Vista previa de la tienda"
            onLoad={() => setCargando(false)}
            style={{ width: t.w, height: t.h, border: 0, display: 'block' }}
            // Mismo origen, así que no hace falta sandbox: es la propia web.
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Es tu tienda de verdad, tal como la ve el cliente. Se actualiza sola cada vez que guardas.
      </p>
    </div>
  );
}
