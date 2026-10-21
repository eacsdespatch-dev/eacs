/* ═══════════════════════════════════════════════════════════
 * AEROOPS — Main App
 * v7.1 — Pass users/setUsers to Crew for duplicate prevention
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef } from "react";
import {
  Plane,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";

/* ═══════ API ═══════ */
import {
  usersAPI,
  crewAPI,
  fleetAPI,
  flightsAPI,
  settingsAPI,
  rolesAPI,
  auditAPI,
  rosterAPI,
  standbyAPI,
  leaveAPI,
  trainingAPI,
  loginHistoryAPI,
} from "./api";

/* ═══════ Config ═══════ */
import { setGlobalRoles, can as checkPerm } from "./config/permissions";

/* ═══════ Contexts ═══════ */
import { LangProvider, useT } from "./contexts/LangContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

/* ═══════ Hooks ═══════ */
import { useLocalStorage } from "./hooks/useLocalStorage";

/* ═══════ Utils ═══════ */
import { logSafe, logLoginSafe } from "./utils/audit";
import { unlockAudio } from "./utils/sounds";

/* ═══════ UI Components ═══════ */
import { SyncBadge } from "./components/ui/SyncBadge";
import { LiveClock } from "./components/ui/LiveClock";
import { AlertsPanel } from "./components/AlertsPanel";
import { Login } from "./components/Login";
import { GenDecModal } from "./components/GenDecModal";
import { SoundNotifications } from "./components/SoundNotifications";

/* ═══════ Modules ═══════ */
import { Dashboard } from "./modules/Dashboard";
import { ScheduleBoard } from "./modules/ScheduleBoard";
import { FTLModule } from "./modules/FTLModule";
import { ReportsModule } from "./modules/ReportsModule";
import { Crew } from "./modules/Crew";
import { Fleet } from "./modules/Fleet";
import { SettingsModule } from "./modules/SettingsModule";
import { RosterModule } from "./modules/RosterModule";
import { StandbyModule } from "./modules/StandbyModule";
import { LeaveModule } from "./modules/LeaveModule";
import { TrainingModule } from "./modules/TrainingModule";
import { FlightFollowingModule } from "./modules/FlightFollowingModule";
import { ChartsModule } from "./modules/ChartsModule";
import { ManualsModule } from "./modules/ManualsModule";

/* ⭐ واجهة الطاقم */
import { CrewPortal } from "./modules/CrewPortal";

/* ═══════ Icons ═══════ */
import {
  LayoutDashboard,
  Calendar,
  Clock,
  BarChart3,
  CalendarDays,
  Zap,
  Plane as PlaneIcon,
  GraduationCap,
  Navigation,
  Settings,
  Users,
} from "lucide-react";
import { CrewTableIcon } from "./crewIcons";

/* ═══════════════════════════════════════════════════════════
 * REPORTS SUBTABS CONFIG
 * ═══════════════════════════════════════════════════════════ */
const REPORTS_SUBTABS = [
  {
    id: "crewHours",
    icon: BarChart3,
    label_en: "Crew Hours",
    label_ar: "ساعات الطاقم",
  },
  {
    id: "completedFlights",
    icon: Plane,
    label_en: "Completed Flights",
    label_ar: "الرحلات المنفذة",
  },
  {
    id: "dutyTime",
    icon: Clock,
    label_en: "Duty Time",
    label_ar: "ساعات الخدمة",
  },
];

/* ═══════════════════════════════════════════════════════════
 * ALL TABS CONFIG
 * ═══════════════════════════════════════════════════════════ */
const ALL_TABS_CONFIG = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label_en: "Dashboard",
    label_ar: "الرئيسية",
    perm: "schedule.view",
    position: "primary",
  },
  {
    id: "schedule",
    icon: Calendar,
    label_en: "Schedule",
    label_ar: "الجدول",
    perm: "schedule.view",
    position: "primary",
  },
  {
    id: "ftl",
    icon: Clock,
    label_en: "FTL",
    label_ar: "ساعات الطيران",
    perm: "ftl.view",
    position: "primary",
  },
  {
    id: "reports",
    icon: BarChart3,
    label_en: "Reports",
    label_ar: "التقارير",
    perm: "reports.view",
    position: "primary",
    hasSubTabs: true,
  },
  {
    id: "roster",
    icon: CalendarDays,
    label_en: "Roster",
    label_ar: "الجدول الشهري",
    perm: "roster.view",
    position: "more",
  },
  {
    id: "standby",
    icon: Zap,
    label_en: "Standby",
    label_ar: "الاحتياطي",
    perm: "standby.view",
    position: "more",
  },
  {
    id: "leave",
    icon: PlaneIcon,
    label_en: "Leave",
    label_ar: "الإجازات",
    perm: "leave.view",
    position: "more",
  },
  {
    id: "training",
    icon: GraduationCap,
    label_en: "Training",
    label_ar: "التدريب",
    perm: "training.view",
    position: "more",
  },
  {
    id: "tracking",
    icon: Navigation,
    label_en: "Following",
    label_ar: "متابعة الرحلات",
    perm: "tracking.view",
    position: "more",
  },
  {
    id: "charts",
    icon: BarChart3,
    label_en: "Charts",
    label_ar: "الرسوم",
    perm: "charts.view",
    position: "more",
  },
  {
    id: "fleet",
    icon: Plane,
    label_en: "Fleet",
    label_ar: "الأسطول",
    perm: "fleet.view",
    position: "more",
  },
  {
    id: "crew",
    icon: CrewTableIcon,
    label_en: "Crew",
    label_ar: "الطاقم",
    perm: "crew.view",
    position: "more",
  },
  {
    id: "manuals",
    icon: BookOpen,
    label_en: "Manuals",
    label_ar: "الأدلة والمراجع",
    perm: "schedule.view",
    position: "more",
  },
  {
    id: "settings",
    icon: Settings,
    label_en: "Settings",
    label_ar: "الإعدادات",
    perm: "settings.view",
    position: "more",
  },
];

/* ═══════════════════════════════════════════════════════════
 * APP INNER
 * ═══════════════════════════════════════════════════════════ */
function AppInner() {
  const t = useT();

  const [lang, setLang] = useLocalStorage("aeroops.lang", "en");
  const [tab, setTab] = useLocalStorage("aeroops.tab", "dashboard");
  const [darkMode, setDarkMode] = useLocalStorage("aeroops.darkMode", false);
  const [user, setUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [crew, setCrew] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [flights, setFlights] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roster, setRoster] = useState([]);
  const [standby, setStandby] = useState([]);
  const [leave, setLeave] = useState([]);
  const [training, setTraining] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  const [settings, setSettings] = useState({
    id: null,
    companyName: "AeroOps",
    companyNameAr: "إيرو أوبس",
    operatorCode: "EACS",
    tabPreferences: null,
    logo: null,
    stamp: null,
    timeMode: "utc",
  });

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [genDec, setGenDec] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const [reportsOpen, setReportsOpen] = useState(false);
  const reportsRef = useRef(null);

  /* ═══ Effects ═══ */
  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
  }, [lang, t.dir]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    setGlobalRoles(roles);
  }, [roles]);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
      if (reportsRef.current && !reportsRef.current.contains(e.target)) {
        setReportsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("touchstart", handler);
    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  /* ═══ Load Data ═══ */
  const loadData = async () => {
    setLoading(true);
    setSyncStatus("syncing");
    try {
      const [u, c, f, fl, s, r, ro, st, lv, tr, al, lh] = await Promise.all([
        usersAPI.list().catch(() => []),
        crewAPI.list().catch(() => []),
        fleetAPI.list().catch(() => []),
        flightsAPI.list().catch(() => []),
        settingsAPI.get().catch(() => null),
        rolesAPI.list().catch(() => []),
        rosterAPI.list().catch(() => []),
        standbyAPI.list().catch(() => []),
        leaveAPI.list().catch(() => []),
        trainingAPI.list().catch(() => []),
        auditAPI.list().catch(() => []),
        loginHistoryAPI.list().catch(() => []),
      ]);

      setUsers(u);
      setCrew(c);
      setFleet(f);
      setFlights(fl);
      if (s) setSettings(s);
      setRoles(r);
      setGlobalRoles(r);
      setRoster(ro);
      setStandby(st);
      setLeave(lv);
      setTraining(tr);
      setAuditLogs(al);
      setLoginHistory(lh);
      setSyncStatus("synced");
    } catch (e) {
      console.error("Load failed:", e);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const reloadFlights = async () => {
    try {
      const fl = await flightsAPI.list();
      setFlights(fl);
      console.log("🔍 reloadFlights — flights reloaded:", fl.length);
      return fl;
    } catch (e) {
      console.error("Reload flights failed:", e);
      throw e;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("aeroops.user");
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {}
    }
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem("aeroops.user", JSON.stringify(u));
  };

  const handleLogout = () => {
    if (user) {
      logLoginSafe(user, "LOGOUT", true);
      logSafe(user, "LOGOUT", "Auth", user.id, user.fullName, {});
    }
    setUser(null);
    localStorage.removeItem("aeroops.user");
  };

  if (!user) {
    return (
      <Login
        users={users}
        onLogin={handleLogin}
        settings={settings}
        loading={loading}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════
   * TABS FILTERING
   * ═══════════════════════════════════════════════════════════ */
  const prefs = (() => {
    if (
      settings.tabPreferences &&
      typeof settings.tabPreferences === "object" &&
      Object.keys(settings.tabPreferences).length > 0
    ) {
      return settings.tabPreferences;
    }
    try {
      const local = JSON.parse(
        localStorage.getItem("aeroops.tabPreferences") || "{}"
      );
      if (Object.keys(local).length > 0) return local;
    } catch {}
    return ALL_TABS_CONFIG.reduce((acc, t) => {
      acc[t.id] = t.position;
      return acc;
    }, {});
  })();

  const getTabsByPosition = (position) => {
    return ALL_TABS_CONFIG.filter((tab) => checkPerm(user, tab.perm)).filter(
      (tab) => (prefs[tab.id] || tab.position || "more") === position
    );
  };

  const primaryTabs = getTabsByPosition("primary");
  const moreTabs = getTabsByPosition("more");
  const hiddenTabs = getTabsByPosition("hidden");

  const ALL_TABS = [...primaryTabs, ...moreTabs, ...hiddenTabs];

  /* ⭐⭐ هل المستخدم عضو طاقم مرتبط؟ ⭐⭐ */
  const isCrewPortalUser =
    !!user?.crewId &&
    (user?.role === "crewMember" || checkPerm(user, "crew.portal"));

  /* ⭐ إجبار crewMember على dashboard دائماً */
  const effectiveTab = isCrewPortalUser ? "dashboard" : tab;
  const baseTabId = effectiveTab.includes(".")
    ? effectiveTab.split(".")[0]
    : effectiveTab;

  const activeTab =
    ALL_TABS.find((x) => x.id === baseTabId) ||
    primaryTabs[0] ||
    ALL_TABS_CONFIG[0];

  const isMoreActive = moreTabs.some((x) => x.id === baseTabId);
  const isReportsActive =
    effectiveTab === "reports" || effectiveTab.startsWith("reports.");

  const goTab = (id) => {
    setTab(id);
    setMoreOpen(false);
    setReportsOpen(false);
    setDrawerOpen(false);
  };

  const displayName = user.fullName || user.username || "User";
  const userInitial = (displayName[0] || "?").toUpperCase();

  const operatorCode = (settings.operatorCode || "EACS").toUpperCase();

  return (
    <AuthProvider user={user} can={(p) => checkPerm(user, p)} logout={handleLogout}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900" dir={t.dir}>
      <SoundNotifications />

      {/* ═══ HEADER — يختفي لأعضاء الطاقم ═══ */}
      {!(isCrewPortalUser && effectiveTab === "dashboard") && (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm">
          <div className="px-2 md:px-3 py-1.5 flex items-center gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="logo"
                  className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center shadow-md shadow-sky-500/20">
                  <Plane className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className="hidden md:flex items-center"
                title={settings.companyName}
              >
                <span className="font-black text-sm text-sky-600 dark:text-sky-400 font-mono tracking-[0.2em]">
                  {operatorCode}
                </span>
              </div>
            </div>

            <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 flex-shrink-0 mx-1" />

            {/* Tabs — تُخفى لأعضاء الطاقم */}
            {!isCrewPortalUser && (
              <nav className="hidden md:flex flex-1 items-center gap-0.5 overflow-visible">
                {primaryTabs.map(
                  ({ id, icon: Icon, label_en, label_ar, hasSubTabs }) => {
                    const isActive = hasSubTabs ? isReportsActive : tab === id;
                    const label = lang === "ar" ? label_ar : label_en;

                    if (hasSubTabs) {
                      return (
                        <div key={id} className="relative" ref={reportsRef}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setReportsOpen((prev) => !prev);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                              isActive
                                ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
                                : reportsOpen
                                ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="hidden lg:inline">{label}</span>
                            <ChevronDown
                              className={`w-2.5 h-2.5 transition-transform duration-200 ${
                                reportsOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {reportsOpen && (
                            <div className="absolute top-full mt-1 start-0 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                              <div className="h-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />
                              <div className="p-1.5">
                                {REPORTS_SUBTABS.map((subTab) => {
                                  const SubIcon = subTab.icon;
                                  const isSubActive =
                                    tab === `reports.${subTab.id}`;
                                  return (
                                    <button
                                      key={subTab.id}
                                      type="button"
                                      onClick={() => {
                                        goTab(`reports.${subTab.id}`);
                                      }}
                                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-start transition ${
                                        isSubActive
                                          ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
                                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <div
                                        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                          isSubActive
                                            ? "bg-white/20"
                                            : "bg-slate-100 dark:bg-slate-700"
                                        }`}
                                      >
                                        <SubIcon className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="flex-1">
                                        {lang === "ar"
                                          ? subTab.label_ar
                                          : subTab.label_en}
                                      </span>
                                      {isSubActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => goTab(id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                          isActive
                            ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden lg:inline">{label}</span>
                      </button>
                    );
                  }
                )}

                {/* More Dropdown */}
                {moreTabs.length > 0 && (
                  <div className="relative" ref={moreRef}>
                    <button
                      type="button"
                      onClick={() => setMoreOpen((prev) => !prev)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                        isMoreActive
                          ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
                          : moreOpen
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                      <span className="hidden lg:inline">
                        {lang === "ar" ? "المزيد" : "More"}
                      </span>
                      <ChevronDown
                        className={`w-2.5 h-2.5 transition-transform ${
                          moreOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {moreOpen && (
                      <div className="absolute top-full mt-1 start-0 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />
                        <div className="p-1.5 max-h-[70vh] overflow-y-auto">
                          {moreTabs.map(
                            ({ id, icon: Icon, label_en, label_ar }) => {
                              const isActive = tab === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => goTab(id)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-start transition ${
                                    isActive
                                      ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm"
                                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  <div
                                    className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                      isActive
                                        ? "bg-white/20"
                                        : "bg-slate-100 dark:bg-slate-700"
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="flex-1">
                                    {lang === "ar" ? label_ar : label_en}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </nav>
            )}

            {/* Mobile Title */}
            {!isCrewPortalUser && (
              <h1 className="md:hidden text-xs font-bold truncate flex-1">
                {lang === "ar" ? activeTab?.label_ar : activeTab?.label_en}
              </h1>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="hidden xl:block">
                <SyncBadge status={syncStatus} onRetry={loadData} />
              </div>
              <div className="hidden xl:block">
                <LiveClock />
              </div>
              <AlertsPanel crew={crew} users={users} fleet={fleet} />

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center"
              >
                {darkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>

              <div className="hidden md:flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center text-white font-bold text-[10px]">
                    {userInitial}
                  </div>
                  <div className="flex flex-col max-w-[120px]">
                    <div className="text-[11px] font-bold truncate">
                      {displayName}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">
                      {t[user.role] || user.role}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="md:hidden w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className="min-w-0 overflow-x-hidden">
        <div className={isCrewPortalUser ? "pb-0" : "p-2 md:p-3 pb-20 md:pb-3"}>
          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p>{t.loadingData}</p>
            </div>
          ) : (
            <>
              {/* ⭐⭐ Crew Portal — يظهر تلقائياً لأعضاء الطاقم ⭐⭐ */}
              {isCrewPortalUser && !loading && (
                <CrewPortal
                  crew={crew}
                  flights={flights}
                  settings={settings}
                  onLogout={handleLogout}
                />
              )}

              {/* Dashboard للأدوار الإدارية */}
              {!isCrewPortalUser && baseTabId === "dashboard" && (
                <Dashboard
                  flights={flights}
                  crew={crew}
                  fleet={fleet}
                  users={users}
                  roles={roles}
                  leave={leave}
                  roster={roster}
                  standby={standby}
                  training={training}
                  setTab={goTab}
                />
              )}

              {baseTabId === "schedule" && (
                <ScheduleBoard
                  flights={flights}
                  setFlights={setFlights}
                  reloadFlights={reloadFlights}
                  crew={crew}
                  fleet={fleet}
                  settings={settings}
                  onGenDec={setGenDec}
                  setSyncStatus={setSyncStatus}
                />
              )}
              {baseTabId === "ftl" && (
                <FTLModule crew={crew} flights={flights} />
              )}

              {baseTabId === "reports" && (
                <ReportsModule
                  flights={flights}
                  crew={crew}
                  fleet={fleet}
                  settings={settings}
                  user={user}
                  initialSubTab={
                    tab.includes(".") ? tab.split(".")[1] : "crewHours"
                  }
                />
              )}

              {baseTabId === "roster" && (
                <RosterModule
                  crew={crew}
                  roster={roster}
                  setRoster={setRoster}
                  setSyncStatus={setSyncStatus}
                />
              )}
              {baseTabId === "standby" && (
                <StandbyModule
                  crew={crew}
                  standby={standby}
                  setStandby={setStandby}
                  setSyncStatus={setSyncStatus}
                />
              )}
              {baseTabId === "leave" && (
                <LeaveModule
                  crew={crew}
                  leave={leave}
                  setLeave={setLeave}
                  setSyncStatus={setSyncStatus}
                  currentUser={user}
                />
              )}
              {baseTabId === "training" && (
                <TrainingModule
                  crew={crew}
                  training={training}
                  setTraining={setTraining}
                  setSyncStatus={setSyncStatus}
                />
              )}
              {baseTabId === "tracking" && (
                <FlightFollowingModule flights={flights} fleet={fleet} />
              )}
              {baseTabId === "charts" && (
                <ChartsModule
                  flights={flights}
                  crew={crew}
                  fleet={fleet}
                  leave={leave}
                />
              )}
              {baseTabId === "fleet" && (
                <Fleet
                  fleet={fleet}
                  setFleet={setFleet}
                  lang={lang}
                  setSyncStatus={setSyncStatus}
                />
              )}
              {baseTabId === "crew" && (
                <Crew
                  crew={crew}
                  setCrew={setCrew}
                  fleet={fleet}
                  users={users}
                  setUsers={setUsers}
                  companyName={settings.companyName}
                  setSyncStatus={setSyncStatus}
                />
              )}

              {/* ⭐⭐⭐ Manuals Module ⭐⭐⭐ */}
              {baseTabId === "manuals" && (
                <ManualsModule
                  settings={settings}
                  companyName={settings.companyName}
                  lang={lang}
                />
              )}

              {baseTabId === "settings" && (
                <SettingsModule
                  settings={settings}
                  setSettings={setSettings}
                  lang={lang}
                  setLang={setLang}
                  users={users}
                  setUsers={setUsers}
                  roles={roles}
                  setRoles={setRoles}
                  loginHistory={loginHistory}
                  setLoginHistory={setLoginHistory}
                  auditLogs={auditLogs}
                  setAuditLogs={setAuditLogs}
                  crew={crew}
                  setSyncStatus={setSyncStatus}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* DRAWER — Mobile — يختفي لأعضاء الطاقم */}
      {drawerOpen && !isCrewPortalUser && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 start-0 z-50 w-[85%] max-w-sm bg-slate-900 text-slate-200 flex flex-col shadow-2xl">
            <div className="p-4 flex items-center gap-3 border-b border-slate-700">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="logo"
                  className="w-12 h-12 rounded-2xl object-contain bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-black text-xl text-sky-400 font-mono tracking-widest">
                  {operatorCode}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {primaryTabs.map(
                ({ id, icon: Icon, label_en, label_ar, hasSubTabs }) => {
                  if (hasSubTabs) {
                    return (
                      <div key={id}>
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {lang === "ar" ? label_ar : label_en}
                        </div>
                        {REPORTS_SUBTABS.map((subTab) => {
                          const SubIcon = subTab.icon;
                          const isSubActive = tab === `reports.${subTab.id}`;
                          return (
                            <button
                              key={subTab.id}
                              onClick={() => goTab(`reports.${subTab.id}`)}
                              className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl text-sm font-bold text-start transition ${
                                isSubActive
                                  ? "bg-sky-600 text-white"
                                  : "hover:bg-slate-800 text-slate-300"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  isSubActive
                                    ? "bg-white/20"
                                    : "bg-slate-800/60"
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                              </div>
                              <span className="flex-1 truncate">
                                {lang === "ar"
                                  ? subTab.label_ar
                                  : subTab.label_en}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  const isActive = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => goTab(id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-start transition ${
                        isActive
                          ? "bg-sky-600 text-white"
                          : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive ? "bg-white/20" : "bg-slate-800/60"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 truncate">
                        {lang === "ar" ? label_ar : label_en}
                      </span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 opacity-70" />
                      )}
                    </button>
                  );
                }
              )}

              {moreTabs.length > 0 && (
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {lang === "ar" ? "المزيد" : "More"}
                </div>
              )}

              {moreTabs.map(({ id, icon: Icon, label_en, label_ar }) => {
                const isActive = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => goTab(id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-start transition ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive ? "bg-white/20" : "bg-slate-800/60"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 truncate">
                      {lang === "ar" ? label_ar : label_en}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-700 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang("ar")}
                  className={`px-3 py-3 rounded-xl font-bold text-sm ${
                    lang === "ar"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  🇱🇾 العربية
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-3 py-3 rounded-xl font-bold text-sm ${
                    lang === "en"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold"
              >
                <LogOut className="w-5 h-5" />
                {t.logout}
              </button>
            </div>
          </aside>
        </>
      )}

      {genDec && (
        <GenDecModal
          flight={genDec}
          crew={crew}
          settings={settings}
          onClose={() => setGenDec(null)}
        />
      )}
      </div>
    </AuthProvider>
  );
}

/* ═══════════════════════════════════════════════════════════
 * ROOT APP
 * ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [lang] = useLocalStorage("aeroops.lang", "en");
  const [user] = useState(() => {
    try {
      const raw = localStorage.getItem("aeroops.user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  return (
    <LangProvider lang={lang}>
      <AuthProvider user={user}>
        <AppInner />
      </AuthProvider>
    </LangProvider>
  );
}
