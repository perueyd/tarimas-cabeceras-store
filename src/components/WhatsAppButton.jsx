import { storeConfig } from '../data/catalog.js';

// Botón flotante de WhatsApp. Solo aparece si storeConfig.whatsapp tiene un número.
export default function WhatsAppButton() {
  if (!storeConfig.whatsapp) return null;

  const mensaje = encodeURIComponent('Hola, vengo de la página web y quiero hacer una consulta.');

  return (
    <a
      href={`https://wa.me/${storeConfig.whatsapp}?text=${mensaje}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.9 5 2.3 7L4.5 28l6.3-1.8c1.6.8 3.3 1.3 5.2 1.3 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.6c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3.5 1 1-3.4-.2-.3c-1-1.5-1.6-3.3-1.6-5.2 0-5.2 4.2-9.4 9.3-9.4s9.3 4.2 9.3 9.4-4.2 9.4-9.3 9.4zm5.2-7c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4 0-.1-.2-.2-.5-.3z" />
      </svg>
    </a>
  );
}
