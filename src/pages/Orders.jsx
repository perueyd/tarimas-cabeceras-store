import { useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';
import BarraPanel, { TituloSeccion } from '../components/BarraPanel.jsx';
import { Stars } from './ProductDetail.jsx';
import CatalogEditor from './CatalogEditor.jsx';
import MegaOfertasEditor from './MegaOfertasEditor.jsx';
import HistorialCodigosTab from './HistorialCodigosTab.jsx';
import AnalyticsOfertasTab from './AnalyticsOfertasTab.jsx';
import PromoEditor from './PromoEditor.jsx';
import DescuentosAutoEditor from './DescuentosAutoEditor.jsx';
import JarvisVoice from '../components/JarvisVoice.jsx';
import QueHacerHoy from '../components/QueHacerHoy.jsx';
import PestanasAgrupadas from '../components/PestanasAgrupadas.jsx';
import { urlSeguimiento } from '../data/sitio.js';
import ImpuestosTab from './ImpuestosTab.jsx';
import { separarIGV } from '../lib/igv.js';
import { etiquetaComprobante } from '../lib/documento.js';
import VisitasTab from './VisitasTab.jsx';
// Las piezas del panel viven en src/pages/panel/: la ficha de pedido, la de
// reclamo, las gráficas, las descargas y la sesión. Orders.jsx se queda solo
// con la página — qué datos pide y qué pestaña enseña.
import { descargarHoja, descargarSuscriptores } from './panel/descargas.js';
import { GraficaVentasPorDia, GraficaVentasPorProducto } from './panel/Graficas.jsx';
import { PedidoCard } from './panel/PedidoCard.jsx';
import { ReclamoCard } from './panel/ReclamoCard.jsx';
import { CLAVE_STORAGE, guardarClave, leerClaveGuardada } from './panel/sesion.js';
import FiltroPedidos from './panel/FiltroPedidos.jsx';
import { esVenta, filtrarPedidos } from '../lib/pedidos.js';


export default function Orders() {
  const { currencyFormatter, getColorById, getSizeById, getProductById, storeConfig } = useCatalog();
  const [key, setKey] = useState(leerClaveGuardada);
  const [input, setInput] = useState('');

  // Cerrar sesión. Antes no existía: para salir había que cerrar la pestaña o
  // esperar las 8 horas de caducidad, y en una computadora compartida eso deja
  // el negocio abierto a quien se siente después.
  function salir() {
    try {
      sessionStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // Almacenamiento bloqueado: igualmente se limpia la clave en memoria.
    }
    setKey('');
    setInput('');
  }
  const [orders, setOrders] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reclamos, setReclamos] = useState([]);
  const [suscriptores, setSuscriptores] = useState([]);
  const [encuestas, setEncuestas] = useState([]);
  const [carritos, setCarritos] = useState([]);
  // Solicitudes de derechos ARCO: tienen plazo legal, por eso salen en el resumen.
  const [arco, setArco] = useState([]);
  // Cuándo bajó por última vez una copia del catálogo a su computadora.
  const [ultimaDescarga, setUltimaDescarga] = useState(undefined); // undefined = aún no se sabe
  const [avisoNuevos, setAvisoNuevos] = useState(0); // pedidos nuevos detectados en vivo
  const conocidosRef = useRef(null); // Set de códigos ya vistos (null = sin inicializar)
  const [tab, setTab] = useState('resumen');
  // Sub-pestaña del editor que JARVIS puede pedir abrir (ej. "productos").
  const [subEditor, setSubEditor] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  // La ejecuta JARVIS cuando le piden abrir una parte del panel. Devuelve
  // false si la sección no existe, para que pueda decir "no encontré eso"
  // en vez de afirmar que ya te llevó.
  function abrirSeccion(seccion, subseccion) {
    if (!SECCIONES_VALIDAS.has(seccion)) return false;
    setTab(seccion);
    if (seccion === 'editar' && subseccion) setSubEditor(subseccion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null); // reseña en edición {id, estrellas, comentario}

  async function cargar(k) {
    setLoading(true);
    setError('');
    const authHeader = { Authorization: `Bearer ${k}` };
    try {
      const res = await fetch('/api/orders', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setOrders(data.orders);
      guardarClave(k);
      setKey(k);
      fetch('/api/reviews?all=1', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setReviews(d.reviews || []))
        .catch(() => {});
      fetch('/api/respaldos', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setUltimaDescarga(d.ultimaDescarga || null))
        .catch(() => {});
      fetch('/api/derechos-arco', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setArco(d.solicitudes || []))
        .catch(() => {});
      fetch('/api/reclamos', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setReclamos(d.reclamos || []))
        .catch(() => {});
      fetch('/api/newsletter', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setSuscriptores(d.suscriptores || []))
        .catch(() => {});
      fetch('/api/encuesta', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setEncuestas(d.encuestas || []))
        .catch(() => {});
      fetch('/api/carritos', { headers: authHeader })
        .then((r) => r.json())
        .then((d) => setCarritos(d.carritos || []))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guarda los códigos ya vistos la primera vez que cargan los pedidos.
  useEffect(() => {
    if (orders && conocidosRef.current === null) {
      conocidosRef.current = new Set(orders.map((o) => o.code));
    }
  }, [orders]);

  // Aviso de pedido nuevo EN VIVO mientras el panel está abierto: revisa cada
  // 60 s y, si entró un pedido, suena un pitido, muestra un aviso y (si el
  // navegador lo permite) una notificación del sistema. Ideal para tener el
  // panel abierto en la tienda.
  useEffect(() => {
    if (!key) return undefined;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    function pitido() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch { /* algunos navegadores bloquean el audio sin interacción */ }
    }
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) return;
        const data = await res.json();
        const lista = data.orders || [];
        if (!conocidosRef.current) {
          conocidosRef.current = new Set(lista.map((o) => o.code));
          return;
        }
        const nuevos = lista.filter((o) => !conocidosRef.current.has(o.code));
        if (nuevos.length) {
          nuevos.forEach((o) => conocidosRef.current.add(o.code));
          setOrders(lista);
          setAvisoNuevos((n) => n + nuevos.length);
          pitido();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuevo pedido 🛒', { body: `${nuevos.length} pedido(s) nuevo(s) en tu tienda.` });
          }
        }
      } catch { /* reintenta en el siguiente ciclo */ }
    }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // El servidor devuelve el pedido completo: al marcarlo "Pagado" trae
  // también la boleta o factura emitida (o el motivo si no se pudo).
  const reemplazarPedido = (nuevo) => setOrders((lista) => lista.map((x) => (x.code === nuevo.code ? nuevo : x)));

  async function actualizarPedido(o, cambios) {
    // Al confirmar un Yape, Plin o transferencia se pide el número de
    // operación: va en la boleta y evita registrar dos veces el mismo pago.
    if (cambios.estado === 'Pagado' && !o.referencia && !o.chargeId) {
      const operacion = window.prompt('Número de operación del pago (opcional, va en la boleta):', '');
      if (operacion === null) return; // canceló: no se cambia nada
      if (operacion.trim()) cambios = { ...cambios, referencia: operacion.trim().slice(0, 60) };
    }
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ code: o.code, ...cambios }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        reemplazarPedido(data.order || { ...o, ...cambios });
        if (data.aviso) alert(data.aviso);
      } else alert(data.error || 'No se pudo actualizar el pedido.');
    } catch { /* no-op */ }
  }

  async function eliminarPedido(o) {
    if (!window.confirm(`¿Eliminar el pedido ${o.code} de ${o.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(o.code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) setOrders(orders.filter((x) => x.code !== o.code));
      else alert((await res.json().catch(() => ({}))).error || 'No se pudo eliminar el pedido.');
    } catch { /* no-op */ }
  }

  async function borrarResena(r) {
    if (!window.confirm(`¿Eliminar la reseña de ${r.nombre}?`)) return;
    try {
      const res = await fetch(
        `/api/reviews?product=${encodeURIComponent(r.productId)}&id=${encodeURIComponent(r.id)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } }
      );
      if (res.ok) setReviews(reviews.filter((x) => x.id !== r.id));
    } catch { /* no-op */ }
  }

  async function aprobarResena(r) {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ productId: r.productId, id: r.id, aprobar: true }),
      });
      const data = await res.json();
      if (res.ok) setReviews(reviews.map((x) => (x.id === r.id ? data.review : x)));
    } catch { /* no-op */ }
  }

  async function borrarCarrito(c) {
    try {
      const res = await fetch(`/api/carritos?telefono=${encodeURIComponent(c.telefono)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) setCarritos(carritos.filter((x) => x.telefono !== c.telefono));
    } catch { /* no-op */ }
  }

  async function guardarEdicion(r) {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ productId: r.productId, id: r.id, estrellas: editando.estrellas, comentario: editando.comentario }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(reviews.map((x) => (x.id === r.id ? data.review : x)));
        setEditando(null);
      }
    } catch { /* no-op */ }
  }

  async function responderReclamo(r, respuesta) {
    const res = await fetch('/api/reclamos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ folio: r.folio, respuesta }),
    });
    const data = await res.json();
    if (res.ok) setReclamos(reclamos.map((x) => (x.folio === r.folio ? data.reclamo : x)));
    else alert(data?.error || 'No se pudo guardar la respuesta.');
  }

  // Pantalla de acceso centrada, sin nada alrededor. Antes era un título
  // suelto en la esquina de una página de tienda, con el carrito al lado.
  // Entrar a administrar un negocio tiene que parecer eso.
  if (!orders) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <span className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white">
            E|D
          </span>
          <h1 className="text-center text-lg font-semibold tracking-tight">Panel del negocio</h1>
          <p className="mt-1 text-center text-sm text-neutral-500">Acceso privado</p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (input) cargar(input);
            }}
          >
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Clave de administrador"
              autoFocus
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-ink"
            />
            <button
              disabled={loading}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <a
            href="/"
            className="mt-6 block text-center text-xs text-neutral-400 transition hover:text-neutral-600"
          >
            ← Volver a la tienda
          </a>
        </div>
      </main>
    );
  }

  // ---- Métricas ----
  const ventas = orders.filter(esVenta);
  const porVerificar = orders.filter((o) => o.estado === 'Pago por verificar');
  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((o) => new Date(o.fecha).toDateString() === hoy).reduce((s, o) => s + (o.monto || 0), 0);
  const totalVentas = ventas.reduce((s, o) => s + (o.monto || 0), 0);
  const totalPorVerificar = porVerificar.reduce((s, o) => s + (o.monto || 0), 0);
  const promedioEstrellas = reviews.length
    ? (reviews.reduce((s, r) => s + r.estrellas, 0) / reviews.length).toFixed(1)
    : '—';

  const reclamosPendientes = reclamos.filter((r) => r.estado === 'Pendiente');
  const visibles = filtrarPedidos(orders, filtro);

  return (
    <>
      {/* La cabecera del panel sustituye a la de la tienda, que aquí solo
          estorbaba: llevaba carrito de compras y enlaces de catálogo. */}
      <BarraPanel branding={storeConfig?.branding} onSalir={salir} />

      <main className="mx-auto max-w-7xl px-4 py-6">
      {/* El título sigue a la pestaña abierta. Antes decía siempre "Resumen
          del negocio", así que estando en Pedidos o en Reclamos la pantalla
          afirmaba estar en otro sitio. */}
      <TituloSeccion
        titulo={TITULOS[tab]?.titulo || 'Panel del negocio'}
        descripcion={TITULOS[tab]?.descripcion || fechaDeHoy()}
      >
        <button
          onClick={() => descargarHoja(orders)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-ink"
          title="Descarga todos los pedidos como hoja de cálculo (se abre en Excel o Google Sheets)"
        >
          Descargar hoja
        </button>
        <button
          onClick={() => cargar(key)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-ink disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </TituloSeccion>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ventas confirmadas" value={currencyFormatter.format(totalVentas)} sub={`${ventas.length} pedido${ventas.length !== 1 ? 's' : ''}`} />
        <StatCard label="Por verificar" value={currencyFormatter.format(totalPorVerificar)} sub={`${porVerificar.length} pedido${porVerificar.length !== 1 ? 's' : ''}`} accent={porVerificar.length > 0} />
        <StatCard label="Ventas de hoy" value={currencyFormatter.format(ventasHoy)} sub={new Date().toLocaleDateString('es-PE')} />
        <StatCard label="Calificación" value={`★ ${promedioEstrellas}`} sub={`${reviews.length} reseña${reviews.length !== 1 ? 's' : ''}`} />
      </div>

      {avisoNuevos > 0 && (
        <button
          onClick={() => { setTab('pedidos'); setAvisoNuevos(0); }}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-left text-sm text-green-900 hover:bg-green-100"
        >
          <span>🛒 <strong>{avisoNuevos} pedido{avisoNuevos !== 1 ? 's' : ''} nuevo{avisoNuevos !== 1 ? 's' : ''}</strong> desde que abriste el panel. Toca para verlos.</span>
          <span className="shrink-0 text-xs text-green-700">✕</span>
        </button>
      )}

      {/* Trece pestañas sueltas se convirtieron en cuatro grupos. Lo urgente
          (pedidos por verificar, reclamos con plazo legal) sube al botón del
          grupo en rojo, así que agrupar no lo esconde. */}
      <PestanasAgrupadas
        activa={tab}
        onElegir={setTab}
        grupos={[
          {
            id: 'vender',
            label: 'Vender',
            items: [
              { id: 'resumen', label: 'Resumen' },
              { id: 'pedidos', label: 'Pedidos', aviso: porVerificar.length, urgente: true },
              { id: 'carritos', label: 'Carritos abandonados', aviso: carritos.length },
              { id: 'reclamos', label: 'Reclamos', aviso: reclamosPendientes.length, urgente: true },
              { id: 'visitas', label: 'Visitas' },
              { id: 'impuestos', label: 'Impuestos y margen' },
            ],
          },
          {
            id: 'clientes',
            label: 'Clientes',
            items: [
              { id: 'resenas', label: 'Reseñas', aviso: reviews.length },
              { id: 'suscriptores', label: 'Suscriptores', aviso: suscriptores.length },
              { id: 'encuestas', label: 'Encuestas', aviso: encuestas.length },
            ],
          },
          {
            id: 'promos',
            label: 'Promociones',
            items: [
              { id: 'ofertas', label: 'Ofertas y descuentos' },
              { id: 'promos', label: 'Códigos de descuento' },
              { id: 'descAuto', label: 'Descuentos automáticos' },
              { id: 'historial', label: 'Historial de códigos' },
              { id: 'analytics', label: 'Analytics' },
            ],
          },
          {
            id: 'tienda',
            label: 'Mi tienda',
            items: [{ id: 'editar', label: 'Editar página' }],
          },
        ]}
      />

      {tab === 'resumen' && (
        <>
        <QueHacerHoy
          orders={orders}
          reviews={reviews}
          reclamos={reclamos}
          carritos={carritos}
          arco={arco}
          ultimaDescarga={ultimaDescarga}
          currencyFormatter={currencyFormatter}
          onIr={setTab}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GraficaVentasPorDia orders={orders} currencyFormatter={currencyFormatter} />
          <GraficaVentasPorProducto orders={orders} currencyFormatter={currencyFormatter} />
        </div>
        </>
      )}

      {tab === 'pedidos' && (
        <>
          <FiltroPedidos pedidos={orders} filtro={filtro} onElegir={setFiltro} />

          <div className="space-y-4">
            {visibles.length === 0 && (
              <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
                No hay pedidos en este filtro.
              </p>
            )}
            {visibles.map((o) => (
              <PedidoCard
                key={o.code}
                o={o}
                onUpdate={actualizarPedido}
                onReemplazar={reemplazarPedido}
                adminKey={key}
                onDelete={eliminarPedido}
                currencyFormatter={currencyFormatter}
                getColorById={getColorById}
                getSizeById={getSizeById}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'resenas' && (
        <div className="space-y-4">
          {reviews.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay reseñas de clientes.
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {r.nombre}
                    {r.editado && <span className="text-xs font-normal text-neutral-400">(editada)</span>}
                    {r.aprobada === false && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Pendiente de aprobar
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getProductById(r.productId)?.name || r.productId} · {new Date(r.fecha).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stars n={r.estrellas} size="text-sm" />
                  {r.aprobada === false && (
                    <button onClick={() => aprobarResena(r)} className="text-xs font-medium text-green-700 hover:underline">
                      Aprobar
                    </button>
                  )}
                  <button
                    onClick={() => setEditando(editando?.id === r.id ? null : { id: r.id, estrellas: r.estrellas, comentario: r.comentario })}
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Editar
                  </button>
                  <button onClick={() => borrarResena(r)} className="text-xs text-red-600 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
              {r.foto && (
                <a href={r.foto} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                  <img src={r.foto} alt="Foto del cliente" className="h-24 w-24 rounded-lg border border-neutral-200 object-cover" />
                </a>
              )}

              {editando?.id === r.id ? (
                <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditando({ ...editando, estrellas: i })}
                        className={`text-xl ${i <= editando.estrellas ? 'text-amber-500' : 'text-neutral-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={editando.comentario}
                    onChange={(e) => setEditando({ ...editando, comentario: e.target.value })}
                    maxLength={500}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => guardarEdicion(r)} className="rounded-lg bg-ink px-4 py-1.5 text-xs font-medium text-white">
                      Guardar cambios
                    </button>
                    <button onClick={() => setEditando(null)} className="rounded-lg border border-neutral-300 px-4 py-1.5 text-xs">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">{r.comentario}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'carritos' && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Clientes que dejaron productos en el carrito con sus datos, pero no llegaron a pagar.
            Escríbeles por WhatsApp para ayudarles a completar la compra. Al concretarse un pedido,
            el carrito desaparece solo de esta lista.
          </p>
          {carritos.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              No hay carritos abandonados por ahora.
            </p>
          ) : (
            carritos.map((c) => {
              const soloDigitos = (c.telefono || '').replace(/\D/g, '');
              const numero = soloDigitos.length === 9 ? `51${soloDigitos}` : soloDigitos;
              const mensaje = encodeURIComponent(
                `Hola ${c.nombre}, te saludamos de E|D Espacios y Diseño. Vimos que dejaste unos productos en tu carrito y queremos ayudarte a completar tu pedido. ¿Te quedó alguna duda?`
              );
              return (
                <div key={c.telefono} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.nombre}</p>
                      <p className="text-xs text-neutral-500">
                        {c.telefono} · {new Date(c.fecha).toLocaleString('es-PE')}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-sm text-neutral-600">
                        {(c.items || []).map((it, idx) => (
                          <li key={idx}>{it.qty}× {it.productName}</li>
                        ))}
                      </ul>
                      <p className="mt-1 text-sm font-medium">Total: {currencyFormatter.format(c.total || 0)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <a
                        href={`https://wa.me/${numero}?text=${mensaje}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-[#25D366] px-4 py-2 text-center text-xs font-medium text-white hover:opacity-90"
                      >
                        💬 Escribir por WhatsApp
                      </a>
                      <button
                        onClick={() => borrarCarrito(c)}
                        className="rounded-lg border border-neutral-300 px-4 py-2 text-xs text-neutral-600 hover:border-ink"
                      >
                        Quitar de la lista
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'reclamos' && (
        <div className="space-y-4">
          <p className="rounded-lg bg-sky-50 px-4 py-2 text-xs text-sky-900">
            Por ley tienes hasta 30 días calendario desde la fecha del reclamo para responder.
            Los reclamos no se pueden eliminar — quedan como registro.
          </p>
          {reclamos.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay reclamos ni quejas registrados.
            </p>
          )}
          {reclamos.map((r) => (
            <ReclamoCard key={r.folio} r={r} onResponder={responderReclamo} />
          ))}
        </div>
      )}

      {tab === 'suscriptores' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-neutral-500">
              Correos suscritos a tu newsletter. Puedes copiarlos o descargarlos para tu
              herramienta de correos.
            </p>
            {suscriptores.length > 0 && (
              <button
                onClick={() => descargarSuscriptores(suscriptores)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink"
              >
                ⬇️ Descargar CSV
              </button>
            )}
          </div>
          {suscriptores.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay suscriptores.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
              {suscriptores.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono">{s.email}</span>
                  <span className="text-xs text-neutral-400">{new Date(s.fecha).toLocaleDateString('es-PE')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'encuestas' && (
        <div className="space-y-3">
          {encuestas.length === 0 ? (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay respuestas de encuestas.
            </p>
          ) : (
            encuestas.map((e, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>{new Date(e.fecha).toLocaleString('es-PE')}</span>
                  {e.orderCode && <span className="font-mono">{e.orderCode}</span>}
                </div>
                <div className="space-y-1 text-sm">
                  {Object.entries(e.respuestas || {}).map(([k, v]) => (
                    <p key={k}><span className="text-neutral-500">{k}:</span> {v}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'ofertas' && <MegaOfertasEditor adminKey={key} />}

      {/* Estas dos pantallas ya existían pero no estaban enlazadas en ningún
          lado, así que no había forma de crear un código que el checkout
          reconociera: es la única UI que escribe en 'promo:codes'. */}
      {tab === 'promos' && <PromoEditor adminKey={key} />}

      {tab === 'descAuto' && <DescuentosAutoEditor adminKey={key} />}

      {tab === 'analytics' && <AnalyticsOfertasTab adminKey={key} />}





      {tab === 'historial' && <HistorialCodigosTab adminKey={key} />}

      {tab === 'visitas' && <VisitasTab adminKey={key} />}

      {tab === 'impuestos' && <ImpuestosTab adminKey={key} onIr={() => setTab('editar')} />}

      {tab === 'editar' && <CatalogEditor adminKey={key} irA={subEditor} />}

      {/* JARVIS acompaña TODO el panel, no solo la pestaña de edición. Va aquí
          (dentro del bloque autenticado) para que el cliente nunca lo vea. */}
      {/* onNavegar es lo que permite que JARVIS ABRA de verdad una sección
          cuando se lo piden, en vez de decir "te estoy llevando" sin moverse. */}
      <JarvisVoice adminKey={key} onNavegar={abrirSeccion} />
      </main>
    </>
  );
}

// Qué dice la cabecera en cada pestaña. En un solo sitio para que al añadir
// una sección no se olvide su título y la pantalla afirme estar en otra.
//
// Las descripciones explican PARA QUÉ sirve cada sección, no qué es. El dueño
// no es programador: "Confirma los pagos y marca las entregas" le dice qué
// hacer ahí; "Gestión de pedidos" no le dice nada.
const TITULOS = {
  resumen: { titulo: 'Resumen del negocio' },
  pedidos: { titulo: 'Pedidos', descripcion: 'Confirma los pagos y marca las entregas' },
  carritos: { titulo: 'Carritos abandonados', descripcion: 'Llegaron hasta el final y no pagaron: tienes su WhatsApp' },
  reclamos: { titulo: 'Reclamos', descripcion: 'Tienes 30 días calendario para responder cada uno (Ley 29571)' },
  visitas: { titulo: 'Visitas', descripcion: 'Cuánta gente entra a tu tienda y qué mira' },
  impuestos: { titulo: 'Impuestos y margen', descripcion: 'Cuánto de lo que cobras es tuyo y cuánto del Estado' },
  resenas: { titulo: 'Reseñas', descripcion: 'No se publican en la tienda hasta que las apruebes' },
  suscriptores: { titulo: 'Suscriptores', descripcion: 'Quienes pidieron recibir tus novedades' },
  encuestas: { titulo: 'Encuestas', descripcion: 'Lo que contestaron tus clientes después de comprar' },
  ofertas: { titulo: 'Ofertas y descuentos', descripcion: 'Rebajas que se aplican solas, sin código' },
  promos: { titulo: 'Códigos de descuento', descripcion: 'Cupones que el cliente escribe al pagar' },
  descAuto: { titulo: 'Descuentos automáticos', descripcion: 'Por cantidad, por categoría o por tiempo limitado' },
  historial: { titulo: 'Historial de códigos', descripcion: 'Quién usó cada cupón y cuánto se descontó' },
  analytics: { titulo: 'Analytics de ofertas', descripcion: 'Qué descuentos traen ventas de verdad' },
  editar: { titulo: 'Editar página', descripcion: 'Productos, textos y configuración de la tienda' },
};

// La fecha de hoy escrita como se dice, para la cabecera del resumen.
function fechaDeHoy() {
  return new Date()
    .toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

// Secciones que JARVIS puede abrir. Se valida contra esta lista para que no
// pueda "abrir" algo que no existe y quedarse tan tranquilo.
const SECCIONES_VALIDAS = new Set([
  'resumen', 'pedidos', 'resenas', 'carritos', 'reclamos', 'suscriptores',
  'encuestas', 'ofertas', 'promos', 'descAuto', 'analytics', 'historial', 'editar',
  'impuestos', 'visitas',
]);

// Una cifra del negocio.
//
// El número es lo único que se mira de un vistazo, así que manda: la etiqueta
// deja de ir en MAYÚSCULAS diminutas (que obligan a detenerse a leerlas) y el
// número crece. `accent` marca la única tarjeta que pide acción — dinero
// esperando a que lo confirmes — y solo se tiñe cuando hay algo, porque un
// aviso permanente deja de avisar.
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        accent ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'
      }`}
    >
      <p className={`text-xs font-medium ${accent ? 'text-amber-800' : 'text-neutral-500'}`}>{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}
