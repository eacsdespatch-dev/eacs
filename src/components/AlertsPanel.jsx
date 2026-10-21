/* ═══════════════════════════════════════════════════════════
 * ALERTS PANEL — Top-bar bell with expiring documents alerts
 * v2.2 — FIXED: window.alert instead of alert (scope conflict)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { computeAlerts } from "../utils/alerts";
import { fmtDate } from "../utils/helpers";
import { can as checkPerm } from "../config/permissions";
import { alertsAPI } from "../api";

export function AlertsPanel({ crew, users, fleet }) {
  const t = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState([]);
  const [showDismissed, setShowDismissed] = useState(false);

  /* ⭐ الصلاحيات */
  const canSeeCrewDocs = checkPerm(user, "crew.docs");
  const canSeeFleetDocs = checkPerm(user, "fleet.docs");
  const canViewAlerts =
    checkPerm(user, "alerts.view") || canSeeCrewDocs || canSeeFleetDocs;
  const canDismiss = checkPerm(user, "alerts.dismiss");

  /* ⭐ تحميل المتجاهَل عند الفتح */
  useEffect(() => {
    if (!open) return;
    async function load() {
      try {
        const list = await alertsAPI.listDismissed();
        setDismissedKeys(list.map((d) => d.alertKey));
      } catch (e) {
        console.warn("Failed to load dismissed alerts:", e.message);
      }
    }
    load();
  }, [open]);

  /* ⭐ حساب التنبيهات */
  const allAlerts = useMemo(
    () => computeAlerts(crew, users, fleet),
    [crew, users, fleet]
  );

  /* ⭐ فلترة حسب الصلاحيات */
  const permittedAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if ((a.source === "crew" || a.source === "user") && !canSeeCrewDocs)
        return false;
      if (a.source === "aircraft" && !canSeeFleetDocs) return false;
      return true;
    });
  }, [allAlerts, canSeeCrewDocs, canSeeFleetDocs]);

  /* ⭐ النشطة والمتجاهلة */
  const activeAlerts = permittedAlerts.filter(
    (a) => !dismissedKeys.includes(a.key)
  );
  const dismissedAlerts = permittedAlerts.filter((a) =>
    dismissedKeys.includes(a.key)
  );

  /* ⭐ تجاهل / إعادة — ⚠️ window.alert لتفادي تعارض المعامل */
  const handleDismiss = async (alertItem) => {
    if (!canDismiss) {
      window.alert("⚠️ ليس لديك صلاحية تجاهل التنبيهات");
      return;
    }
    if (!alertItem.key) {
      window.alert("⚠️ لا يمكن تجاهل هذا التنبيه (مفتاح مفقود)");
      return;
    }
    try {
      await alertsAPI.dismiss(alertItem.key, user?.id, user?.fullName, "");
      setDismissedKeys((prev) => [...prev, alertItem.key]);
    } catch (e) {
      window.alert("❌ فشل تجاهل التنبيه: " + e.message);
    }
  };

  const handleUndismiss = async (alertItem) => {
    if (!canDismiss) return;
    try {
      await alertsAPI.undismiss(alertItem.key);
      setDismissedKeys((prev) => prev.filter((k) => k !== alertItem.key));
    } catch (e) {
      window.alert("❌ فشل إعادة التنبيه: " + e.message);
    }
  };

  const colorFor = (sev) =>
    ({
      expired:
        "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
      critical:
        "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
      expiring:
        "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    }[sev] || "bg-slate-50 dark:bg-slate-900");

  /* ⭐ لا صلاحية */
  if (!canViewAlerts) {
    return (
      <button
        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed"
        title="ليس لديك صلاحية عرض التنبيهات"
        disabled
      >
        <Bell className="w-5 h-5 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Bell */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        title={t.alerts || "التنبيهات"}
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {activeAlerts.length > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {activeAlerts.length > 99 ? "99+" : activeAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute end-0 mt-2 w-96 max-h-[70vh] overflow-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-sm sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-slate-100">
                  {t.alerts || "التنبيهات"} ({activeAlerts.length})
                </span>
                {dismissedAlerts.length > 0 && (
                  <button
                    onClick={() => setShowDismissed((v) => !v)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1"
                    title="إظهار/إخفاء المتجاهَل"
                  >
                    {showDismissed ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    {dismissedAlerts.length}
                  </button>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {activeAlerts.length === 0 && dismissedAlerts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                {t.noAlerts || "لا توجد تنبيهات. كل شيء سليم!"}
              </div>
            ) : (
              <div className="p-2">
                {/* Active */}
                {activeAlerts.map((a, i) => (
                  <div
                    key={a.key || i}
                    className={`m-1 p-3 rounded-lg border text-xs ${colorFor(
                      a.sev
                    )}`}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{a.subject}</div>
                        <div className="opacity-80">
                          {a.label} · {a.source}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {canDismiss && a.key && (
                          <button
                            onClick={() => handleDismiss(a)}
                            className="p-1 rounded hover:bg-white/50 dark:hover:bg-slate-700 transition"
                            title="تجاهل"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-1 font-mono text-[10px]">
                      {fmtDate(a.expiry)} ·{" "}
                      {a.days < 0
                        ? `${Math.abs(a.days)} ${t.daysAgo || "منذ أيام"}`
                        : `${a.days} ${t.daysLeft || "يوم متبقٍ"}`}
                    </div>
                  </div>
                ))}

                {/* Dismissed */}
                {showDismissed &&
                  dismissedAlerts.map((a, i) => (
                    <div
                      key={`dismissed_${a.key || i}`}
                      className="m-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs opacity-70"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate line-through">
                            {a.subject}
                          </div>
                          <div className="opacity-80">
                            {a.label} · {a.source}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {canDismiss && (
                            <button
                              onClick={() => handleUndismiss(a)}
                              className="p-1 rounded hover:bg-white/50 dark:hover:bg-slate-700 transition"
                              title="إعادة"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[10px]">
                        {fmtDate(a.expiry)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AlertsPanel;
