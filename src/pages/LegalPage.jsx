import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';

// Reemplaza {{proveedor}} y {{whatsapp}} en el texto legal con los datos
// reales de la tienda, así el dueño no tiene que repetirlos a mano.
function proveedorTexto(storeConfig) {
  const partes = [];
  if (storeConfig.razonSocial) partes.push(storeConfig.razonSocial);
  else partes.push('el titular de esta tienda');
  if (storeConfig.ruc) partes.push(`(RUC ${storeConfig.ruc})`);
  if (storeConfig.direccionFiscal) partes.push(`, con domicilio en ${storeConfig.direccionFiscal}`);
  // "Nombre (RUC ...), con domicilio en ..." — se une con espacios menos la coma.
  return partes.join(' ').replace(' ,', ',');
}

function sustituir(texto, storeConfig) {
  return (texto || '')
    .replaceAll('{{proveedor}}', proveedorTexto(storeConfig))
    .replaceAll('{{whatsapp}}', storeConfig.whatsapp || 'nuestro WhatsApp');
}

// which: 'privacidad' | 'terminos'
export default function LegalPage({ which }) {
  const { storeConfig } = useCatalog();
  const legal = storeConfig.legal || {};
  const activa = which === 'privacidad' ? legal.privacidadActiva : legal.terminosActivo;
  const titulo = which === 'privacidad' ? legal.privacidadTitulo : legal.terminosTitulo;
  const textoRaw = which === 'privacidad' ? legal.privacidadTexto : legal.terminosTexto;

  if (activa === false || !textoRaw) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-neutral-500">Esta página no está disponible.</p>
        <Link to="/" className="mt-4 inline-block underline">Volver al inicio</Link>
      </main>
    );
  }

  const texto = sustituir(textoRaw, storeConfig);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo || 'Información legal'}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-700">
        {texto.split('\n\n').map((parrafo, i) => (
          <p key={i} className="whitespace-pre-line">{parrafo}</p>
        ))}
      </div>
      <Link to="/" className="mt-8 inline-block text-sm text-sky-700 underline">← Volver al inicio</Link>
    </main>
  );
}
