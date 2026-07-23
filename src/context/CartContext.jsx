import { createContext, useContext, useEffect, useReducer } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'tarimas-cart-v1';

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Identifica una línea del carrito. Incluye las opciones elegidas (brazos,
// patas, botones...) para que la MISMA cabecera con y sin brazos sean dos
// líneas distintas y no se sumen como si fueran el mismo producto.
function lineKey(item) {
  const ops = Object.entries(item.opciones || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  return `${item.productId}__${item.sizeId}__${item.colorId}__${item.colorId2 || ''}__${ops}`;
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const key = lineKey(action.item);
      const existing = state.find((i) => lineKey(i) === key);
      if (existing) {
        return state.map((i) =>
          lineKey(i) === key ? { ...i, qty: i.qty + action.item.qty } : i
        );
      }
      return [...state, action.item];
    }
    case 'UPDATE_QTY':
      return state
        .map((i) => (lineKey(i) === action.key ? { ...i, qty: action.qty } : i))
        .filter((i) => i.qty > 0);
    case 'REMOVE':
      return state.filter((i) => lineKey(i) !== action.key);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item) => dispatch({ type: 'ADD', item });
  const updateQty = (item, qty) => dispatch({ type: 'UPDATE_QTY', key: lineKey(item), qty });
  const removeItem = (item) => dispatch({ type: 'REMOVE', key: lineKey(item) });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clearCart, totalItems, totalAmount, lineKey }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
