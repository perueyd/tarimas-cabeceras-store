import { useEffect, useMemo, useRef, useState } from 'react';

// Combobox buscable: el cliente escribe y filtra en vivo, luego elige de la
// lista (en vez de escribir el distrito a mano, con riesgo de errores de tipeo
// que compliquen la entrega). `options`: [{ value, label, sub? }].
export default function LocationSearch({ options, value, onSelect, placeholder = 'Buscar...', label, disabled }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 30);
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || (o.sub && o.sub.toLowerCase().includes(q)))
      .slice(0, 30);
  }, [query, options]);

  return (
    <div ref={wrapRef} className="relative text-sm">
      {label && <span className="mb-1 block font-medium text-neutral-700">{label}</span>}
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={disabled ? 'Cargando lista...' : placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-ink disabled:bg-neutral-50 disabled:text-neutral-400"
      />
      {open && !disabled && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white text-sm shadow-lg">
          {results.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => {
                  onSelect(o);
                  setQuery(o.label);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-neutral-100"
              >
                <span className="font-medium">{o.label}</span>
                {o.sub && <span className="ml-1.5 text-xs text-neutral-400">{o.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && query && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-400 shadow-lg">
          No encontramos ese lugar. Sigue escribiendo o revisa la ortografía.
        </div>
      )}
    </div>
  );
}
