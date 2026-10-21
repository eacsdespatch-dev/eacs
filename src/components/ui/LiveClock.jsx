/* ═══════════════════════════════════════════════════════════
 * LIVE CLOCK Component
 * Shows current UTC time (updates every second)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect } from "react";

export function LiveClock({ showLocal = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  const utcTime = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(
    now.getUTCSeconds()
  )}`;
  const utcDate = now.toISOString().slice(0, 10);

  const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds()
  )}`;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-mono">
      {/* UTC */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 font-bold">UTC</span>
        <span className="tabular-nums">{utcTime}</span>
        <span className="text-slate-400 hidden md:inline">{utcDate}</span>
      </div>

      {/* Local */}
      {showLocal && (
        <>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sky-400 font-bold">LT</span>
            <span className="tabular-nums">{localTime}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default LiveClock;
