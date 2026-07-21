import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ShowcaseMarquee from '../components/ShowcaseMarquee.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

// Colores que se muestran como chips interactivos en el hero.
const HERO_COLORS = ['gris', 'beige', 'azul', 'vino', 'negro'];

// Un botón puede apuntar dentro de la web (/tienda) o afuera (https://wa.me/...).
function CtaLink({ to, className, children }) {
  if (/^https?:\/\//i.test(to)) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

const LANDING_DEFAULTS = {
  eyebrow: 'Hecho en Perú · Envíos a todo el país',
  titulo1: 'Tu dormitorio,',
  titulo2: 'en el color que imaginas.',
  descripcion: 'Tarimas, cabeceras y muebles a medida. Toca un color y mira cómo cambia la escena — así de fácil será elegir el tuyo.',
  cta1Label: 'Explorar la tienda',
  cta1Url: '/tienda',
  cta2Label: 'Ver cabeceras',
  cta2Url: '/tienda?categoria=cabeceras',
};

export default function Landing() {
  const { categories, colors, storeConfig, products, currencyFormatter } = useCatalog();
  const landing = { ...LANDING_DEFAULTS, ...(storeConfig.landing || {}) };
  const [heroColor, setHeroColor] = useState(() => colors.find((c) => c.id === 'azul') || colors[0]);
  const sceneRef = useRef(null);
  const revealRefs = useRef([]);

  // Vitrina rotativa: muestra los productos reales del catálogo, uno cada
  // pocos segundos. Se pausa al pasar el mouse y respeta "reducir movimiento".
  const [heroIdx, setHeroIdx] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    if (products.length <= 1) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) setHeroIdx((i) => (i + 1) % products.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [products.length]);
  const heroProduct = products.length ? products[heroIdx % products.length] : null;
  const heroMin = heroProduct ? Math.min(...Object.values(heroProduct.sizePricing || { 0: 0 })) : 0;

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
              {landing.eyebrow}
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl [text-wrap:balance]">
              {landing.titulo1}
              <br />
              <span className="text-neutral-400">{landing.titulo2}</span>
            </h1>
            <p className="mt-5 max-w-md text-neutral-500">
              {landing.descripcion}
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
              <CtaLink
                to={landing.cta1Url}
                className="rounded-lg bg-ink px-7 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                {landing.cta1Label}
              </CtaLink>
              <CtaLink
                to={landing.cta2Url}
                className="rounded-lg border border-neutral-300 px-7 py-3 text-sm font-medium transition hover:border-ink"
              >
                {landing.cta2Label}
              </CtaLink>
            </div>
          </div>

          {/* Vitrina rotativa: los productos reales del catálogo van pasando solos,
              teñidos con el color elegido. Se pausa al pasar el mouse. */}
          <div ref={sceneRef} className="transition-transform duration-300 ease-out will-change-transform">
            {heroProduct && (
              <Link
                to={`/producto/${heroProduct.id}`}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                className="group block"
              >
                <div key={heroProduct.id} className="hero-slide relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                  <div className="relative aspect-[4/3] w-full">
                    <img
                      src={heroProduct.baseImage}
                      alt={heroProduct.name}
                      className="absolute inset-0 h-full w-full object-contain p-6"
                    />
                    {heroProduct.tintable !== false && (
                      <>
                        <div
                          className="absolute inset-0 mix-blend-multiply transition-colors duration-200"
                          style={{ backgroundColor: heroColor.hex }}
                        />
                        <div className="absolute inset-0 bg-white/25 mix-blend-overlay" />
                      </>
                    )}
                  </div>
                  {/* Etiqueta del producto */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-10 text-white">
                    <div>
                      <p className="text-sm font-medium">{heroProduct.name}</p>
                      <p className="text-xs opacity-80">Desde {currencyFormatter.format(heroMin)}</p>
                    </div>
                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-ink transition group-hover:bg-white">
                      Ver producto →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Puntos indicadores */}
            {products.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5">
                {products.map((p, i) => (
                  <button
                    key={p.id}
                    aria-label={`Ver ${p.name}`}
                    onClick={() => setHeroIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === heroIdx % products.length ? 'w-6 bg-ink' : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="mt-2 text-center text-xs text-neutral-400">
              Nuestros muebles — el color se aplica al instante en cada producto.
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
