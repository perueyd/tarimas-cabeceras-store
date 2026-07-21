import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from './lib/analytics.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import ThankYou from './pages/ThankYou.jsx';
import Orders from './pages/Orders.jsx';
import Track from './pages/Track.jsx';

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

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsTracker />
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tienda" element={<Home />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/gracias" element={<ThankYou />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/seguimiento" element={<Track />} />
        </Routes>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
