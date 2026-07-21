import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as staticCatalog from '../data/catalog.js';

// Catálogo en vivo: al cargar la web se pide /api/catalog (que lee de la base
// de datos si el dueño ya editó algo desde el panel, o del archivo estático
// como respaldo). Así, agregar/editar productos desde /pedidos → "Editar
// página" se refleja al instante en toda la tienda, sin deploy.
const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [state, setState] = useState({
    products: staticCatalog.products,
    categories: staticCatalog.categories,
    colors: staticCatalog.colors,
    storeConfig: staticCatalog.storeConfig,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setState({
          products: Array.isArray(d.products) && d.products.length ? d.products : staticCatalog.products,
          categories: Array.isArray(d.categories) && d.categories.length ? d.categories : staticCatalog.categories,
          colors: Array.isArray(d.colors) && d.colors.length ? d.colors : staticCatalog.colors,
          storeConfig: d.storeConfig || staticCatalog.storeConfig,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loaded: true })); // sigue con el catálogo estático si falla
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const { products, categories, colors, storeConfig, loaded } = state;
    return {
      products,
      categories,
      colors,
      storeConfig,
      sizes: staticCatalog.sizes,
      currencyFormatter: staticCatalog.currencyFormatter,
      loaded,
      getProductById: (id) => products.find((p) => p.id === id),
      getColorById: (id) => colors.find((c) => c.id === id),
      getSizeById: (id) => staticCatalog.sizes.find((s) => s.id === id),
      refetch: () =>
        fetch('/api/catalog')
          .then((r) => r.json())
          .then((d) =>
            setState({
              products: d.products || [],
              categories: d.categories || [],
              colors: d.colors || [],
              storeConfig: d.storeConfig || staticCatalog.storeConfig,
              loaded: true,
            })
          ),
    };
  }, [state]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de CatalogProvider');
  return ctx;
}
