// Lo que el dueño se lleva fuera del panel: la hoja de cálculo de pedidos, la
// de suscriptores y el enlace para apuntar una entrega en Google Calendar.
//
// Están juntas porque las tres hacen lo mismo — convertir datos del panel en
// algo que se abre en otro programa — y ninguna necesita React.


// Link "agregar a Google Calendar" para una entrega (sin API ni permisos:
// abre el evento pre-llenado y el dueño solo confirma con "Guardar").
export function calendarUrl(o, currencyFormatter) {
  const m = (o.entrega || '').match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const inicio = m[0].replace(/-/g, '');
  const sig = new Date(`${m[0]}T12:00:00`);
  sig.setDate(sig.getDate() + 1);
  const fin = sig.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent(`🚚 Entrega ${o.code} — ${o.nombre}`);
  const details = encodeURIComponent(
    `Pedido: ${o.code}\nCliente: ${o.nombre} (${o.telefono})\nMonto: ${currencyFormatter.format(o.monto || 0)}\nHorario: ${o.entrega}\nProductos: ${(o.items || []).map((i) => `${i.productName} x${i.qty}`).join(', ')}${o.ubicacion ? `\nMapa: ${o.ubicacion}` : ''}`
  );
  const location = encodeURIComponent(o.direccion || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${inicio}/${fin}&details=${details}&location=${location}`;
}



// Descarga todos los pedidos como hoja de cálculo (CSV compatible con Excel y
// Google Sheets, con BOM UTF-8 y separador ";" para Excel en español).
export function descargarHoja(orders) {
  const headers = ['Fecha', 'Código', 'Referencia', 'Estado', 'Método', 'Monto', 'Nombre', 'Teléfono', 'Email', 'Zona', 'Dirección', 'Ubicación', 'Entrega', 'Productos'];
  const rows = orders.map((o) => [
    new Date(o.fecha).toLocaleString('es-PE'),
    o.code,
    o.referencia || '',
    o.estado,
    o.metodo,
    o.monto,
    o.nombre,
    o.telefono,
    o.email,
    o.zona,
    o.direccion,
    o.ubicacion,
    o.entrega,
    (o.items || []).map((i) => `${i.productName} x${i.qty}`).join(' | '),
  ]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pedidos-ED-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Descarga los correos suscritos como CSV (correo + fecha).
export function descargarSuscriptores(suscriptores) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = suscriptores.map((s) => [s.email, new Date(s.fecha).toLocaleString('es-PE')]);
  const csv = '﻿' + [['Correo', 'Fecha'], ...rows].map((r) => r.map(esc).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `suscriptores-ED-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
