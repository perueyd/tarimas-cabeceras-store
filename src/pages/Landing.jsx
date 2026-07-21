import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ShowcaseMarquee from '../components/ShowcaseMarquee.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

// Colores que se muestran como chips interactivos en el hero.
const HERO_COLORS = ['gris', 'beige', 'azul', 'vino', 'negro'];

export default function Landing() {
  const { categories, colors } = useCatalog();
  const [heroColor, setHeroColor] = useState(() => colors.find((c) => c.id === 'azul') || colors[0]);
  const sceneRef = useRef(null);
  const revealRefs = useRef([]);

  // Parallax sutil con el mouse (desactivado si el usuario prefiere menos movimiento).
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    function onMove(e) {
      const el = sceneRef.current;
      if (!el) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 10;
      const y = (e.clientY / innerHeight - 0.5) * 6;
      el.style.transform = `translate(${x}px, ${y}px)`;
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Aparición de secciones al hacer scroll.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        }),
      { threshold: 0.15 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addReveal = (el) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-neutral-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-widest text-neutral-500">
              Hecho en Perú · Envíos a todo el país
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">
              Tu dormitorio,
              <br />
              <span className="text-neutral-400">en el color que imaginas.</span>
            </h1>
            <p className="mt-5 max-w-md text-neutral-500">
              Tarimas, cabeceras y muebles a medida. Toca un color y mira cómo cambia
              la escena — así de fácil será elegir el tuyo.
            </p>

            {/* Chips de color interactivos */}
            <div className="mt-8 flex items-center gap-3">
              {HERO_COLORS.map((id) => {
                const c = colors.find((k) => k.id === id);
                return (
                  <button
                    key={id}
                    aria-label={`Ver en color ${c.label}`}
                    title={c.label}
                    onClick={() => setHeroColor(c)}
                    className={`h-10 w-10 rounded-full border border-black/10 transition-transform hover:scale-110 ${
                      heroColor.id === id ? 'scale-110 ring-2 ring-ink ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
              <span className="ml-2 text-sm text-neutral-500">{heroColor.label}</span>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/tienda"
                className="rounded-lg bg-ink px-7 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Explorar la tienda
              </Link>
              <Link
                to="/tienda?categoria=cabeceras"
                className="rounded-lg border border-neutral-300 px-7 py-3 text-sm font-medium transition hover:border-ink"
              >
                Ver cabeceras
              </Link>
            </div>
          </div>

          {/* Escena del dormitorio que se tiñe con el color elegido */}
          <div ref={sceneRef} className="transition-transform duration-300 ease-out will-change-transform">
            <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
              <svg viewBox="0 0 600 440" className="block w-full" aria-hidden="true">
                {/* pared y piso */}
                <rect x="0" y="0" width="600" height="330" fill="#efece6" />
                <rect x="0" y="330" width="600" height="110" fill="#e2ddd3" />
                {/* cabecera */}
                <rect x="120" y="80" width="360" height="180" rx="20" fill="#cfcfcf" />
                <rect x="150" y="105" width="90" height="130" rx="12" fill="#ffffff" opacity="0.16" />
                <rect x="255" y="105" width="90" height="130" rx="12" fill="#ffffff" opacity="0.16" />
                <rect x="360" y="105" width="90" height="130" rx="12" fill="#ffffff" opacity="0.16" />
                {/* colchón y sábanas (no se tiñen) */}
                <rect x="105" y="235" width="390" height="60" rx="14" fill="#ffffff" />
                <rect x="105" y="255" width="390" height="40" rx="12" fill="#f4f2ee" />
                {/* tarima */}
                <rect x="90" y="290" width="420" height="58" rx="12" fill="#cfcfcf" />
                <rect x="110" y="348" width="16" height="42" rx="4" fill="#9a9a9a" />
                <rect x="474" y="348" width="16" height="42" rx="4" fill="#9a9a9a" />
                {/* almohadas */}
                <rect x="150" y="200" width="130" height="48" rx="16" fill="#ffffff" />
                <rect x="320" y="200" width="130" height="48" rx="16" fill="#ffffff" />
              </svg>
              {/* capa de tinte: solo cubre cabecera y tarima mediante máscara SVG */}
              <svg viewBox="0 0 600 440" className="absolute inset-0 block w-full mix-blend-multiply transition-colors duration-200" aria-hidden="true">
                <rect x="120" y="80" width="360" height="180" rx="20" fill={heroColor.hex} />
                <rect x="90" y="290" width="420" height="58" rx="12" fill={heroColor.hex} />
              </svg>
              <div className="pointer-events-none absolute inset-0 bg-white/20 mix-blend-overlay" />
            </div>
            <p className="mt-3 text-center text-xs text-neutral-400">
              Vista referencial — el color se aplica igual en cada producto de la tienda.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SHOWCASE ANIMADO DE CATEGORÍAS ================= */}
      <ShowcaseMarquee />

      {/* ================= CATEGORÍAS ================= */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div ref={addReveal} className="reveal">
          <h2 className="text-2xl font-semibold tracking-tight">Todo para tu hogar</h2>
          <p className="mt-2 max-w-xl text-neutral-500">
            Empezamos con tarimas y cabeceras. Muy pronto: melamina, salas, comedores y sofás cama.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const inner = (
              <div
                ref={addReveal}
                className="reveal group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-ink"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium">{cat.label}</h3>
                  {cat.active ? (
                    <span className="translate-x-1 text-xl transition-transform group-hover:translate-x-2">→</span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-500">
                  {cat.active
                    ? 'Disponible ahora — elige tamaño y color.'
                    : 'Estamos preparando esta línea. Vuelve pronto.'}
                </p>
              </div>
            );
            return cat.active ? (
              <Link key={cat.id} to={`/tienda?categoria=${cat.id}`}>{inner}</Link>
            ) : (
              <div key={cat.id} className="cursor-default opacity-80">{inner}</div>
            );
          })}
        </div>
      </section>

      {/* ================= CÓMO FUNCIONA ================= */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 ref={addReveal} className="reveal text-2xl font-semibold tracking-tight">
            Comprar es simple
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ['Elige y personaliza', 'Selecciona el modelo, el tamaño y el color que combine con tu espacio.'],
              ['Paga seguro', 'Con tarjeta o Yape a través de Culqi, en soles y sin complicaciones.'],
              ['Recíbelo en casa', 'Coordinamos la entrega e instalación según tu distrito.'],
            ].map(([title, body], i) => (
              <div
                key={title}
                ref={addReveal}
                className="reveal rounded-xl border border-neutral-200 p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="text-sm font-semibold text-neutral-400">{i + 1}</span>
                <h3 className="mt-2 font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>

          <div ref={addReveal} className="reveal mt-12 text-center">
            <Link
              to="/tienda"
              className="inline-block rounded-lg bg-ink px-8 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Ir a la tienda
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
