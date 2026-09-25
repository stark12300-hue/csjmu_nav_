const routeCache = new Map<string, { data: any; expiresAt: number }>();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query || {};
  const fromLat = parseFloat(query.fromLat as string);
  const fromLng = parseFloat(query.fromLng as string);
  const toLat = parseFloat(query.toLat as string);
  const toLng = parseFloat(query.toLng as string);
  const mode = (query.mode as string) === 'driving' ? 'driving' : 'foot';

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    return res.status(400).json({ error: 'Valid fromLat, fromLng, toLat, toLng coordinates required' });
  }

  const cacheKey = `${mode}:${fromLat.toFixed(4)},${fromLng.toFixed(4)}->${toLat.toFixed(4)},${toLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached.data);
  }

  const candidateUrls = [
    `https://router.project-osrm.org/route/v1/${mode}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`,
    `https://routing.openstreetmap.de/${mode === 'driving' ? 'routed-car' : 'routed-foot'}/route/v1/${mode === 'driving' ? 'driving' : 'foot'}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`,
    `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&alternatives=false`
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CSJMUNavigator/2.0 (Campus GIS & Navigation Engine)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        if (json.code === 'Ok' && json.routes?.length && json.routes[0].geometry?.coordinates?.length) {
          routeCache.set(cacheKey, {
            data: json,
            expiresAt: Date.now() + 60 * 1000,
          });
          if (routeCache.size > 200) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          return res.status(200).json(json);
        }
      }
    } catch {}
  }

  return res.status(502).json({ error: 'Routing service currently unavailable' });
}
