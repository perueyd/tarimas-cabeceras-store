import { useEffect, useState } from 'react';

// Datos de ejemplo de compras recientes (en producción, vendrían de la API)
const MOCK_RECENT_ORDERS = [
  {
    id: 1,
    product: 'Tarima Queen Premium',
    location: 'San Isidro, Lima',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect fill="%23A67C52" width="200" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14"%3ETarima Queen%3C/text%3E%3C/svg%3E',
    review: 'Excelente calidad y entrega rápida',
    rating: 5,
    daysAgo: 2,
  },
  {
    id: 2,
    product: 'Cabecera Capitoné Gris',
    location: 'Miraflores, Lima',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect fill="%238B8B8B" width="200" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14"%3ECabecera%3C/text%3E%3C/svg%3E',
    review: 'Muy bonita, justo como en las fotos',
    rating: 5,
    daysAgo: 5,
  },
  {
    id: 3,
    product: 'Sofá Cama Matrimonial',
    location: 'Surco, Lima',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect fill="%234A5A7A" width="200" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14"%3ESofá Cama%3C/text%3E%3C/svg%3E',
    review: 'Perfecta para mi departamento pequeño',
    rating: 5,
    daysAgo: 7,
  },
  {
    id: 4,
    product: 'Cabecera Recta Beige',
    location: 'Chorrillos, Lima',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect fill="%23C9A961" width="200" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14"%3ECabecera%3C/text%3E%3C/svg%3E',
    review: 'El color es más bonito en persona que en fotos',
    rating: 5,
    daysAgo: 10,
  },
  {
    id: 5,
    product: 'Tarima Premium con Baúl',
    location: 'San Miguel, Lima',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect fill="%23654321" width="200" height="150"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14"%3ETarima+Baúl%3C/text%3E%3C/svg%3E',
    review: 'Muy cómodo y funcional, recomendado',
    rating: 5,
    daysAgo: 12,
  },
];

const TRUST_BADGES = [
  { icon: '✓', label: 'Hechos a medida', description: 'Sin límites de tamaño' },
  { icon: '⚡', label: '3-4 días de entrega', description: 'En Lima' },
  { icon: '🛡️', label: 'Garantía 2 años', description: 'Cobertura completa' },
  { icon: '🚚', label: 'Instalación gratis', description: 'Servicio a domicilio' },
];

export default function RecentOrdersSection() {
  const [orders, setOrders] = useState(MOCK_RECENT_ORDERS);

  // En producción, esto vendría de /api/recent-orders
  useEffect(() => {
    // Aquí se podría hacer un fetch a la API
    // fetch('/api/recent-orders')
    //   .then(r => r.json())
    //   .then(d => setOrders(d.orders))
    //   .catch(() => setOrders(MOCK_RECENT_ORDERS));
  }, []);

  return (
    <section className="border-t border-neutral-200 bg-white">
      {/* TRUST BADGES */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_BADGES.map((badge, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center hover:border-neutral-300 transition sm:p-6"
            >
              <div className="text-3xl mb-2">{badge.icon}</div>
              <h3 className="font-semibold text-neutral-900 text-sm sm:text-base">{badge.label}</h3>
              <p className="text-xs text-neutral-600 mt-1">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ÚLTIMAS COMPRAS */}
      <div className="bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20">
          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">Clientes Reales, Resultados Reales</h2>
            <p className="text-neutral-600">Mira lo que nuestros clientes dicen sobre E|D Espacios y Diseño</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Imagen del producto */}
                <div className="w-full h-32 bg-neutral-100 overflow-hidden">
                  <img
                    src={order.image}
                    alt={order.product}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Contenido */}
                <div className="p-4">
                  {/* Nombre del producto */}
                  <h3 className="font-semibold text-sm text-neutral-900 line-clamp-2">
                    {order.product}
                  </h3>

                  {/* Ubicación */}
                  <p className="text-xs text-neutral-600 mt-1">📍 {order.location}</p>

                  {/* Rating */}
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: order.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">
                        ⭐
                      </span>
                    ))}
                  </div>

                  {/* Review */}
                  <p className="text-xs text-neutral-700 mt-2 line-clamp-2 italic">
                    "{order.review}"
                  </p>

                  {/* Fecha */}
                  <p className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                    Comprado hace {order.daysAgo} días
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-neutral-600 mb-4">
              ¿Listo para tu mueble personalizado?
            </p>
            <a
              href="/tienda"
              className="inline-block rounded-lg bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black active:scale-95"
            >
              Explorar la tienda →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
