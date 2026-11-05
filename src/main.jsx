import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { vigilarErroresGlobales } from './lib/reportarError.js';
import { CartProvider } from './context/CartContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import './index.css';

// Los errores que React no atrapa (promesas, eventos) también llegan al panel.
vigilarErroresGlobales();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Por fuera de todo: si falla hasta la carga del catálogo, el cliente
        sigue viendo un mensaje con salida en vez de una pantalla en blanco. */}
    <ErrorBoundary>
      <BrowserRouter>
        <CatalogProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </CatalogProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
