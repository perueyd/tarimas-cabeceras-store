import { useEffect, useRef, useState } from 'react';

// Mapa para marcar el punto exacto de entrega (solo Lima).
// Usa Leaflet + OpenStreetMap (gratuito, sin llave de API), cargado desde index.html.
// El cliente puede: tocar el mapa, arrastrar el pin, o usar su ubicación actual (GPS).
const LIMA_CENTER = [-12.0464, -77.0428];

export default function MapPicker({ onChange }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!window.L || !mapEl.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(mapEl.current).setView(LIMA_CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function setPoint(lat, lng) {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    const point = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        setPoint(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    setCoords(point);
    onChangeRef.current?.(point);
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      setGeoStatus('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setGeoStatus('Obteniendo tu ubicación...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
        setPoint(latitude, longitude);
        setGeoStatus('');
      },
      () => {
        setGeoStatus('No pudimos obtener tu ubicación. Activa el GPS/permiso de ubicación o marca el punto en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!window.L) {
    return (
      <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
        El mapa no pudo cargarse. Puedes continuar solo con tu dirección escrita.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-600">
          Marca el punto exacto de entrega <span className="text-neutral-400">(recomendado)</span>
        </p>
        <button
          type="button"
          onClick={usarUbicacionActual}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-ink"
        >
          📍 Usar mi ubicación actual
        </button>
      </div>
      <div ref={mapEl} className="h-64 w-full overflow-hidden rounded-lg border border-neutral-200" />
      {coords && (
        <p className="mt-2 text-xs text-neutral-500">
          ✓ Punto marcado: {coords.lat}, {coords.lng} — puedes arrastrar el pin para ajustarlo.
        </p>
      )}
      {geoStatus && <p className="mt-2 text-xs text-neutral-500">{geoStatus}</p>}
    </div>
  );
}
