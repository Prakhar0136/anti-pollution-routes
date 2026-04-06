export const fetchAirQualityData = async (lat: number, lng: number) => {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10&hourly=pm2_5&timezone=auto&forecast_days=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch air quality");
  return await res.json();
};

export const fetchWaypointAQI = async (lat: number, lng: number) => {
  try {
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5`);
    const data = await res.json();
    return data.current?.pm2_5 || 0;
  } catch {
    return 0;
  }
};

export const fetchOSRMRoute = async (startLng: number, startLat: number, endLng: number, endLat: number) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&alternatives=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch routes");
  return await res.json();
};

export const searchAddress = async (query: string) => {
  if (query.length < 3) return [];
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features || [];
};

export const reverseGeocode = async (lat: number, lng: number) => {
  let addressName = `Custom Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
    const data = await res.json();
    if (data.features?.length > 0) {
      const props = data.features[0].properties;
      addressName = [props.name, props.street, props.city, props.state].filter(Boolean).join(", ") || addressName;
    }
  } catch (error) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data.display_name) addressName = data.display_name;
    } catch (err) {
      console.error("Geocoding failed", err);
    }
  }
  return addressName;
};