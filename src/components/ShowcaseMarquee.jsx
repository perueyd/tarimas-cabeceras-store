import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';

// Marquee 3D tipo "rueda" con física:
//  - Los paneles no pasan planos: giran como un carrusel 3D (los de los bordes se
//    voltean y se hunden hacia atrás, el del centro mira de frente).
//  - Arrastrable en ambas direcciones con inercia; clic en un panel lleva a su categoría.
//  - Al pasar el cursor sobre un panel, se mece como un barco en el mar.
//  - Bordes orgánicos suaves (curvas, no picos) con una ondulación líquida sutil.
//
// El contenido de cada panel (imagen, color, nombre, categoría) es editable
// desde el panel → Editar página → Vitrina animada (catalog.showcase). Los
// valores de abajo son solo la "forma" decorativa (tamaño, giro, blob) — se
// asignan por posición (ciclando esta lista) para que cualquier cantidad de
// paneles se vea variada sin que el dueño tenga que configurar CSS.
const PANEL_STYLE_PRESETS = [
  { size: 'h-64 w-56', rot: '-2deg', delay: '0s', blob: '58% 42% 50% 50% / 46% 54% 46% 54%' },
  { size: 'h-56 w-48', rot: '2deg', delay: '-1.6s', blob: '44% 56% 52% 48% / 55% 45% 55% 45%' },
  { size: 'h-72 w-60', rot: '-1.5deg', delay: '-3.2s', blob: '52% 48% 44% 56% / 48% 52% 48% 52%' },
  { size: 'h-56 w-52', rot: '1.5deg', delay: '-2.4s', blob: '46% 54% 58% 42% / 52% 48% 52% 48%' },
  { size: 'h-64 w-52', rot: '-2.5deg', delay: '-4s', blob: '55% 45% 46% 54% / 44% 56% 44% 56%' },
];

const CRUISE = 0.7; // velocidad crucero en px por frame (~42 px/s)

export default function ShowcaseMarquee() {
  const { storeConfig, showcase } = useCatalog();
  const marqueeWord = storeConfig.landing?.marqueeWord || 'Espacios';
  const panelsData = showcase.map((p, i) => ({ ...p, style: PANEL_STYLE_PRESETS[i % PANEL_STYLE_PRESETS.length] }));
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
      pressed: false,
      dragging: false,
      lastX: 0,
      moved: 0,
      halfW: track.scrollWidth / 2,
      sectionW: section.clientWidth,
      t: 0,
    };

    // Posición (en el layout) del centro de cada panel, para la proyección 3D.
    let panels = Array.from(track.querySelectorAll('a[data-panel]')).map((el) => ({
      el,
      center: el.offsetLeft + el.offsetWidth / 2,
    }));

    const onResize = () => {
      s.halfW = track.scrollWidth / 2;
      s.sectionW = section.clientWidth;
      panels = Array.from(track.querySelectorAll('a[data-panel]')).map((el) => ({
        el,
        center: el.offsetLeft + el.offsetWidth / 2,
      }));
    };
    window.addEventListener('resize', onResize);

    function onDown(e) {
      s.pressed = true;
      s.dragging = false;
      s.lastX = e.clientX;
      s.moved = 0;
      s.pointerId = e.pointerId;
    }
    function onMove(e) {
      if (!s.pressed) return;
      const dx = e.clientX - s.lastX;
      s.lastX = e.clientX;
      if (!s.dragging) {
        s.moved += Math.abs(dx);
        // Solo se vuelve arrastre tras superar un umbral: así el clic simple
        // llega intacto al panel y navega a su categoría.
        if (s.moved > 6) {
          s.dragging = true;
          try { section.setPointerCapture(s.pointerId); } catch { /* no-op */ }
          section.style.cursor = 'grabbing';
        }
        return;
      }
      s.pos -= dx;
      const instV = -dx;
      s.v = s.v * 0.6 + instV * 0.4;
      if (Math.sign(s.v) !== 0) s.dir = Math.sign(s.v);
    }
    function onUp() {
      if (s.dragging) suppressClick.current = true;
      s.pressed = false;
      s.dragging = false;
      section.style.cursor = 'grab';
    }
    section.addEventListener('pointerdown', onDown);
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerup', onUp);
    section.addEventListener('pointercancel', onUp);

    let raf;
    function frame() {
      s.t += 1;

      if (!s.dragging) {
        if (reduced) {
          s.v *= 0.9;
        } else {
          s.v += (CRUISE * s.dir - s.v) * 0.025;
        }
        s.pos += s.v;
      }

      const halfW = s.halfW || 1;
      const x = -(((s.pos % halfW) + halfW) % halfW);

      // Estiramiento + inclinación sutiles según velocidad.
      const stretch = Math.min(Math.abs(s.v) * 0.006, 0.08);
      const skew = Math.max(-8, Math.min(8, s.v * 0.45));
      track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg) scaleX(${1 + stretch})`;

      // RUEDA 3D: cada panel gira y se hunde según su distancia al centro visible.
      const half = s.sectionW / 2 || 1;
      for (const p of panels) {
        const screenX = p.center + x;
        let norm = (screenX - half) / half; // -1 izquierda, 0 centro, +1 derecha
        norm = Math.max(-1.4, Math.min(1.4, norm));
        const ry = -norm * 42; // giro de rueda
        const tz = -Math.abs(norm) * 150; // los bordes se alejan (cilindro)
        const ty = Math.abs(norm) * 14; // leve caída en los extremos
        p.el.style.transform = `translateY(${ty}px) rotateY(${ry}deg) translateZ(${tz}px)`;
      }

      // Agua: sutil en reposo, un poco más viva al arrastrar (sin exagerar).
      if (dispRef.current) {
        const waterScale = reduced ? 0 : 4 + Math.min(Math.abs(s.v) * 3, 18);
        dispRef.current.setAttribute('scale', waterScale.toFixed(1));
      }
      if (turbRef.current && !reduced) {
        const bf = 0.009 + Math.sin(s.t * 0.005) * 0.002;
        turbRef.current.setAttribute('baseFrequency', `${bf.toFixed(4)} 0.02`);
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
    };
  }, [showcase]);

  if (panelsData.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      aria-label="Categorías destacadas — arrastra para girar, toca para entrar"
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
      {/* Filtro de agua (suave) */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="ed-liquid" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.009 0.02" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div
        ref={trackRef}
        className="flex w-max items-center gap-10 pl-10 will-change-transform"
        style={{ perspective: '1100px' }}
      >
        {[...Array(2)].map((_, copy) => (
          <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
            {panelsData.map((p) => (
              <Link
                key={`${copy}-${p.id}`}
                to={p.cat ? `/tienda?categoria=${p.cat}` : '/tienda'}
                data-panel
                aria-label={`Ver catálogo de ${p.label}`}
                title={`Ver ${p.label}`}
                tabIndex={copy === 1 ? -1 : 0}
                draggable={false}
                className={`relative block shrink-0 will-change-transform ${p.style.size}`}
              >
                {/* Capa que flota / se mece como barco al pasar el cursor */}
                <div
                  className="ed-float absolute inset-0"
                  style={{ '--rot': p.style.rot, animationDelay: p.style.delay }}
                >
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ backgroundColor: p.color, borderRadius: p.style.blob, filter: 'url(#ed-liquid)' }}
                  >
                    {p.img && (
                      <img
                        src={p.img}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-contain p-7 mix-blend-multiply opacity-90"
                      />
                    )}
                  </div>
                  <span className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-white/85 px-3 py-1 text-center text-xs font-medium text-neutral-800 backdrop-blur-sm">
                    {p.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Succión en los bordes */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-paper to-transparent" />

      {/* Texto gigante: negro sobre fondo claro, se invierte al pasar cada panel */}
      <h2 className="pointer-events-none absolute inset-0 flex items-center justify-center text-[16vw] font-extrabold uppercase leading-none tracking-tighter text-white mix-blend-difference sm:text-[11vw]">
        {marqueeWord}
      </h2>

      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] uppercase tracking-[0.3em] text-neutral-400">
        ⇠ arrastra o toca un panel ⇢
      </p>
    </section>
  );
}
