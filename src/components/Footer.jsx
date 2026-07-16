export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 py-8">
      <div className="mx-auto max-w-6xl px-4 text-sm text-neutral-500">
        <p>© {new Date().getFullYear()} Tarimas &amp; Cabeceras Perú. Todos los derechos reservados.</p>
        <p className="mt-1">Pagos procesados de forma segura con Culqi. Precios en Soles (S/).</p>
      </div>
    </footer>
  );
}
