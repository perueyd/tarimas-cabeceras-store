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
    sizes: staticCatalog.sizes,
    showcase: staticCatalog.showcase,
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
          products: Array.isArray(d.products) ? d.products : staticCatalog.products,
          categories: Array.isArray(d.categories) ? d.categories : staticCatalog.categories,
          colors: Array.isArray(d.colors) ? d.colors : staticCatalog.colors,
          sizes: Array.isArray(d.sizes) ? d.sizes : staticCatalog.sizes,
          showcase: Array.isArray(d.showcase) ? d.showcase : staticCatalog.showcase,
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
    const { products, categories, colors, sizes, showcase, storeConfig, loaded } = state;
    return {
      products,
      categories,
      colors,
      sizes,
      showcase,
      storeConfig,
      currencyFormatter: staticCatalog.currencyFormatter,
      loaded,
      getProductById: (id) => products.find((p) => p.id === id),
      getColorById: (id) => colors.find((c) => c.id === id),
      getSizeById: (id) => sizes.find((s) => s.id === id),
      refetch: () =>
        fetch('/api/catalog')
          .then((r) => r.json())
          .then((d) =>
            setState({
              products: d.products || [],
              categories: d.categories || [],
              colors: d.colors || [],
              sizes: d.sizes || [],
              showcase: d.showcase || [],
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

// Resuelve qué imagen mostrar para un producto según el color y el tamaño
// elegidos (el tamaño es opcional — las tarjetas de catálogo, que no tienen
// un tamaño seleccionado, no lo mandan):
// 1. Si ese color tiene su PROPIA foto (colorImages) -> se muestra tal cual, sin teñir.
// 2. Si no, y ese tamaño tiene su PROPIA foto (sizeImages) -> se usa esa (una
//    cabecera King se ve distinta a una de 1.5 plaza, aunque sea el mismo diseño),
//    teñida igual que la imagen base si el producto es tintable.
// 3. Si no, se usa la imagen base del producto (o ninguna, si el dueño aún no
//    subió foto para ese tamaño — ProductImage muestra un aviso en ese caso).
export function resolveProductImage(product, colorId, sizeId) {
  const especifica = product.colorImages?.[colorId];
  if (especifica) return { src: especifica, tintable: false };
  const porTamano = sizeId && product.sizeImages?.[sizeId];
  if (porTamano) return { src: porTamano, tintable: product.tintable !== false };
  return { src: product.baseImage, tintable: product.tintable !== false };
}
