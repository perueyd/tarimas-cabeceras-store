// Selector de color. Cada círculo muestra:
//  - la foto real de la tela (color.img) si el dueño la subió, o
//  - el color plano (color.hex) como respaldo.
// La foto real es la forma más fiel de mostrarle al cliente el tono y la
// textura verdaderos; el hex es solo una aproximación.
export default function ColorPicker({ colors, selectedId, onSelect, titulo = 'Color', aviso }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">
        {titulo}: <span className="font-normal text-neutral-500">
          {colors.find((c) => c.id === selectedId)?.label}
        </span>
      </p>
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.label}
            title={c.label}
            onClick={() => onSelect(c.id)}
            className={`h-9 w-9 overflow-hidden rounded-full border bg-cover bg-center transition ring-offset-2 ${
              selectedId === c.id ? 'ring-2 ring-ink' : 'ring-0 border-neutral-300'
            }`}
            style={c.img ? { backgroundImage: `url(${c.img})` } : { backgroundColor: c.hex }}
          />
        ))}
      </div>
      {aviso && <p className="mt-2 text-xs text-neutral-400">{aviso}</p>}
    </div>
  );
}
