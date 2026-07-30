import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from './lib/analytics.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';
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
import Track from './pages/Track.jsx';
import ComplaintsBook from './pages/ComplaintsBook.jsx';
import LegalPage from './pages/LegalPage.jsx';
import NotFound from './pages/NotFound.jsx';

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
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
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsTracker />
      <ScrollToTop />
      <Header />
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
      <Footer />
      <WhatsAppButton />
      <ChatbotWidget />
    </div>
  );
}
