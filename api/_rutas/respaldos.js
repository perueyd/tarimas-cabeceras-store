// Copias de seguridad del catálogo — vistas desde el panel.
//
// Existe porque los 33 productos de la tienda se perdieron una vez y hubo que
// dictarlos de nuevo uno por uno. La lógica de guardado está en
// api/_respaldos.js; esto es solo la puerta para el panel.
//
// Todo exige la clave de administrador: una copia del catálogo contiene la
// configuración completa de la tienda, incluidos los tokens de integraciones.
//
// GET  admin                      -> lista de copias (solo fechas y conteos)
// GET  admin ?id=xxx              -> una copia completa (para descargarla)
// POST admin ?action=crear        -> guarda una copia ahora mismo
// POST admin ?action=restaurar&id=xxx -> devuelve el catálogo a esa copia

import { getCatalog, restaurarCatalogo } from '../_catalog.js';
import { leerRespaldo, listarRespaldos, respaldar } from '../_respaldos.js';
import { checkAdminAuth } from '../_auth.js';
import { hasDB } from '../_store.js';
import { s } from '../_pricing.js';

export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (!hasDB) {
    return res.status(501).json({ error: 'Base de datos no conectada: no hay copias que mostrar.' });
  }

  const id = s(req.query.id, 40);
  const action = s(req.query.action, 20);

  try {
    if (req.method === 'GET') {
      if (id) {
        const foto = await leerRespaldo(id);
        if (!foto) return res.status(404).json({ error: 'Esa copia ya no existe.' });
        return res.status(200).json({ ok: true, id, catalogo: foto });
      }
      return res.status(200).json({ ok: true, respaldos: await listarRespaldos() });
    }

    if (req.method === 'POST') {
      if (action === 'crear') {
        // forzar: aunque ya exista la copia de hoy. El dueño pulsa este botón
        // justo antes de tocar algo gordo, y entonces quiere ESA foto.
        const entrada = await respaldar(await getCatalog({ paraEditar: true }), { forzar: true });
        if (!entrada) {
          return res.status(409).json({ error: 'No se pudo guardar la copia (¿el catálogo está vacío?).' });
        }
        return res.status(200).json({ ok: true, respaldo: entrada, respaldos: await listarRespaldos() });
      }

      if (action === 'restaurar') {
        const foto = await leerRespaldo(id);
        if (!foto) return res.status(404).json({ error: 'Esa copia ya no existe.' });
        const catalogo = await restaurarCatalogo(foto);
        return res.status(200).json({ ok: true, catalogo, respaldos: await listarRespaldos() });
      }

      return res.status(400).json({ error: 'Acción inválida (crear o restaurar).' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('respaldos:', err?.message);
    return res.status(503).json({ error: err?.message || 'No se pudo completar la operación.' });
  }
}
