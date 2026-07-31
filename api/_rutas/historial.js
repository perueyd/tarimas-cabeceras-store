import { checkAdminAuth } from '../_auth.js';
import { listarHistorial, buscarHistorialPorCodigo, buscarHistorialPorCliente } from '../_historial.js';

// GET: lista histórico de códigos usados (requiere admin)
// GET ?codigo=X: busca uso de un código específico
// GET ?telefono=X: busca uso de códigos por un cliente
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    try {
      let historial = [];

      if (req.query.codigo) {
        historial = await buscarHistorialPorCodigo(req.query.codigo);
      } else if (req.query.telefono) {
        historial = await buscarHistorialPorCliente(req.query.telefono);
      } else {
        historial = await listarHistorial();
      }

      // Paginación: últimos 100 registros
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const porPagina = 100;
      const inicio = (pagina - 1) * porPagina;
      const fin = inicio + porPagina;

      return res.status(200).json({
        historial: historial.slice(inicio, fin),
        total: historial.length,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(historial.length / porPagina),
      });
    } catch (err) {
      return res.status(500).json({ error: 'Error al consultar historial.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
