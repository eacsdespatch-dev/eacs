/* ═══════════════════════════════════════════════════════════
 * CREW PORTAL — Mobile Dashboard for Crew Members
 * v3.0 — Responsive + Drawer + Logout + Docs Expiry
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Menu,
  Calendar,
  Award,
  Clock,
  BookOpen,
  BarChart3,
  FileText,
  ExternalLink,
  ShieldAlert,
  Download,
  LogOut,
  User,
  Home,
  Plane,
  CheckCircle2,
  Filter,
  CalendarDays,
  FileDown,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { can as checkPerm } from "../config/permissions";
import { FTLModule } from "./FTLModule";
import { ManualsModule } from "./ManualsModule";
import {
  docStatus,
  daysUntil,
  formatFileSize,
  getStatusColor,
} from "../utils/helpers";

/* ⭐ دالة قوية لقراءة المرفقات */
function getDocs(c) {
  let att = c?.attachments;
  if (!att) return [];
  if (Array.isArray(att)) return att;
  if (typeof att === "string") {
    const trimmed = att.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      try {
        const fixed = trimmed.replace(/,\s*$/, "") + "]";
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e2) {}
    }
  }
  return [];
}

/* ⭐ توحيد شكل الكائن مع دعم كافة صيغ المستندات */
function normalizeDoc(doc, idx) {
  if (!doc) return null;
  if (typeof doc === "string") {
    return {
      id: `doc-${idx}`,
      name: doc.split("/").pop() || `File ${idx + 1}`,
      url: doc,
      type: "document",
      size: 0,
      expiry: "",
    };
  }
  const url = doc.url || doc.fileUrl || doc.path || doc.data || doc.href || "";
  const name = doc.name || doc.fileName || doc.title || `Document ${idx + 1}`;
  return {
    id: doc.id || `doc-${idx}`,
    name,
    url,
    type: doc.type || doc.mimeType || doc.mime || "document",
    size: Number(doc.size) || 0,
    expiry: doc.expiry || doc.expiryDate || "",
    uploadedAt: doc.uploadedAt || "",
  };
}

export function CrewPortal({
  crew,
  flights,
  settings,
  previewCrewPortal = false,
  onLogout,
}) {
  const t = useT();
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ⭐ إغلاق الـ drawer عند الضغط على Escape */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /* ⭐ Robust Crew Member Resolution (by crewId, email, or empNo/username) */
  const myCrewData = useMemo(() => {
    if (previewCrewPortal) return crew[0] || { fullName: "Preview Mode" };
    if (!user) return {};
    let found = crew.find((c) => String(c.id) === String(user.crewId));
    if (!found && user.email) {
      const em = user.email.toLowerCase().trim();
      found = crew.find((c) => c.email && c.email.toLowerCase().trim() === em);
    }
    if (!found && user.username) {
      const un = String(user.username).toLowerCase().trim();
      found = crew.find(
        (c) =>
          (c.empNo && String(c.empNo).toLowerCase().trim() === un) ||
          (c.eNumber && String(c.eNumber).toLowerCase().trim() === un)
      );
    }
    return found || {};
  }, [crew, user, previewCrewPortal]);

  const canSeeFTL = true;
  const canSeeManuals = true;
  const canSeeSchedule = true;
  const canSeeCerts = true;
  const canSeeHours = true;
  /* ⭐ Inside own portal, crew member always has right to view & download own documents */
  const canSeeFiles = true;
  const canDownloadDocs = true;

  const handleLogout = () => {
    setDrawerOpen(false);
    try {
      localStorage.removeItem("aeroops.user");
    } catch {}
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }
    if (typeof logout === "function") {
      logout();
      return;
    }
    window.location.reload();
  };

  if (!myCrewData?.id && !previewCrewPortal) {
    return (
      <div className="min-h-screen bg-[#1a4a73] text-white flex flex-col">
        <header className="sticky top-0 z-30 bg-[#153a5c] shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold">AeroOps</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout || "Exit"}</span>
            </button>
          </div>
        </header>
        <div className="p-8 text-center text-amber-200 font-bold flex-1 flex flex-col items-center justify-center">
          <div className="bg-amber-500/20 border border-amber-400 p-6 rounded-2xl max-w-md space-y-4">
            <p className="text-sm">
              ⚠️ هذا الحساب غير مرتبط بعضو طاقم. يرجى مراجعة الإدارة لربط الحساب.
            </p>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-lg transition cursor-pointer"
            >
              {t.logout || "Exit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myFlights = useMemo(() => {
    if (!myCrewData?.id) return [];
    return flights.filter((f) => {
      let slots = f.crewSlots;
      if (typeof slots === "string") {
        try {
          slots = JSON.parse(slots);
        } catch {
          slots = [];
        }
      }
      return (
        Array.isArray(slots) &&
        slots.some((slot) => String(slot.crewId) === String(myCrewData.id))
      );
    });
  }, [flights, myCrewData]);

  /* ═══ Date Range Filter for "MY HOURS" ═══ */
  const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);

  const [hoursFrom, setHoursFrom] = useState(defaultFrom);
  const [hoursTo, setHoursTo] = useState(defaultTo);

  const setHoursPreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      setHoursFrom(start);
      setHoursTo(todayStr);
    } else if (preset === "last30") {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setHoursFrom(past);
      setHoursTo(todayStr);
    } else if (preset === "thisYear") {
      const start = new Date(today.getFullYear(), 0, 1)
        .toISOString()
        .slice(0, 10);
      setHoursFrom(start);
      setHoursTo(todayStr);
    } else if (preset === "all") {
      setHoursFrom("");
      setHoursTo("");
    }
  };

  const parseDurationToMinutes = (val) => {
    if (!val) return 0;
    if (typeof val === "string" && val.includes(":")) {
      const [h, m] = val.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    const num = Number(val);
    return isNaN(num) ? 0 : Math.round(num * 60);
  };

  const formatMinutes = (totalMins) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins < 10 ? "0" : ""}${mins}m`;
  };

  const filteredHoursFlights = useMemo(() => {
    return myFlights.filter((f) => {
      const flightDate = f.std ? String(f.std).slice(0, 10) : "";
      if (hoursFrom && flightDate && flightDate < hoursFrom) return false;
      if (hoursTo && flightDate && flightDate > hoursTo) return false;
      return true;
    });
  }, [myFlights, hoursFrom, hoursTo]);

  // Executed flights are those completed or having actual block/flight times
  const executedFlights = useMemo(() => {
    return filteredHoursFlights
      .filter((f) => {
        const a = f.actual || {};
        const hasActual = Boolean(
          a.blockTime || a.flightTime || a.offBlock || a.onBlock || a.airborne || a.landing
        );
        return f.status === "ARRIVED" || hasActual;
      })
      .sort((a, b) => {
        const da = a.std ? new Date(a.std).getTime() : 0;
        const db = b.std ? new Date(b.std).getTime() : 0;
        return db - da; // newest first
      });
  }, [filteredHoursFlights]);

  const hoursStats = useMemo(() => {
    let flightMins = 0;
    let blockMins = 0;

    executedFlights.forEach((f) => {
      const a = f.actual || {};
      flightMins += parseDurationToMinutes(a.flightTime);
      blockMins += parseDurationToMinutes(a.blockTime);
    });

    return {
      flightMins,
      blockMins,
      flightFormatted: formatMinutes(flightMins),
      blockFormatted: formatMinutes(blockMins),
      flightHoursDecimal: (flightMins / 60).toFixed(1),
      blockHoursDecimal: (blockMins / 60).toFixed(1),
      executedCount: executedFlights.length,
      totalCount: filteredHoursFlights.length,
    };
  }, [executedFlights, filteredHoursFlights]);

  const myAttachments = useMemo(() => {
    const raw = getDocs(myCrewData);
    return raw.map((d, i) => normalizeDoc(d, i)).filter(Boolean);
  }, [myCrewData]);

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    {
      id: "schedule",
      icon: Calendar,
      label: "My Schedule",
      show: canSeeSchedule,
    },
    {
      id: "certificates",
      icon: Award,
      label: "Certificates",
      show: canSeeCerts,
    },
    { id: "ftl", icon: Clock, label: "FTL", show: canSeeFTL },
    { id: "manuals", icon: BookOpen, label: "Manuals", show: canSeeManuals },
    { id: "hours", icon: BarChart3, label: "My Hours", show: canSeeHours },
  ];

  return (
    <div className="min-h-screen bg-[#1a4a73] text-white font-sans" dir="ltr">
      {previewCrewPortal && (
        <div className="bg-amber-500 text-white text-xs font-bold py-1.5 px-3 text-center">
          👁️ وضع المعاينة (Admin Preview)
        </div>
      )}

      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-30 bg-[#153a5c] shadow-md">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold flex-1">Dashboard</h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200">
            <User className="w-4 h-4" />
            <span className="font-bold text-white">
              {myCrewData.fullName || user?.fullName || "Crew"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            title={t.logout || "Exit"}
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout || "Exit"}</span>
          </button>
        </div>
      </header>

      {/* ═══ Drawer ═══ */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#0f2c47] shadow-2xl flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 flex items-center justify-center text-white font-bold">
                  {(myCrewData.fullName || user?.fullName || "C")
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">
                    {myCrewData.fullName || user?.fullName || "Crew"}
                  </div>
                  <div className="text-[10px] text-blue-300 truncate">
                    {myCrewData.role || user?.role || "Crew Member"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {navItems
                .filter((n) => n.show !== false)
                .map((item) => {
                  const Icon = item.icon;
                  const active =
                    activeView === item.id ||
                    (item.id === "home" && !activeView);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id === "home" ? null : item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-1 ${
                        active
                          ? "bg-sky-600 text-white font-bold"
                          : "text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-bold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout || "Exit"}</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ═══ Main content ═══ */}
      <main className="max-w-6xl mx-auto">
        <div className="px-4 py-3 text-sm text-blue-200">
          Welcome,{" "}
          <span className="font-bold text-white">
            {myCrewData.fullName || user?.fullName || "Crew"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pb-20">
          {canSeeSchedule && (
            <PortalCard
              icon={Calendar}
              label="My Schedule"
              onClick={() => setActiveView("schedule")}
            />
          )}

          {canSeeCerts && (
            <PortalCard
              icon={Award}
              label="Certificates"
              onClick={() => setActiveView("certificates")}
              badge={
                canSeeFiles && myAttachments.length > 0
                  ? myAttachments.length
                  : null
              }
              badgeColor="emerald"
            />
          )}

          {canSeeFTL && (
            <PortalCard
              icon={Clock}
              label="FTL"
              onClick={() => setActiveView("ftl")}
            />
          )}
          {canSeeManuals && (
            <PortalCard
              icon={BookOpen}
              label="Manuals"
              onClick={() => setActiveView("manuals")}
            />
          )}
          {canSeeHours && (
            <PortalCard
              icon={BarChart3}
              label="My Hours"
              onClick={() => setActiveView("hours")}
            />
          )}
        </div>
      </main>

      {/* ═══ Overlay Modals ═══ */}
      {activeView && (
        <div className="fixed inset-0 z-50 bg-[#0f2c47] overflow-y-auto">
          <div className="sticky top-0 bg-[#153a5c] shadow-md z-10">
            <div className="max-w-6xl mx-auto p-3 flex justify-between items-center">
              <h2 className="font-bold text-lg capitalize">{activeView}</h2>
              <button
                onClick={() => setActiveView(null)}
                className="p-2 bg-[#235c8c] rounded-full hover:bg-[#2a6da3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto p-4">
            {/* ═══════════ SCHEDULE ═══════════ */}
            {activeView === "schedule" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myFlights.length === 0 ? (
                  <p className="text-center text-blue-200 md:col-span-2">
                    No flights assigned.
                  </p>
                ) : (
                  myFlights.map((f) => (
                    <div
                      key={f.id}
                      className="bg-[#235c8c] p-3 rounded-lg border border-[#3a7bb0]"
                    >
                      <div className="flex justify-between font-bold text-lg border-b border-[#3a7bb0] pb-2 mb-2">
                        <span>{f.flightNo}</span>
                        <span>
                          {f.dep} ✈ {f.arr}
                        </span>
                      </div>
                      <div className="text-sm text-blue-100 space-y-1">
                        <p>
                          STD: {f.std ? new Date(f.std).toLocaleString() : "—"}
                        </p>
                        <p>
                          STA: {f.sta ? new Date(f.sta).toLocaleString() : "—"}
                        </p>
                        <p>Aircraft: {f.acft}</p>
                        <p>Status: {f.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══════════ CERTIFICATES ═══════════ */}
            {activeView === "certificates" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-blue-100 font-bold mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>الشهادات والوثائق الرسمية (Official Credentials)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: "رخصة الطيران (License)",
                        value: myCrewData.licenseNo || "—",
                        exp: myCrewData.licenseExpiry,
                      },
                      {
                        label: "الشهادة الطبية (Medical)",
                        value: myCrewData.medicalExpiry ? "Medical Class 1" : "—",
                        exp: myCrewData.medicalExpiry,
                      },
                      {
                        label: "جواز السفر (Passport)",
                        value: myCrewData.passportNo || "—",
                        exp: myCrewData.passportExpiry,
                      },
                    ].map((doc, idx) => {
                      const days = daysUntil(doc.exp);
                      const st = docStatus(doc.exp);
                      const colorCls = getStatusColor(st);
                      return (
                        <div
                          key={idx}
                          className="bg-[#235c8c] p-3.5 rounded-xl border border-[#3a7bb0] shadow-md space-y-1.5"
                        >
                          <div className="text-xs text-blue-200 font-semibold">
                            {doc.label}
                          </div>
                          <div className="font-mono font-bold text-white text-base truncate">
                            {doc.value}
                          </div>
                          {doc.exp ? (
                            <div className="pt-1 flex items-center justify-between gap-1 flex-wrap border-t border-white/10 text-xs">
                              <span className="text-blue-200 font-mono text-[11px]">
                                📅 {String(doc.exp).slice(0, 10)}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${colorCls}`}
                              >
                                {days < 0
                                  ? `منتهي (${Math.abs(days)}d)`
                                  : days === 0
                                  ? "ينتهي اليوم"
                                  : `${days} يوم متبقٍ`}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-blue-300 italic pt-1 border-t border-white/10">
                              تاريخ الصلاحية غير محدد
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ═══ Attached Files & Certificates ═══ */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-blue-100 font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-sky-400" />
                      <span>الملفات والمستندات المحملة ({myAttachments.length})</span>
                    </h3>
                  </div>

                  {(() => {
                    const expired = myAttachments.filter(
                      (d) => docStatus(d.expiry) === "expired"
                    ).length;
                    const critical = myAttachments.filter(
                      (d) => docStatus(d.expiry) === "critical"
                    ).length;
                    if (expired === 0 && critical === 0) return null;
                    return (
                      <div className="mb-3 space-y-2">
                        {expired > 0 && (
                          <div className="p-3 bg-rose-500/20 border border-rose-400 rounded-xl text-rose-200 text-xs flex items-center gap-2 font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <span>⚠️ لديك {expired} مستند منتهي الصلاحية — يرجى التواصل مع العمليات لتحديثه</span>
                          </div>
                        )}
                        {critical > 0 && (
                          <div className="p-3 bg-orange-500/20 border border-orange-400 rounded-xl text-orange-200 text-xs flex items-center gap-2 font-bold">
                            <ShieldAlert className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span>⏰ لديك {critical} مستند ينتهي خلال 15 يوماً</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {myAttachments.length === 0 ? (
                    <div className="text-center py-10 bg-[#235c8c] rounded-xl border border-[#3a7bb0] p-4">
                      <FileText className="w-12 h-12 mx-auto text-blue-300 mb-2 opacity-50" />
                      <p className="text-white font-bold text-sm">
                        لا توجد ملفات أو شهادات مرفقة حالياً
                      </p>
                      <p className="text-blue-200 text-xs mt-1 max-w-md mx-auto">
                        يمكن لإدارة العمليات أو المدراء رفع وتحديث شهاداتك ومستنداتك عبر شاشة الأطقم (Crew Module).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {myAttachments.map((doc, idx) => {
                        const st = docStatus(doc.expiry);
                        const days = daysUntil(doc.expiry);
                        const colorCls = getStatusColor(st);
                        const cardBorder =
                          st === "expired"
                            ? "border-rose-400 bg-rose-900/30"
                            : st === "critical"
                            ? "border-orange-400 bg-orange-900/30"
                            : st === "expiring"
                            ? "border-amber-400 bg-amber-900/20"
                            : "border-[#3a7bb0] bg-[#235c8c]";

                        return (
                          <div
                            key={doc.id || idx}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${cardBorder}`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 shadow-xs">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-bold text-sm truncate text-white"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </div>
                                <div className="text-[11px] text-blue-300 font-mono mt-0.5">
                                  {doc.type || "Document"}
                                  {doc.size > 0 && ` · ${formatFileSize(doc.size)}`}
                                </div>
                                {doc.expiry && (
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-blue-100">
                                      📅 تاريخ الصلاحية: {String(doc.expiry).slice(0, 10)}
                                    </span>
                                    {days !== null && (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${colorCls}`}
                                      >
                                        {days < 0
                                          ? `منتهي منذ ${Math.abs(days)} يوم`
                                          : days === 0
                                          ? "ينتهي اليوم"
                                          : `ساري (${days} يوم متبقٍ)`}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {doc.url ? (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 transition text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="فتح المستند"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">فتح</span>
                                </a>
                                <a
                                  href={doc.url}
                                  download={doc.name}
                                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="تحميل الملف"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">تحميل</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-200 bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded">
                                مستند مسجل
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════ FTL ═══════════ */}
            {activeView === "ftl" && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-black">
                <FTLModule crew={[myCrewData]} flights={myFlights} />
              </div>
            )}

            {/* ═══════════ MANUALS ═══════════ */}
            {activeView === "manuals" && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-black">
                <ManualsModule
                  settings={settings}
                  companyName={settings?.companyName}
                />
              </div>
            )}

            {/* ═══════════ HOURS (ساعات الطيران الفعلية المنفذة) ═══════════ */}
            {activeView === "hours" && (
              <div className="space-y-4">
                {/* ═══ Date Range Filter Bar ═══ */}
                <div className="bg-[#235c8c] p-4 rounded-xl border border-[#3a7bb0] shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-blue-100 flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-sky-300" />
                      تصفية الساعات المنفذة بالتاريخ (من - إلى)
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setHoursPreset("thisMonth")}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        هذا الشهر
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoursPreset("last30")}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        آخر 30 يوم
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoursPreset("thisYear")}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        هذا العام
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoursPreset("all")}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        الكل
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-blue-200 font-semibold mb-1">
                        📅 من تاريخ (From Date)
                      </label>
                      <input
                        type="date"
                        value={hoursFrom}
                        onChange={(e) => setHoursFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#153a5c] border border-[#3a7bb0] text-white text-xs outline-none focus:ring-2 focus:ring-sky-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-blue-200 font-semibold mb-1">
                        📅 إلى تاريخ (To Date)
                      </label>
                      <input
                        type="date"
                        value={hoursTo}
                        onChange={(e) => setHoursTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#153a5c] border border-[#3a7bb0] text-white text-xs outline-none focus:ring-2 focus:ring-sky-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ═══ Summary KPI Cards ═══ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#235c8c] p-4 rounded-xl border border-[#3a7bb0] shadow-lg">
                    <div className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>ساعات الطيران الفعلية</span>
                      <span className="text-[10px] text-sky-300">Flight Time</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-white">
                      {hoursStats.flightFormatted}
                    </div>
                    <div className="text-[11px] text-blue-200 mt-1 font-mono">
                      {hoursStats.flightHoursDecimal} hrs (ساعة كسرية)
                    </div>
                  </div>

                  <div className="bg-[#235c8c] p-4 rounded-xl border border-[#3a7bb0] shadow-lg">
                    <div className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>ساعات البلوك الفعلية</span>
                      <span className="text-[10px] text-sky-300">Block Time</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-white">
                      {hoursStats.blockFormatted}
                    </div>
                    <div className="text-[11px] text-blue-200 mt-1 font-mono">
                      {hoursStats.blockHoursDecimal} hrs (ساعة كسرية)
                    </div>
                  </div>

                  <div className="bg-[#235c8c] p-4 rounded-xl border border-[#3a7bb0] shadow-lg">
                    <div className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>الرحلات المنفذة</span>
                      <span className="text-[10px] text-sky-300">Executed Flights</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-white">
                      {hoursStats.executedCount}
                    </div>
                    <div className="text-[11px] text-blue-200 mt-1">
                      من أصل {hoursStats.totalCount} رحلة في الفترة
                    </div>
                  </div>
                </div>

                {/* ═══ Executed Flights Breakdown ═══ */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-blue-100 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-sky-400" />
                      سجل الرحلات المنفذة بالتفصيل ({executedFlights.length})
                    </h3>
                  </div>

                  {executedFlights.length === 0 ? (
                    <div className="p-8 text-center bg-[#235c8c] rounded-xl border border-[#3a7bb0] text-blue-200">
                      <Clock className="w-10 h-10 mx-auto text-blue-300 mb-2 opacity-50" />
                      <p className="font-bold text-sm">
                        لا توجد رحلات منفذة مسجلة في هذه الفترة المحددة
                      </p>
                      <p className="text-xs text-blue-300 mt-1">
                        يمكنك تغيير نطاق التواريخ بالأعلى أو اختيار &quot;الكل&quot; لعرض جميع الرحلات المنفذة.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {executedFlights.map((f) => {
                        const a = f.actual || {};
                        const dateStr = f.std ? String(f.std).slice(0, 10) : "—";
                        const slot = (f.crewSlots || []).find(
                          (s) => String(s.crewId) === String(myCrewData.id)
                        );
                        return (
                          <div
                            key={f.id}
                            className="bg-[#235c8c] p-3.5 rounded-xl border border-[#3a7bb0] shadow-md space-y-2.5"
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-white text-base">
                                  {f.flightNo || "Flight"}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
                                  {f.status || "ARRIVED"}
                                </span>
                                {slot?.position && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/30 text-sky-200 border border-sky-400/30">
                                    {slot.position}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-blue-200">
                                📅 {dateStr}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{f.dep}</span>
                                <span className="text-sky-300">➔</span>
                                <span>{f.arr}</span>
                                {f.altn && (
                                  <span className="text-[10px] text-blue-300 font-normal">
                                    (Altn: {f.altn})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono font-bold text-sky-200 bg-[#153a5c] px-2 py-1 rounded">
                                ✈️ {f.acft || "—"}
                              </div>
                            </div>

                            {/* Actual Times Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                              <div className="p-2 rounded-lg bg-[#153a5c] text-center">
                                <span className="text-[10px] text-blue-300 block">
                                  Block Out
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {a.offBlock || "—"}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#153a5c] text-center">
                                <span className="text-[10px] text-blue-300 block">
                                  Take-Off
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {a.airborne || "—"}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#153a5c] text-center">
                                <span className="text-[10px] text-blue-300 block">
                                  Landing
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {a.landing || "—"}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#153a5c] text-center">
                                <span className="text-[10px] text-blue-300 block">
                                  Block In
                                </span>
                                <span className="font-mono font-bold text-white">
                                  {a.onBlock || "—"}
                                </span>
                              </div>
                            </div>

                            {/* Actual Flight Time & Block Time Banner */}
                            <div className="flex items-center justify-between pt-1 text-xs font-mono border-t border-white/10">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-300">Flight Time:</span>
                                <span className="font-bold text-emerald-300 text-sm">
                                  {a.flightTime ? `${a.flightTime} hrs` : "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-blue-300">Block Time:</span>
                                <span className="font-bold text-sky-300 text-sm">
                                  {a.blockTime ? `${a.blockTime} hrs` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * PortalCard — بطاقة موحدة للشبكة
 * ═══════════════════════════════════════════════════════════ */
function PortalCard({
  icon: Icon,
  label,
  onClick,
  badge,
  badgeColor = "emerald",
}) {
  const badgeCls =
    badgeColor === "emerald"
      ? "bg-emerald-500"
      : badgeColor === "rose"
      ? "bg-rose-500"
      : "bg-sky-500";

  return (
    <button
      onClick={onClick}
      className="relative aspect-square bg-[#235c8c] rounded-xl flex flex-col items-center justify-center p-4 hover:bg-[#2a6da3] active:scale-[0.98] transition shadow-lg border border-[#3a7bb0]"
    >
      <Icon
        className="w-12 h-12 sm:w-14 sm:h-14 text-white mb-2 sm:mb-3 drop-shadow-md"
        strokeWidth={1.5}
      />
      <span className="text-[11px] sm:text-xs font-bold text-center uppercase tracking-wider">
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`absolute top-2 end-2 ${badgeCls} text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-lg`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default CrewPortal;
