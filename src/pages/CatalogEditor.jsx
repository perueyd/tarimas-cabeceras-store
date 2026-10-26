import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import BrandingTab from './BrandingTab.jsx';
import PagosTab from './PagosTab.jsx';
import EntregaTab from './EntregaTab.jsx';
import IntegrationsTab from './IntegrationsTab.jsx';
import SecurityTab from './SecurityTab.jsx';
import GarantiasTab from './GarantiasTab.jsx';
import ChatbotTab from './ChatbotTab.jsx';
import RespaldosTab from './RespaldosTab.jsx';
import PestanasAgrupadas from '../components/PestanasAgrupadas.jsx';
import VistaPrevia from '../components/VistaPrevia.jsx';

import { CategoriasTab, ColoresTab, TamanosTab } from './editor/BasicosTab.jsx';
import { PortadaTab, VitrinaTab } from './editor/PortadaTab.jsx';
import { ProductosTab } from './editor/ProductosTab.jsx';
import { ConfigTab, EncuestaTab, FaqTab, LegalTab } from './editor/TextosTab.jsx';

export default function CatalogEditor({ adminKey, irA }) {
  const catalog = useCatalog();
  const [sub, setSub] = useState('productos');
  // JARVIS puede pedir abrir una sub-pestaña concreta desde el panel.
  useEffect(() => { if (irA) setSub(irA); }, [irA]);
  // Sube cada vez que se guarda algo: la vista previa lo usa para refrescarse.
  const [guardadoToken, setGuardadoToken] = useState(0);
  const [verPrevia, setVerPrevia] = useState(false);
  const [msg, setMsg] = useState(null); // { text, undo? }

  // flash(texto) muestra un aviso 2.5 s. flash(texto, fn) agrega un botón
  // "Deshacer" que corre fn (para recuperar algo recién borrado) durante 8 s.
  function flash(text, undo) {
    setMsg({ text, undo });
    setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), undo ? 8000 : 2500);
  }
  async function deshacer() {
    if (!msg?.undo) return;
    const fn = msg.undo;
    setMsg(null);
    try { await fn(); } catch (err) { alert(err.message); }
  }

  async function api(method, resource, body, extraQuery = '') {
    const res = await fetch(`/api/catalog?resource=${resource}${extraQuery}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'No se pudo guardar.');
    await catalog.refetch();
    // Todo lo que se guarda pasa por aquí, así que este es el sitio para
    // avisar a la vista previa de que hay algo nuevo que mostrar.
    setGuardadoToken((n) => n + 1);
    return data;
  }

  return (
    <div className={verPrevia ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-6' : ''}>
      <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <span>
          Los cambios aquí se aplican al instante en toda la tienda (productos, precios, colores y
          datos de contacto) — no necesitas editar código ni esperar un deploy.
        </span>
        <button
          onClick={() => setVerPrevia((v) => !v)}
          className={`flex-shrink-0 rounded-lg border px-3 py-1.5 font-medium transition ${
            verPrevia ? 'border-ink bg-ink text-white' : 'border-sky-300 bg-white hover:border-ink'
          }`}
        >
          {verPrevia ? '✕ Ocultar vista previa' : '👁️ Ver cómo queda'}
        </button>
      </div>

      {msg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
          <span>{msg.text}</span>
          {msg.undo && (
            <button
              onClick={deshacer}
              className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
            >
              ↩ Deshacer
            </button>
          )}
        </div>
      )}

      {/* Dieciocho pestañas sueltas, agrupadas por la pregunta que responden:
          qué vendo · cómo se ve · cómo funciona · lo delicado. */}
      <PestanasAgrupadas
        activa={sub}
        onElegir={setSub}
        grupos={[
          {
            id: 'catalogo',
            label: 'Qué vendo',
            items: [
              { id: 'productos', label: 'Productos', aviso: catalog.products.length },
              { id: 'categorias', label: 'Categorías' },
              { id: 'colores', label: 'Colores' },
              { id: 'tamanos', label: 'Tamaños' },
            ],
          },
          {
            id: 'apariencia',
            label: 'Cómo se ve',
            items: [
              { id: 'branding', label: 'Branding' },
              { id: 'portada', label: 'Página principal' },
              { id: 'vitrina', label: 'Vitrina animada' },
              { id: 'garantias', label: 'Garantías de portada' },
            ],
          },
          {
            id: 'funciona',
            label: 'Cómo funciona',
            items: [
              { id: 'config', label: 'Datos de la tienda' },
              { id: 'pagos', label: 'Pagos' },
              { id: 'entrega', label: 'Entrega' },
              { id: 'faq', label: 'Preguntas' },
              { id: 'encuesta', label: 'Encuesta' },
            ],
          },
          {
            id: 'avanzado',
            label: 'Ajustes delicados',
            items: [
              { id: 'chatbot', label: 'Entrenar chatbot' },
              { id: 'respaldos', label: 'Copias de seguridad' },
              { id: 'legal', label: 'Legal' },
              { id: 'integraciones', label: 'Integraciones' },
              { id: 'security', label: 'Seguridad' },
            ],
          },
        ]}
      />

      {sub === 'branding' && <BrandingTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'productos' && <ProductosTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'categorias' && <CategoriasTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'colores' && <ColoresTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'tamanos' && <TamanosTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'config' && <ConfigTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'garantias' && <GarantiasTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'chatbot' && <ChatbotTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'pagos' && <PagosTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'entrega' && <EntregaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'integraciones' && <IntegrationsTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'security' && <SecurityTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'portada' && <PortadaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'faq' && <FaqTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'vitrina' && <VitrinaTab catalog={catalog} api={api} flash={flash} adminKey={adminKey} />}
      {sub === 'legal' && <LegalTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'encuesta' && <EncuestaTab catalog={catalog} api={api} flash={flash} />}
      {sub === 'respaldos' && <RespaldosTab catalog={catalog} adminKey={adminKey} flash={flash} />}
      </div>

      {/* Vista previa pegada al lado: en pantallas grandes se queda fija
          mientras se hace scroll por el editor. */}
      {verPrevia && (
        <aside className="mt-6 lg:sticky lg:top-4 lg:mt-0 lg:h-[calc(100vh-2rem)]">
          <VistaPrevia
            recargarToken={guardadoToken}
            productoEjemplo={catalog.products?.find((p) => !p.oculto)?.id}
          />
        </aside>
      )}
    </div>
  );
}

