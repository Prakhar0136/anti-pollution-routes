"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supabase";

import { fetchAirQualityData, fetchWaypointAQI, fetchOSRMRoute, searchAddress, reverseGeocode } from "../services/api";
import { useSavedRoutes } from "../hooks/useSavedRoutes";
import SearchInput from "./SearchInput";
import SavedRoutesList from "./SavedRoutesList";

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

function MapController({ start, end }: { start: L.LatLng | null, end: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (start && end) {
      map.fitBounds(L.latLngBounds(start, end), { padding: [80, 80] });
    } else if (start) map.flyTo(start, 14);
    else if (end) map.flyTo(end, 14);
    setTimeout(() => { map.invalidateSize(); }, 400);
  }, [start, end, map]);
  return null;
}

function AQIBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  let color = "#ef4444";
  let bg = "rgba(239,68,68,0.15)";
  if (value <= 12) { color = "#10b981"; bg = "rgba(16,185,129,0.15)"; }
  else if (value <= 35) { color = "#f59e0b"; bg = "rgba(245,158,11,0.15)"; }

  return (
    <div style={{ background: bg, border: `1px solid ${color}30` }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full">
      <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px]" style={{ color: "#64748b" }}>PM2.5</span>
    </div>
  );
}

export default function Map() {
  const [user, setUser] = useState<any>(null);
  const [sidebarTab, setSidebarTab] = useState<"route" | "saved">("route");
  const [panelOpen, setPanelOpen] = useState(true);

  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
  const startTimer = useRef<NodeJS.Timeout | null>(null);
  const endTimer = useRef<NodeJS.Timeout | null>(null);

  const [startAQI, setStartAQI] = useState<any>(null);
  const [endAQI, setEndAQI] = useState<any>(null);
  const [forecastTip, setForecastTip] = useState<string | null>(null);

  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeName, setRouteName] = useState("");

  const { savedRoutes, isSaving, saveRoute, deleteRoute } = useSavedRoutes(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  const handleFetchAirQuality = async (lat: number, lng: number, isStart: boolean) => {
    try {
      const data = await fetchAirQualityData(lat, lng);
      if (isStart) {
        setStartAQI(data.current);
        if (data.hourly?.pm2_5 && data.current.pm2_5) {
          const currentPm = data.current.pm2_5;
          const now = new Date();
          let bestTime = null, minPm = currentPm;
          for (let i = 0; i < data.hourly.time.length; i++) {
            const time = new Date(data.hourly.time[i]);
            if (time > now && time.getTime() < now.getTime() + 12 * 3600000 && data.hourly.pm2_5[i] < minPm) {
              minPm = data.hourly.pm2_5[i]; bestTime = time;
            }
          }
          if (bestTime && minPm < currentPm * 0.85) {
            const drop = Math.round(((currentPm - minPm) / currentPm) * 100);
            setForecastTip(`Leave at ${bestTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — save ${drop}% PM2.5 exposure`);
          } else setForecastTip(null);
        }
      } else setEndAQI(data.current);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (startPoint && endPoint) {
      (async () => {
        setIsAnalyzing(true);
        try {
          const data = await fetchOSRMRoute(startPoint.lng, startPoint.lat, endPoint.lng, endPoint.lat);
          if (data.routes?.length > 0) {
            const analyzed = await Promise.all(data.routes.map(async (route: any, index: number) => {
              const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              const distanceKm = (route.distance / 1000).toFixed(1);
              const durationMin = Math.round(route.duration / 60);
              if (coordinates.length < 3) return { id: index, coordinates, aqi: 0, color: "#475569", distanceKm, durationMin };
              const [wp1, wp2, wp3] = [0.25, 0.5, 0.75].map(f => coordinates[Math.floor(coordinates.length * f)]);
              const aqiValues = await Promise.all([wp1, wp2, wp3].map(wp => fetchWaypointAQI(wp[0], wp[1])));
              const averageAQI = Math.round(aqiValues.reduce((a, b) => a + b, 0) / 3);
              let color = "#ef4444";
              if (averageAQI <= 12) color = "#10b981";
              else if (averageAQI <= 35) color = "#f59e0b";
              return { id: index, coordinates, aqi: averageAQI, color, distanceKm, durationMin };
            }));
            setAllRoutes(analyzed);
            setActiveRouteId(0);
          }
        } catch (e) { console.error(e); }
        finally { setIsAnalyzing(false); }
      })();
    }
  }, [startPoint, endPoint]);

  const handleMapClick = async (latlng: L.LatLng) => {
    const addressName = await reverseGeocode(latlng.lat, latlng.lng);
    if (!startPoint) {
      setStartPoint(latlng); setStartQuery(addressName);
      handleFetchAirQuality(latlng.lat, latlng.lng, true);
    } else if (!endPoint) {
      setEndPoint(latlng); setEndQuery(addressName);
      handleFetchAirQuality(latlng.lat, latlng.lng, false);
    } else {
      setStartPoint(latlng); setEndPoint(null); setAllRoutes([]);
      setStartQuery(addressName); setEndQuery(""); setForecastTip(null);
      handleFetchAirQuality(latlng.lat, latlng.lng, true); setEndAQI(null);
    }
  };

  const onStartChange = (val: string) => {
    setStartQuery(val);
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = setTimeout(async () => setStartSuggestions(await searchAddress(val)), 400);
  };

  const onEndChange = (val: string) => {
    setEndQuery(val);
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = setTimeout(async () => setEndSuggestions(await searchAddress(val)), 400);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setStartPoint(L.latLng(latitude, longitude));
        setStartQuery("Current Location");
        setStartSuggestions([]);
        handleFetchAirQuality(latitude, longitude, true);
      },
      () => alert("Unable to retrieve location.")
    );
  };

  const handleSaveRouteClick = async () => {
    if (!startPoint || !endPoint || !routeName) return alert("Please enter a route name.");
    try {
      await saveRoute(routeName,
        { lat: startPoint.lat, lng: startPoint.lng, address: startQuery },
        { lat: endPoint.lat, lng: endPoint.lng, address: endQuery }
      );
      setRouteName("");
    } catch (err: any) { alert(err.message); }
  };

  const loadSavedRoute = (route: any) => {
    const start = JSON.parse(route.start_point);
    const end = JSON.parse(route.end_point);
    setStartPoint(L.latLng(start.lat, start.lng));
    setEndPoint(L.latLng(end.lat, end.lng));
    setStartQuery(start.address || "Saved Start");
    setEndQuery(end.address || "Saved Dest");
    handleFetchAirQuality(start.lat, start.lng, true);
    handleFetchAirQuality(end.lat, end.lng, false);
    setSidebarTab("route");
  };

  const activeRoute = allRoutes.find(r => r.id === activeRouteId);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#0a0f1e",
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
      className="flex"
    >

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        html, body, #__next {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .glass-panel {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(99, 102, 241, 0.12);
        }
        .glass-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }
        .glass-card:hover { background: rgba(30, 41, 59, 0.85); border-color: rgba(99,102,241,0.2); }
        .input-dark {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0;
          transition: all 0.2s ease;
        }
        .input-dark::placeholder { color: #475569; }
        .input-dark:focus {
          outline: none;
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .tab-active {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          border-color: rgba(99, 102, 241, 0.3);
        }
        .tab-inactive {
          color: #64748b;
          border-color: transparent;
        }
        .tab-inactive:hover { color: #94a3b8; }
        .route-btn-active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .leaflet-container { background: #0a0f1e; }
        .leaflet-tile { filter: brightness(0.85) saturate(0.7) hue-rotate(195deg); }
        .pulse-dot::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid currentColor;
          animation: pulse-ring 2s ease-out infinite;
          opacity: 0;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.5) !important; color: #475569 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #6366f1 !important; }
      `}</style>

      {/* MAP — full screen base layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <MapContainer
          center={[28.6139, 77.2090]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController start={startPoint} end={endPoint} />
          <MapClickHandler onMapClick={handleMapClick} />

          {startPoint && (
            <Marker position={startPoint}>
              <Popup>
                <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 120 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, color: "#1e293b" }}>Start</p>
                  {startAQI && <p style={{ fontSize: 12, color: "#64748b" }}>PM2.5: <strong>{startAQI.pm2_5}</strong></p>}
                </div>
              </Popup>
            </Marker>
          )}

          {endPoint && (
            <Marker position={endPoint}>
              <Popup>
                <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 120 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, color: "#1e293b" }}>Destination</p>
                  {endAQI && <p style={{ fontSize: 12, color: "#64748b" }}>PM2.5: <strong>{endAQI.pm2_5}</strong></p>}
                </div>
              </Popup>
            </Marker>
          )}

          {allRoutes.map((route) =>
            route.id !== activeRouteId ? (
              <Polyline key={route.id} positions={route.coordinates} color="#334155" weight={3}
                opacity={0.7} dashArray="6,6" eventHandlers={{ click: () => setActiveRouteId(route.id) }} />
            ) : null
          )}
          {activeRoute && <Polyline positions={activeRoute.coordinates} color={activeRoute.color} weight={5} opacity={0.95} />}
        </MapContainer>
      </div>

      {/* SIDEBAR PANEL */}
      <div
        className={`relative z-10 h-full flex flex-col glass-panel transition-all duration-300 ${panelOpen ? 'w-full max-w-[360px]' : 'w-0 overflow-hidden'}`}
        style={{ minWidth: panelOpen ? undefined : 0, flexShrink: 0 }}
      >
        {panelOpen && (
          <div className="flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 relative pulse-dot" style={{ color: '#818cf8' }}></div>
                    <span style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase' }}>CLEARCOMMUTE</span>
                  </div>
                  <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Smart Healthy Navigation</h1>
                </div>
                {user && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
  onClick={handleSignOut}
  style={{
    fontSize: 12,
    color: '#fca5a5',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    padding: '6px 10px',
    borderRadius: 8, 
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.04em',
    transition: 'all 0.2s ease', 
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; 
    e.currentTarget.style.color = '#fecaca';
    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
    e.currentTarget.style.color = '#fca5a5';
    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
  }}
>
  Sign out
</button>
                  </div>
                )}
              </div>

              {/* Tabs */}
              {user && (
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {(['route', 'saved'] as const).map(tab => (
                    <button key={tab} onClick={() => setSidebarTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${sidebarTab === tab ? 'tab-active' : 'tab-inactive border-transparent'}`}>
                      {tab === 'route' ? '⬡ Plan Route' : '⊞ Saved'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

              {sidebarTab === "route" && (
                <>
                  {/* Search inputs */}
                  <div className="space-y-2">
                    <SearchInput label="From" placeholder="Search departure..." query={startQuery}
                      suggestions={startSuggestions} onChange={onStartChange}
                      onUseLocation={handleUseCurrentLocation}
                      onSelect={(f) => {
                        const [lng, lat] = f.geometry.coordinates;
                        setStartPoint(L.latLng(lat, lng));
                        setStartQuery([f.properties.name, f.properties.city].filter(Boolean).join(", "));
                        setStartSuggestions([]);
                        handleFetchAirQuality(lat, lng, true);
                      }} />
                    <SearchInput label="To" placeholder="Search destination..." query={endQuery}
                      suggestions={endSuggestions} onChange={onEndChange}
                      onSelect={(f) => {
                        const [lng, lat] = f.geometry.coordinates;
                        setEndPoint(L.latLng(lat, lng));
                        setEndQuery([f.properties.name, f.properties.city].filter(Boolean).join(", "));
                        setEndSuggestions([]);
                        handleFetchAirQuality(lat, lng, false);
                      }} />
                  </div>

                  {/* AQI badges */}
                  {(startAQI || endAQI) && (
                    <div className="flex gap-2 flex-wrap slide-in">
                      {startAQI?.pm2_5 && <AQIBadge value={startAQI.pm2_5} label="Start" />}
                      {endAQI?.pm2_5 && <AQIBadge value={endAQI.pm2_5} label="End" />}
                    </div>
                  )}

                  {/* Forecast tip */}
                  {forecastTip && (
                    <div className="slide-in rounded-xl px-4 py-3 flex items-start gap-3"
                      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <span style={{ fontSize: 16 }}>⏱</span>
                      <p style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.5 }}>{forecastTip}</p>
                    </div>
                  )}

                  {/* Route results */}
                  {startPoint && endPoint && (
                    <div className="space-y-3 slide-in">
                      {isAnalyzing ? (
                        <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="w-8 h-8 border-2 border-indigo-300/20 rounded-full absolute inset-0"></div>
                          </div>
                          <p style={{ fontSize: 12, color: '#64748b' }}>Sampling air quality along route…</p>
                        </div>
                      ) : activeRoute ? (
                        <>
                          {/* Active route card */}
                          <div className="rounded-2xl p-4 relative overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${activeRoute.color}20, ${activeRoute.color}08)`, border: `1px solid ${activeRoute.color}30` }}>
                            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
                              style={{ background: activeRoute.color, transform: 'translate(30%, -30%)' }}></div>
                            <div className="flex items-start justify-between">
                              <div>
                                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Route</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>{activeRoute.distanceKm} km</p>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{activeRoute.durationMin} min estimated</p>
                              </div>
                              <div className="text-right">
                                <div className="inline-flex flex-col items-center justify-center w-16 h-16 rounded-2xl"
                                  style={{ background: `${activeRoute.color}20`, border: `2px solid ${activeRoute.color}50` }}>
                                  <span style={{ fontSize: 22, fontWeight: 800, color: activeRoute.color, fontFamily: "'DM Mono', monospace" }}>{activeRoute.aqi}</span>
                                  <span style={{ fontSize: 8, color: activeRoute.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PM2.5</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Alternative routes */}
                          {allRoutes.length > 1 && (
                            <div className="space-y-1.5">
                              <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>All Routes</p>
                              {allRoutes.map((route) => (
                                <button key={route.id} onClick={() => setActiveRouteId(route.id)}
                                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all text-left glass-card ${activeRouteId === route.id ? 'route-btn-active' : ''}`}>
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full" style={{ background: route.color }}></div>
                                    <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>Route {route.id + 1}</span>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>{route.distanceKm}km · {route.durationMin}m</span>
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: route.color, fontFamily: "'DM Mono', monospace" }}>{route.aqi}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Save route */}
                          {user ? (
                            <div className="glass-card rounded-xl p-3 space-y-2">
                              <input type="text" placeholder="Name this route…" value={routeName}
                                onChange={(e) => setRouteName(e.target.value)}
                                className="input-dark w-full px-3.5 py-2.5 rounded-lg text-sm" />
                              <button onClick={handleSaveRouteClick} disabled={isSaving}
                                style={{ background: isSaving ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.85)', color: '#fff', fontSize: 13, fontWeight: 600 }}
                                className="w-full py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50">
                                {isSaving ? "Saving…" : "Save Route"}
                              </button>
                            </div>
                          ) : (
                            <p style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>Sign in to save routes</p>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* Empty state */}
                  {!startPoint && (
                    <div className="glass-card rounded-2xl p-5 text-center slide-in">
                      <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl"
                        style={{ background: 'rgba(99,102,241,0.1)' }}>🗺</div>
                      <p style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500, marginBottom: 4 }}>Plot your clean air route</p>
                      <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>Search or tap the map to set departure & destination. We'll find the lowest-pollution path.</p>
                    </div>
                  )}
                </>
              )}

              {sidebarTab === "saved" && user && (
                <div className="slide-in">
                  <SavedRoutesList routes={savedRoutes} onLoadRoute={loadSavedRoute}
                    onDeleteRoute={(e, id) => { e.stopPropagation(); deleteRoute(id); }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Panel toggle button */}
      <button onClick={() => setPanelOpen(!panelOpen)}
        style={{
          position: 'absolute',
          zIndex: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          left: panelOpen ? 'calc(360px - 12px)' : '12px',
          width: 24,
          height: 48,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 8,
          color: '#6366f1',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.3s',
        }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d={panelOpen ? "M7 2L3 5L7 8" : "M3 2L7 5L3 8"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
