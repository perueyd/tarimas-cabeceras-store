import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Marquee "líquido" con física:
//  - Se desliza solo y es ARRASTRABLE en ambas direcciones (mouse o dedo), con inercia.
//  - Al soltar, mantiene la dirección del arrastre y vuelve suave a su velocidad crucero.
//  - La pista se ESTIRA y se inclina según la velocidad (efecto de succión al frenar/acelerar).
//  - Un filtro SVG de turbulencia hace que los BORDES ondulen como agua; la distorsión
//    se intensifica cuanto más rápido se mueve (efecto "se derrite").
const PANELS = [
  { img: '/images/tarima-base.svg', label: 'Tarimas', color: '#3b5a70', cat: 'tarimas', radius: '58% 42% 50% 50% / 46% 54% 46% 54%', rot: '-2deg' },
  { img: '/images/cabecera-base.svg', label: 'Cabeceras', color: '#6e2a35', cat: 'cabeceras', radius: '44% 56% 52% 48% / 55% 45% 55% 45%', rot: '2deg' },
  { img: '/images/sofa-base.svg', label: 'Sofás Cama', color: '#7a5638', cat: 'sofas-cama', radius: '52% 48% 44% 56% / 48% 52% 48% 52%', rot: '-1.5deg' },
  { img: '/images/comedor-base.svg', label: 'Sala y Comedor', color: '#8b8d91', cat: 'salas', radius: '46% 54% 58% 42% / 52% 48% 52% 48%', rot: '1.5deg' },
  { img: '/images/ropero-base.svg', label: 'Melamina', color: '#b08a5a', cat: 'melamina', radius: '55% 45% 46% 54% / 44% 56% 44% 56%', rot: '-2.5deg' },
];

const CRUISE = 0.8; // velocidad crucero en px por frame (~48 px/s)

export default function ShowcaseMarquee() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const dispRef = useRef(null); // feDisplacementMap (intensidad del agua)
  const turbRef = useRef(null); // feTurbulence (ondulación que respira)
  const suppressClick = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const s = {
      pos: 0,
      v: reduced ? 0 : CRUISE,
      dir: 1,
      dragging: false,
      lastX: 0,
      moved: 0,
      halfW: track.scrollWidth / 2,
      t: 0,
    };

    const onResize = () => {
      s.halfW = track.scrollWidth / 2;
    };
    window.addEventListener('resize', onResize);

    function onDown(e) {
      s.dragging = true;
      s.lastX = e.clientX;
      s.moved = 0;
      try { section.setPointerCapture(e.pointerId); } catch { /* no-op */ }
      section.style.cursor = 'grabbing';
    }
    function onMove(e) {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      s.lastX = e.clientX;
      s.pos -= dx; // arrastrar a la derecha mueve la pista a la derecha
      s.moved += Math.abs(dx);
      const instV = -dx;
      s.v = s.v * 0.6 + instV * 0.4;
      if (Math.sign(s.v) !== 0) s.dir = Math.sign(s.v);
    }
    function onUp() {
      if (!s.dragging) return;
      s.dragging = false;
      section.style.cursor = 'grab';
      suppressClick.current = s.moved > 6; // si arrastró, no dispares el link
    }
    section.addEventListener('pointerdown', onDown);
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerup', onUp);
    section.addEventListener('pointercancel', onUp);
    section.addEventListener('pointerleave', onUp);

    let raf;
    function frame() {
      s.t += 1;

      if (!s.dragging) {
        if (reduced) {
          s.v *= 0.9; // sin animación automática: solo inercia del arrastre
        } else {
          s.v += (CRUISE * s.dir - s.v) * 0.03; // vuelve suave a velocidad crucero
        }
        s.pos += s.v;
      }

      const halfW = s.halfW || 1;
      const x = -(((s.pos % halfW) + halfW) % halfW);

      // Estiramiento + inclinación proporcionales a la velocidad (succión).
      const stretch = Math.min(Math.abs(s.v) * 0.012, 0.18);
      const skew = Math.max(-14, Math.min(14, s.v * 0.9));
      track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg) scaleX(${1 + stretch})`;

      // Agua: la ondulación respira sola y se derrite más cuanto más rápido va.
      if (dispRef.current) {
        const waterScale = reduced ? 0 : 6 + Math.min(Math.abs(s.v) * 7, 70);
        dispRef.current.setAttribute('scale', String(Math.round(waterScale)));
      }
      if (turbRef.current && !reduced && s.t % 4 === 0) {
        const bf = 0.010 + Math.sin(s.t * 0.008) * 0.004;
        turbRef.current.setAttribute('baseFrequency', `${bf.toFixed(4)} 0.028`);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      section.removeEventListener('pointerdown', onDown);
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerup', onUp);
      section.removeEventListener('pointercancel', onUp);
      section.removeEventListener('pointerleave', onUp);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Categorías destacadas — arrastra para explorar"
      className="relative select-none overflow-hidden border-y border-neutral-200 bg-ink py-12"
      style={{ cursor: 'grab', touchAction: 'pan-y' }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      {/* Filtro de agua/derretido */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="ed-liquid" x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.010 0.028" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div
        ref={trackRef}
        className="flex w-max items-center gap-8 pl-8 will-change-transform"
        style={{ filter: 'url(#ed-liquid)', transformOrigin: 'center' }}
      >
        {[...Array(2)].map((_, copy) => (
          <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
            {PANELS.map((p) => (
              <Link
                key={`${copy}-${p.cat}`}
                to={`/tienda?categoria=${p.cat}`}
                tabIndex={copy === 1 ? -1 : 0}
                draggable={false}
                className="group relative block h-64 w-52 shrink-0 overflow-hidden"
                style={{ backgroundColor: p.color, borderRadius: p.radius, transform: `rotate(${p.rot})` }}
              >
                <img
                  src={p.img}
                  alt={p.label}
                  draggable={false}
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

      {/* Succión en los bordes: degradados que "tragan" los paneles al entrar y salir */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-ink to-transparent" />

      {/* Texto gigante: invierte el color sobre los paneles al pasar */}
      <h2 className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15vw] font-bold uppercase leading-none tracking-tighter text-white mix-blend-difference sm:text-[10vw]">
        Espacios
      </h2>

      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
        ⇠ arrastra ⇢
      </p>
    </section>
  );
}
