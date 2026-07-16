export default function ColorPicker({ colors, selectedId, onSelect }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">
        Color: <span className="font-normal text-neutral-500">
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
            className={`h-9 w-9 rounded-full border transition ring-offset-2 ${
              selectedId === c.id ? 'ring-2 ring-ink' : 'ring-0 border-neutral-300'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}
