import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Marquee "líquido" estilo slide-mask (inspirado en los marquees de papel rasgado):
//  - Fondo claro con formas orgánicas tipo papel rasgado deslizándose.
//  - Texto gigante con mix-blend-difference: se ve negro sobre el fondo claro y se
//    invierte de color cuando cada panel pasa por detrás.
//  - Arrastrable en ambas direcciones con inercia; al soltar mantiene la dirección.
//  - La pista se estira/inclina con la velocidad y los bordes ondulan como agua
//    (más intenso cuanto más rápido, sutil en reposo).
//  - Cada panel flota suavemente, con ritmos distintos.
const PANELS = [
  {
    img: '/images/tarima-base.svg', color: '#3b5a70', cat: 'tarimas', label: 'Tarimas',
    size: 'h-64 w-56', rot: '-2deg', delay: '0s',
    clip: 'polygon(48% 2%, 68% 6%, 84% 15%, 95% 33%, 98% 55%, 91% 74%, 77% 90%, 56% 98%, 35% 95%, 17% 86%, 5% 68%, 2% 45%, 9% 25%, 24% 9%)',
  },
  {
    img: '/images/cabecera-base.svg', color: '#6e2a35', cat: 'cabeceras', label: 'Cabeceras',
    size: 'h-56 w-48', rot: '2deg', delay: '-1.6s',
    clip: 'polygon(42% 4%, 63% 2%, 82% 10%, 94% 26%, 97% 48%, 93% 68%, 82% 86%, 62% 97%, 40% 98%, 20% 90%, 6% 73%, 2% 50%, 6% 28%, 20% 12%)',
  },
  {
    img: '/images/sofa-base.svg', color: '#7a5638', cat: 'sofas-cama', label: 'Sofás Cama',
    size: 'h-72 w-60', rot: '-1.5deg', delay: '-3.2s',
    clip: 'polygon(50% 1%, 72% 8%, 88% 20%, 96% 38%, 97% 58%, 89% 78%, 73% 92%, 52% 98%, 30% 96%, 12% 84%, 3% 64%, 2% 42%, 10% 22%, 28% 7%)',
  },
  {
    img: '/images/comedor-base.svg', color: '#8b8d91', cat: 'salas', label: 'Sala y Comedor',
    size: 'h-56 w-52', rot: '1.5deg', delay: '-2.4s',
    clip: 'polygon(45% 3%, 66% 4%, 85% 13%, 95% 30%, 98% 52%, 92% 72%, 79% 88%, 58% 97%, 37% 97%, 18% 88%, 5% 70%, 2% 47%, 8% 26%, 23% 10%)',
  },
  {
    img: '/images/ropero-base.svg', color: '#b08a5a', cat: 'melamina', label: 'Melamina',
    size: 'h-64 w-52', rot: '-2.5deg', delay: '-4s',
    clip: 'polygon(47% 2%, 69% 7%, 86% 17%, 96% 35%, 97% 57%, 90% 76%, 75% 91%, 54% 98%, 33% 94%, 15% 84%, 4% 66%, 3% 43%, 10% 23%, 26% 8%)',
  },
];

const CRUISE = 0.7; // velocidad crucero en px por frame (~42 px/s)

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
          s.v *= 0.9; // sin animación automática: solo la inercia del arrastre
        } else {
          s.v += (CRUISE * s.dir - s.v) * 0.025; // vuelve suave a velocidad crucero
        }
        s.pos += s.v;
      }

      const halfW = s.halfW || 1;
      const x = -(((s.pos % halfW) + halfW) % halfW);

      // Estiramiento + inclinación proporcionales a la velocidad (succión).
      const stretch = Math.min(Math.abs(s.v) * 0.010, 0.14);
      const skew = Math.max(-12, Math.min(12, s.v * 0.7));
      track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg) scaleX(${1 + stretch})`;

      // Agua: sutil en reposo, se derrite con la velocidad (con tope elegante).
      if (dispRef.current) {
        const waterScale = reduced ? 0 : 5 + Math.min(Math.abs(s.v) * 5, 40);
        dispRef.current.setAttribute('scale', waterScale.toFixed(1));
      }
      // La ondulación respira continua y suave (sin saltos).
      if (turbRef.current && !reduced) {
        const bf = 0.011 + Math.sin(s.t * 0.006) * 0.003;
        turbRef.current.setAttribute('baseFrequency', `${bf.toFixed(4)} 0.026`);
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
      className="relative select-none overflow-hidden border-y border-neutral-200 bg-paper py-16"
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
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.011 0.026" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div
        ref={trackRef}
        className="flex w-max items-center gap-10 pl-10 will-change-transform"
        style={{ filter: 'url(#ed-liquid)', transformOrigin: 'center' }}
      >
        {[...Array(2)].map((_, copy) => (
          <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
            {PANELS.map((p) => (
              <Link
                key={`${copy}-${p.cat}`}
                to={`/tienda?categoria=${p.cat}`}
                aria-label={p.label}
                title={p.label}
                tabIndex={copy === 1 ? -1 : 0}
                draggable={false}
                className={`ed-panel relative block shrink-0 overflow-hidden ${p.size}`}
                style={{
                  '--rot': p.rot,
                  backgroundColor: p.color,
                  clipPath: p.clip,
                  animationDelay: p.delay,
                }}
              >
                <img
                  src={p.img}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain p-7 mix-blend-multiply opacity-90"
                />
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Succión en los bordes */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-paper to-transparent" />

      {/* Texto gigante: negro sobre el fondo claro, se invierte al pasar cada panel */}
      <h2 className="pointer-events-none absolute inset-0 flex items-center justify-center text-[16vw] font-extrabold uppercase leading-none tracking-tighter text-white mix-blend-difference sm:text-[11vw]">
        Espacios
      </h2>

      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] uppercase tracking-[0.3em] text-neutral-400">
        ⇠ arrastra ⇢
      </p>
    </section>
  );
}
