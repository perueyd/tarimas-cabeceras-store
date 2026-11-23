import { Link } from 'react-router-dom';
import FormularioARCO from '../components/FormularioARCO.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useMeta } from '../lib/meta.js';
import { seccionesDeDevolucion } from '../lib/devoluciones.js';

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

// which: 'privacidad' | 'terminos' | 'devoluciones'
export default function LegalPage({ which }) {
  if (which === 'devoluciones') return <PaginaDeDevoluciones />;
  return <TextoLegal which={which} />;
}

function TextoLegal({ which }) {
  const { storeConfig } = useCatalog();
  const legal = storeConfig.legal || {};
  const activa = which === 'privacidad' ? legal.privacidadActiva : legal.terminosActivo;
  const titulo = which === 'privacidad' ? legal.privacidadTitulo : legal.terminosTitulo;
  const textoRaw = which === 'privacidad' ? legal.privacidadTexto : legal.terminosTexto;

  // Va ANTES del retorno de abajo a propósito: un gancho de React no puede
  // quedar detrás de un `return`, o la página revienta cuando el texto legal
  // está desactivado.
  useMeta({
    titulo: titulo || (which === 'privacidad' ? 'Política de Privacidad' : 'Términos y Condiciones'),
    descripcion:
      which === 'privacidad'
        ? 'Cómo tratamos tus datos personales y cómo ejercer tus derechos, conforme a la Ley 29733.'
        : 'Condiciones de compra, entrega, garantía y devoluciones, conforme a la Ley 29571.',
  });

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
      {/* Los derechos ARCO hay que poder EJERCERLOS, no solo mencionarlos:
          es lo que exige la Ley 29733 y lo que la ANPD sanciona cuando falta. */}
      {which === 'privacidad' && <FormularioARCO />}

      <Link to="/" className="mt-8 inline-block text-sm text-sky-700 underline">← Volver al inicio</Link>
    </main>
  );
}

/** Cambios y devoluciones: las secciones de los Términos que tratan de eso (ver src/lib/devoluciones.js). */
function PaginaDeDevoluciones() {
  const { storeConfig } = useCatalog();
  const legal = storeConfig.legal || {};
  const secciones = legal.terminosActivo === false ? [] : seccionesDeDevolucion(sustituir(legal.terminosTexto, storeConfig));
  useMeta({
    titulo: 'Cambios y devoluciones',
    descripcion: 'Cuándo y cómo cambiamos, reparamos o devolvemos el dinero de tu compra, y qué cubre la garantía.',
  });
  if (!secciones.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-neutral-500">Esta página no está disponible.</p>
        <Link to="/" className="mt-4 inline-block underline">Volver al inicio</Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Cambios y devoluciones</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Esto es parte de nuestros{' '}
        <Link to="/terminos-condiciones" className="underline">Términos y Condiciones</Link>.
      </p>
      {secciones.map((sec) => (
        <section key={sec.titulo} className="mt-6">
          <h2 className="text-base font-semibold">{sec.titulo.charAt(0) + sec.titulo.slice(1).toLowerCase()}</h2>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-700">
            {sec.texto.split('\n\n').map((parrafo, i) => (
              <p key={i} className="whitespace-pre-line">{parrafo}</p>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-8 text-sm text-neutral-600">
        Para pedir un cambio, una reparación o la devolución de tu dinero, escríbenos por WhatsApp
        {storeConfig.contacto?.telefonoFormato ? ` al ${storeConfig.contacto.telefonoFormato}` : ''} con tu número de pedido y
        fotos. Si no quedas conforme, tienes a tu disposición nuestro{' '}
        <Link to="/libro-de-reclamaciones" className="underline">Libro de Reclamaciones</Link>.
      </p>
      <Link to="/" className="mt-8 inline-block text-sm text-sky-700 underline">← Volver al inicio</Link>
    </main>
  );
}
