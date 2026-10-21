/* ═══════════════════════════════════════════════════════════
 * PERMISSIONS MATRIX Component
 * Interactive permission selector grouped by category
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import { ALL_PERMISSIONS } from "../config/permissions";
import { useT } from "../contexts";
import { safeArray } from "../utils/helpers";

export function PermissionsMatrix({ value, onChange, lang = "en" }) {
  const t = useT();

  /* ⭐ ضمان أن value مصفوفة */
  const safeValue = safeArray(value);

  const [expanded, setExpanded] = useState(() => {
    const o = {};
    Object.keys(ALL_PERMISSIONS).forEach((k) => (o[k] = false));
    o.schedule = true;
    o.crew = true;
    return o;
  });

  const togglePerm = (key) => {
    if (safeValue.includes(key)) {
      onChange(safeValue.filter((k) => k !== key));
    } else {
      onChange([...safeValue, key]);
    }
  };

  const toggleGroup = (perms) => {
    const keys = perms.map((p) => p.key);
    const allOn = keys.every((k) => safeValue.includes(k));
    if (allOn) {
      onChange(safeValue.filter((k) => !keys.includes(k)));
    } else {
      onChange([...new Set([...safeValue, ...keys])]);
    }
  };

  return (
    <div className="space-y-2 max-h-[420px] overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
      {Object.entries(ALL_PERMISSIONS).map(([gk, g]) => {
        const keys = g.perms.map((p) => p.key);
        const allOn = keys.every((k) => safeValue.includes(k));
        const someOn = keys.some((k) => safeValue.includes(k));
        const open = expanded[gk];

        return (
          <div
            key={gk}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2">
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [gk]: !e[gk] }))}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                <span className="text-base">{g.icon}</span>
                <span
                  className={`transition-transform ${open ? "rotate-90" : ""}`}
                >
                  ▸
                </span>
                {lang === "ar" ? g.label_ar : g.label_en}
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">
                  {keys.length}
                </span>
              </button>

              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allOn}
                  ref={(el) => {
                    if (el) el.indeterminate = !allOn && someOn;
                  }}
                  onChange={() => toggleGroup(g.perms)}
                  className="w-4 h-4 accent-sky-600"
                />
                {t.allPerms}
              </label>
            </div>

            {/* Body */}
            {open && (
              <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                {g.perms.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs text-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={safeValue.includes(p.key)}
                      onChange={() => togglePerm(p.key)}
                      className="w-4 h-4 accent-sky-600"
                    />
                    <span className="flex-1">
                      {lang === "ar" ? p.ar : p.en}
                    </span>
                    <code className="text-[9px] text-slate-400 font-mono">
                      {p.key}
                    </code>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PermissionsMatrix;
