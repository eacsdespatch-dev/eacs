/* ═══════════════════════════════════════════════════════════
 * FLIGHT PATH VISUALIZER — Pure SVG (no D3.js, no Leaflet)
 * v1.1 — Safe type handling for flightNo
 * ═══════════════════════════════════════════════════════════ */
import React, { useMemo, useState } from "react";
import { Plane, Globe, Maximize2, Minimize2 } from "lucide-react";

const AIRPORTS = {
  HLLT: { lat: 32.6635, lon: 13.159 },
  HLLB: { lat: 32.0968, lon: 20.2695 },
  HLLS: { lat: 27.0384, lon: 14.4286 },
  HLLM: { lat: 32.8944, lon: 13.276 },
  HLLO: { lat: 30.626, lon: 18.483 },
  HLLQ: { lat: 32.4119, lon: 13.0069 },
  LIRF: { lat: 41.8003, lon: 12.2389 },
  LIRN: { lat: 40.886, lon: 14.2908 },
  LICJ: { lat: 38.1759, lon: 13.091 },
  LMML: { lat: 35.8575, lon: 14.4775 },
  HECA: { lat: 30.1219, lon: 31.4056 },
  DTTA: { lat: 36.851, lon: 10.227 },
  DAAG: { lat: 36.691, lon: 3.215 },
  GMTT: { lat: 35.7269, lon: -5.9169 },
  GMMN: { lat: 33.3675, lon: -7.59 },
  LPPT: { lat: 38.7742, lon: -9.1342 },
  LEMD: { lat: 40.4719, lon: -3.5626 },
  LFPG: { lat: 49.0097, lon: 2.5479 },
  EGLL: { lat: 51.47, lon: -0.4543 },
  EDDF: { lat: 50.0379, lon: 8.5622 },
  LOWW: { lat: 48.1103, lon: 16.5697 },
  LTBA: { lat: 40.9769, lon: 28.8146 },
  OERK: { lat: 24.9576, lon: 46.6988 },
  OEJN: { lat: 21.6796, lon: 39.1565 },
  OMDB: { lat: 25.2532, lon: 55.3657 },
  OTHH: { lat: 25.2731, lon: 51.608 },
};

function project(lat, lon, width, height) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

function distanceNM(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAircraftPos(live) {
  if (!live) return null;
  const lat = live.latitude;
  const lon = live.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

export function FlightPathVisualizer({
  flights = [],
  fleet = [],
  liveData = {},
  selectedFlightId = null,
  onSelectFlight,
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const W = 1200;
  const H = 600;

  const flightsWithCoords = useMemo(() => {
    return flights
      .map((f) => {
        if (!f) return null;
        const dep = f.dep ? AIRPORTS[f.dep] : null;
        const arr = f.arr ? AIRPORTS[f.arr] : null;
        const live = getAircraftLive(f, liveData);
        const livePos = getAircraftPos(live);
        return {
          flight: f,
          dep,
          arr,
          live,
          livePos,
          hasRoute: !!(dep && arr),
        };
      })
      .filter(Boolean)
      .filter((x) => x.hasRoute || x.livePos);
  }, [flights, liveData]);

  if (flightsWithCoords.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
        <Globe className="w-16 h-16 mx-auto mb-3 opacity-30" />
        <div className="text-sm">
          لا توجد رحلات نشطة — أضف رحلة بحالة DEPARTED أو IN_FLIGHT
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${
        fullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Global Flight Paths ({flightsWithCoords.length})
          </span>
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div
        className="relative bg-slate-100 dark:bg-slate-900"
        style={{
          width: "100%",
          height: fullscreen ? "calc(100vh - 44px)" : "500px",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <rect
            x="0"
            y="0"
            width={W}
            height={H}
            fill="#0c4a6e"
            opacity="0.15"
          />

          {Array.from({ length: 13 }).map((_, i) => {
            const x = (i / 12) * W;
            return (
              <line
                key={`v${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={H}
                stroke="#94a3b8"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            );
          })}
          {Array.from({ length: 7 }).map((_, i) => {
            const y = (i / 6) * H;
            return (
              <line
                key={`h${i}`}
                x1={0}
                y1={y}
                x2={W}
                y2={y}
                stroke="#94a3b8"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            );
          })}

          <line
            x1={0}
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke="#94a3b8"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {flightsWithCoords.map(({ flight, dep, arr }, idx) => {
            const isSelected = selectedFlightId === flight.id;

            let pathD = null;
            if (dep && arr) {
              const p1 = project(dep.lat, dep.lon, W, H);
              const p2 = project(arr.lat, arr.lon, W, H);
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2 - Math.abs(p1.x - p2.x) * 0.1;
              pathD = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
            }

            return (
              <g key={`route-${flight.id || idx}`}>
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? "#f59e0b" : "#0ea5e9"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? "none" : "6,3"}
                    strokeOpacity={isSelected ? 1 : 0.6}
                  />
                )}

                {dep && (
                  <g>
                    <circle
                      cx={project(dep.lat, dep.lon, W, H).x}
                      cy={project(dep.lat, dep.lon, W, H).y}
                      r="5"
                      fill="#10b981"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={project(dep.lat, dep.lon, W, H).x + 8}
                      y={project(dep.lat, dep.lon, W, H).y + 4}
                      fontSize="10"
                      fill="#065f46"
                      fontWeight="bold"
                    >
                      {flight.dep}
                    </text>
                  </g>
                )}

                {arr && (
                  <g>
                    <circle
                      cx={project(arr.lat, arr.lon, W, H).x}
                      cy={project(arr.lat, arr.lon, W, H).y}
                      r="5"
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={project(arr.lat, arr.lon, W, H).x + 8}
                      y={project(arr.lat, arr.lon, W, H).y + 4}
                      fontSize="10"
                      fill="#991b1b"
                      fontWeight="bold"
                    >
                      {flight.arr}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {flightsWithCoords.map(({ flight, live, livePos }, idx) => {
            if (!livePos) return null;
            const { x, y } = project(livePos.lat, livePos.lon, W, H);
            const heading = live.true_track || 0;
            const isSelected = selectedFlightId === flight.id;
            const color = isSelected ? "#f59e0b" : "#10b981";

            return (
              <g
                key={`ac-${flight.id || idx}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectFlight?.(flight)}
                style={{ cursor: "pointer" }}
              >
                <circle r="12" fill={color} opacity="0.15" />
                <circle r="6" fill={color} opacity="0.3" />
                <g transform={`rotate(${heading})`}>
                  <path
                    d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                </g>
                <text
                  x="12"
                  y="4"
                  fontSize="10"
                  fill="#0f172a"
                  fontWeight="bold"
                  style={{ pointerEvents: "none" }}
                >
                  {live.callsign || flight.flightNo}
                </text>
                <text
                  x="12"
                  y="16"
                  fontSize="9"
                  fill="#64748b"
                  style={{ pointerEvents: "none" }}
                >
                  {flight.dep} → {flight.arr}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-3 start-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg p-2 text-[10px] space-y-1 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-200">
              Departure
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-700 dark:text-slate-200">Arrival</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Plane className="w-3 h-3 text-emerald-600" />
            <span className="text-slate-700 dark:text-slate-200">
              Live aircraft
            </span>
          </div>
        </div>

        {selectedFlightId && (
          <SelectedFlightInfo
            flights={flightsWithCoords}
            selectedId={selectedFlightId}
            onClose={() => onSelectFlight?.(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ⭐ نسخة آمنة — تتعامل مع flightNo كأي نوع */
function getAircraftLive(flight, liveData) {
  if (!flight || flight.flightNo == null) return null;
  const searchTerm = String(flight.flightNo).replace(/\s+/g, "").toUpperCase();
  if (!searchTerm) return null;
  for (const icao in liveData) {
    const d = liveData[icao];
    if (
      d &&
      d.callsign &&
      String(d.callsign).toUpperCase().includes(searchTerm)
    ) {
      return d;
    }
  }
  return null;
}

function SelectedFlightInfo({ flights, selectedId, onClose }) {
  const item = flights.find((x) => x.flight.id === selectedId);
  if (!item) return null;
  const { flight, live, livePos, dep, arr } = item;

  const dist = dep && arr ? distanceNM(dep.lat, dep.lon, arr.lat, arr.lon) : 0;
  const remaining =
    livePos && arr ? distanceNM(livePos.lat, livePos.lon, arr.lat, arr.lon) : 0;

  return (
    <div className="absolute top-3 end-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-slate-200 dark:border-slate-700 max-w-xs text-xs">
      <button
        onClick={onClose}
        className="absolute top-1 end-1 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        ✕
      </button>
      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">
        {flight.flightNo}
      </div>
      <div className="text-slate-500 dark:text-slate-400 mb-2">
        {flight.dep} → {flight.arr}
      </div>
      <div className="space-y-1 text-slate-600 dark:text-slate-300">
        <div className="flex justify-between">
          <span>Route:</span>
          <span className="font-mono">{dist.toFixed(0)} NM</span>
        </div>
        {live && (
          <>
            <div className="flex justify-between">
              <span>Alt:</span>
              <span className="font-mono">
                {live.baro_altitude
                  ? `${Math.round(
                      live.baro_altitude * 3.281
                    ).toLocaleString()} ft`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Speed:</span>
              <span className="font-mono">
                {live.velocity
                  ? `${Math.round(live.velocity * 1.944)} kt`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Remaining:</span>
              <span className="font-mono">{remaining.toFixed(0)} NM</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FlightPathVisualizer;
