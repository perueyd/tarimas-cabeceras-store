import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';

// Iconos SVG simples de cada red (trazos genéricos, sin logos con copyright).
const SOCIAL_ICONS = {
  instagram: (
    <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 3.05A6.75 6.75 0 1 0 18.75 12 6.75 6.75 0 0 0 12 5.25Zm0 11.13A4.38 4.38 0 1 1 16.38 12 4.38 4.38 0 0 1 12 16.38Zm6.96-11.4a1.58 1.58 0 1 1-1.58-1.58 1.58 1.58 0 0 1 1.58 1.58Z" />
  ),
  facebook: (
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  ),
  tiktok: (
    <path d="M16.5 3c.33 2.5 1.73 4 4.2 4.16v2.87c-1.43.14-2.68-.33-4.14-1.2v5.3c0 5.4-5.88 7.08-8.24 3.2-1.52-2.5-.58-6.88 4.32-7.06v3.02c-.37.06-.77.16-1.14.29-1.1.37-1.72 1.07-1.55 2.3.33 2.35 4.65 3.05 4.29-1.55V3h2.3Z" />
  ),
  youtube: (
    <path d="M23.5 6.5a3 3 0 0 0-2.1-2.13C19.5 3.85 12 3.85 12 3.85s-7.5 0-9.4.52A3 3 0 0 0 .5 6.5 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.13c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52a3 3 0 0 0 2.1-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.5ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
  ),
  x: (
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.96 6.82H1.66l7.73-8.83L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z" />
  ),
};

const SOCIAL_LABEL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', x: 'X' };

function NewsletterForm({ newsletter }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | error
  const [msg, setMsg] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setEstado('enviando');
    setMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo suscribir.');
      setEstado('ok');
      setMsg(data.yaSuscrito ? '¡Ya estabas suscrito! Gracias.' : '¡Listo! Gracias por suscribirte.');
      setEmail('');
    } catch (err) {
      setEstado('error');
      setMsg(err.message);
    }
  }

  return (
    <div className="mb-8 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white shadow-lg">
      <p className="text-base font-semibold">{newsletter.titulo}</p>
      {newsletter.descripcion && <p className="mt-1 text-sm text-neutral-300">{newsletter.descripcion}</p>}
      {estado === 'ok' ? (
        <p className="mt-4 text-sm text-green-300 font-medium">✓ {msg}</p>
      ) : (
        <form onSubmit={enviar} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo electrónico"
            className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40 focus:bg-white/15 transition"
          />
          <button
            type="submit"
            disabled={estado === 'enviando'}
            className="rounded-lg bg-white text-neutral-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-neutral-100 disabled:opacity-60 whitespace-nowrap"
          >
            {estado === 'enviando' ? 'Enviando...' : 'Suscribirse'}
          </button>
        </form>
      )}
      {estado === 'error' && <p className="mt-3 text-xs text-red-300">{msg}</p>}
    </div>
  );
}

export default function Footer() {
  const { storeConfig } = useCatalog();
  const social = storeConfig.social || {};
  const newsletter = storeConfig.newsletter || {};
  const legal = storeConfig.legal || {};
  const redes = Object.keys(SOCIAL_ICONS).filter((k) => social[k]);

  return (
    <footer className="mt-20 border-t border-neutral-100 bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {newsletter.activo && <NewsletterForm newsletter={newsletter} />}

        {redes.length > 0 && (
          <div className="mb-6 flex gap-3">
            {redes.map((k) => (
              <a
                key={k}
                href={social[k]}
                target="_blank"
                rel="noreferrer"
                aria-label={SOCIAL_LABEL[k]}
                title={SOCIAL_LABEL[k]}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 transition hover:bg-neutral-900 hover:text-white hover:border-neutral-900 shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">{SOCIAL_ICONS[k]}</svg>
              </a>
            ))}
          </div>
        )}

        <div className="space-y-2 text-xs sm:text-sm text-neutral-600">
          <p className="font-medium">{storeConfig.footer?.copyright || `© ${new Date().getFullYear()} E|D Espacios y Diseño — Proyectos Inmobiliarios. Todos los derechos reservados.`}</p>
          <p>{storeConfig.footer?.paymentText || '🔒 Pagos seguros con Culqi | Precios en Soles (S/)'}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {(storeConfig.footer?.links || []).map((link) => (
            <Link key={link.url} to={link.url} className="text-neutral-600 hover:text-neutral-900 font-medium transition">
              {link.label}
            </Link>
          ))}
          {legal.privacidadActiva && (
            <Link to="/politica-privacidad" className="text-neutral-600 hover:text-neutral-900 font-medium transition">
              {legal.privacidadTitulo || 'Privacidad'}
            </Link>
          )}
          {legal.terminosActivo && (
            <Link to="/terminos-condiciones" className="text-neutral-600 hover:text-neutral-900 font-medium transition">
              {legal.terminosTitulo || 'Términos'}
            </Link>
          )}
          {/* Poder cambiar de opinión sobre las cookies tiene que ser tan fácil
              como haberlas aceptado: es lo que exige el RGPD y lo que más se
              sanciona cuando falta. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('ed-abrir-cookies'))}
            className="font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
