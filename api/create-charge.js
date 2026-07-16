// Función serverless (Vercel) que crea el cargo en Culqi desde el backend.
// La llave secreta NUNCA debe usarse en el frontend.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, amount, email, nombre, telefono, direccion, items } = req.body || {};
  const secretKey = process.env.CULQI_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'CULQI_SECRET_KEY no está configurada en el servidor.' });
  }
  if (!token || !amount || !email) {
    return res.status(400).json({ error: 'Faltan datos para procesar el pago (token, amount, email).' });
  }

  try {
    const culqiRes = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency_code: 'PEN',
        email,
        source_id: token,
        description: `Pedido Tarimas & Cabeceras - ${nombre || ''}`.trim(),
        metadata: { nombre, telefono, direccion, items: JSON.stringify(items || []) },
      }),
    });

    const data = await culqiRes.json();

    if (!culqiRes.ok) {
      return res.status(culqiRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Culqi.' });
  }
}
