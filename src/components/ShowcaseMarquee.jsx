import { Link } from 'react-router-dom';

// Marquee de paneles deslizantes con texto gigante superpuesto (mix-blend-difference),
// inspirado en los sliders tipo "marquee mask". Los paneles enlazan a cada categoría.
const PANELS = [
  { img: '/images/tarima-base.svg', label: 'Tarimas', color: '#3b5a70', cat: 'tarimas', radius: '58% 42% 50% 50% / 46% 54% 46% 54%', rot: '-2deg' },
  { img: '/images/cabecera-base.svg', label: 'Cabeceras', color: '#6e2a35', cat: 'cabeceras', radius: '44% 56% 52% 48% / 55% 45% 55% 45%', rot: '2deg' },
  { img: '/images/sofa-base.svg', label: 'Sofás Cama', color: '#7a5638', cat: 'sofas-cama', radius: '52% 48% 44% 56% / 48% 52% 48% 52%', rot: '-1.5deg' },
  { img: '/images/comedor-base.svg', label: 'Sala y Comedor', color: '#8b8d91', cat: 'salas', radius: '46% 54% 58% 42% / 52% 48% 52% 48%', rot: '1.5deg' },
  { img: '/images/ropero-base.svg', label: 'Melamina', color: '#b08a5a', cat: 'melamina', radius: '55% 45% 46% 54% / 44% 56% 44% 56%', rot: '-2.5deg' },
];

export default function ShowcaseMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-neutral-200 bg-ink py-12" aria-label="Categorías destacadas">
      <div className="showcase-track flex w-max items-center gap-8 pl-8">
        {[...Array(2)].map((_, copy) => (
          <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
            {PANELS.map((p) => (
              <Link
                key={`${copy}-${p.cat}`}
                to={`/tienda?categoria=${p.cat}`}
                tabIndex={copy === 1 ? -1 : 0}
                className="group relative block h-64 w-52 shrink-0 overflow-hidden transition-transform duration-300 hover:scale-105"
                style={{ backgroundColor: p.color, borderRadius: p.radius, transform: `rotate(${p.rot})` }}
              >
                <img
                  src={p.img}
                  alt={p.label}
                  className="absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply opacity-90"
                />
                <span className="absolute inset-x-0 bottom-4 text-center text-xs font-medium uppercase tracking-widest text-white/90">
                  {p.label}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Texto gigante superpuesto: invierte el color sobre los paneles al pasar (como el efecto del video) */}
      <h2 className="pointer-events-none absolute inset-0 flex items-center justify-center text-[16vw] font-bold uppercase leading-none tracking-tighter text-white mix-blend-difference sm:text-[11vw]">
        Muebles
      </h2>
    </section>
  );
}
