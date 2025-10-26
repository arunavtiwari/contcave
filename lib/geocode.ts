type GeoResult = { lat: number; lng: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function jitter(lat: number, lng: number, meters: number) {
  const r = meters / 111320;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(-2 * Math.log(u));
  const t = 2 * Math.PI * v;
  const dLat = w * Math.cos(t);
  const dLng = w * Math.sin(t) / Math.cos((lat * Math.PI) / 180);
  const jLat = clamp(lat + dLat, -90, 90);
  const jLng = clamp(lng + dLng, -180, 180);
  return { lat: jLat, lng: jLng };
}

export async function geocodeDisplayName(displayName: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(displayName)}&limit=1&addressdetails=0`;
    const res = await fetch(url, { headers: { "User-Agent": "contcave/1.0" } });
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const approx = jitter(lat, lng, 250);
    return approx;
  } catch {
    return null;
  }
}

