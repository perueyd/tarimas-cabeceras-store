import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from './lib/analytics.js';
import { contarVisita } from './lib/visitas.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import AvisoCookies from './components/AvisoCookies.jsx';
import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import ThankYou from './pages/ThankYou.jsx';
// El panel de administración se carga SOLO cuando el dueño entra a /pedidos.
// Antes viajaba en el mismo paquete que la tienda, así que cada cliente
// descargaba las ~20 pestañas del panel, el asistente de voz y la vista previa
// antes de poder ver la portada. Con datos móviles en Perú eso son segundos de
// espera por código que un comprador nunca ejecuta.
const Orders = lazy(() => import('./pages/Orders.jsx'));

// Por la misma razón, estos dos tampoco viajan en el paquete inicial:
//   · el armador de dormitorio es una página entera que la mayoría no abre;
//   · el chat aparece abajo a la derecha, pero quien no lo toca no necesita
//     su código para ver la portada.
const ArmarDormitorio = lazy(() => import('./pages/ArmarDormitorio.jsx'));
const ChatbotWidget = lazy(() => import('./components/ChatbotWidget.jsx'));
import Track from './pages/Track.jsx';
import ComplaintsBook from './pages/ComplaintsBook.jsx';
import LegalPage from './pages/LegalPage.jsx';
import NotFound from './pages/NotFound.jsx';

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // No arranca nada si el visitante aún no ha aceptado las cookies.
    initAnalytics();
    // Si acepta después, se arranca en ese momento sin recargar.
    const alCambiar = () => initAnalytics();
    window.addEventListener('ed-consentimiento', alCambiar);
    return () => window.removeEventListener('ed-consentimiento', alCambiar);
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
    // Contador propio. A diferencia del de arriba, este funciona acepte o no
    // las cookies, porque no guarda nada de la persona — y es, hoy por hoy, lo
    // único que le dice al dueño si entra alguien a su tienda.
    contarVisita(location.pathname);
  }, [location.pathname]);

  return null;
}

// El cambio de página en React Router no reinicia el scroll solo (a
// diferencia de una recarga normal) — sin esto, si el cliente entra a un
// producto desde el medio de un catálogo con scroll, la nueva página abre a
// la mitad en vez de arriba. Se activa con cada cambio de ruta (no con
// cambios de "?categoria=" dentro de la misma página, para no interrumpir al
// cliente mientras filtra la tienda).
function ScrollToTop() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    // Si la dirección pide un trozo concreto (#opiniones, por ejemplo), subir
    // arriba del todo es justo lo contrario de lo que pidió quien entró. Pasa
    // con el enlace que se le manda al cliente para que deje su opinión.
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  // El panel es una herramienta de trabajo, no una página más de la tienda.
  //
  // Antes el dueño veía encima de su panel la cabecera del cliente (con
  // carrito incluido), el botón de WhatsApp, el chat público y su propio
  // aviso de cookies. Cuatro cosas pensadas para vender, tapando aquello con
  // lo que gestiona el negocio — y el chat y el WhatsApp además se ponían
  // literalmente encima de las fichas de pedido.
  const enElPanel = useLocation().pathname.startsWith('/pedidos');

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsTracker />
      <ScrollToTop />
      {!enElPanel && <Header />}
      <div className="flex-1">
        <Suspense
          fallback={
            <main className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-neutral-500">
              Cargando…
            </main>
          }
        >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tienda" element={<Home />} />
          <Route path="/arma-tu-dormitorio" element={<ArmarDormitorio />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/gracias" element={<ThankYou />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/seguimiento" element={<Track />} />
          <Route path="/libro-de-reclamaciones" element={<ComplaintsBook />} />
          <Route path="/politica-privacidad" element={<LegalPage which="privacidad" />} />
          <Route path="/terminos-condiciones" element={<LegalPage which="terminos" />} />
          {/* Cualquier otra dirección: antes quedaba una página en blanco. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </div>
      {!enElPanel && (
        <>
          <Footer />
          <WhatsAppButton />
          <Suspense fallback={null}>
            <ChatbotWidget />
          </Suspense>
          <AvisoCookies />
        </>
      )}
    </div>
  );
}
