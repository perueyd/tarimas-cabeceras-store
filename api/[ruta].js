// Atiende varias direcciones de /api con UNA SOLA función serverless.
//
// Por qué existe: el plan gratuito (Hobby) de Vercel permite como máximo 12
// funciones por despliegue, y cada archivo suelto dentro de api/ cuenta como
// una. La tienda había llegado a 24, así que Vercel rechazaba TODOS los
// despliegues con "No more than 12 Serverless Functions can be added" y la web
// se quedó congelada en una versión vieja durante días.
//
// La solución sin pagar nada: las direcciones de poco tráfico (todas del panel)
// viven ahora en api/_rutas/. Los archivos que empiezan por "_" no cuentan como
// función. Este despachador las carga bajo demanda.
//
// IMPORTANTE: las direcciones NO cambian. /api/newsletter sigue siendo
// /api/newsletter — el navegador y el panel no se enteran de nada.

// El mapa es explícito a propósito: así una petición a /api/loquesea no puede
// intentar cargar un archivo arbitrario del servidor.
const RUTAS = {
  'ai-engine': () => import('./_rutas/ai-engine.js'),
  'analytics-ofertas': () => import('./_rutas/analytics-ofertas.js'),
  automaciones: () => import('./_rutas/automaciones.js'),
  carritos: () => import('./_rutas/carritos.js'),
  'descuentos-auto': () => import('./_rutas/descuentos-auto.js'),
  encuesta: () => import('./_rutas/encuesta.js'),
  gamificacion: () => import('./_rutas/gamificacion.js'),
  historial: () => import('./_rutas/historial.js'),
  'derechos-arco': () => import('./_rutas/derechos-arco.js'),
  // Temporal: rescate de las fotos bloqueadas por el límite de Blob.
  'migrar-fotos': () => import('./_rutas/migrar-fotos.js'),
  'jarvis-accion': () => import('./_rutas/jarvis-accion.js'),
  newsletter: () => import('./_rutas/newsletter.js'),
  ofertas: () => import('./_rutas/ofertas.js'),
  omnichannel: () => import('./_rutas/omnichannel.js'),
  prediccion: () => import('./_rutas/prediccion.js'),
  promo: () => import('./_rutas/promo.js'),
  reclamos: () => import('./_rutas/reclamos.js'),
};

export default async function handler(req, res) {
  const ruta = String(req.query?.ruta || '').toLowerCase();
  const cargar = RUTAS[ruta];

  if (!cargar) {
    return res.status(404).json({ error: `No existe /api/${ruta}` });
  }

  try {
    const modulo = await cargar();
    return await modulo.default(req, res);
  } catch (err) {
    console.error(`Error en /api/${ruta}:`, err?.message, err?.stack);
    if (res.headersSent) return undefined;
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
