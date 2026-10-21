/* ═══════════════════════════════════════════════════════════
 * SETTINGS MODULE — Main hub with tabs
 * v6.1 — Email Module (same style as WhatsApp)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  Save,
  Lock,
  Plane,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Key,
  Shield,
  FileText,
  MessageCircle,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Hash,
  Layout,
  PanelLeft,
  LayoutDashboard,
  Calendar,
  Clock,
  BarChart3,
  CalendarDays,
  Zap,
  Plane as PlaneIcon,
  GraduationCap,
  Navigation,
  Users,
  Sparkles,
  Image as ImageIcon,
  Mail,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Link2,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  settingsAPI,
  uploadFile,
  getApiUrl,
  setApiUrl,
  DEFAULT_API_URL,
  BACKUP_API_URL,
} from "../api";
import { can as checkPerm } from "../config/permissions";
import { SOUND_TYPES, testSound } from "../utils/sounds";
import { useSounds } from "../hooks/useSounds";

/* ⭐ Modules */
import { UsersModule } from "./UsersModule";
import { RolesModule } from "./RolesModule";
import { LoginHistoryModule } from "./LoginHistoryModule";
import { AuditLogModule } from "./AuditLogModule";
import { WhatsAppModule } from "./WhatsAppModule";
import { EmailModule } from "./EmailModule";

/* ⭐ Tabs */
const TABS = [
  {
    id: "general",
    icon: SettingsIcon,
    label_en: "General",
    label_ar: "عام",
    perm: "settings.view",
  },
  {
    id: "appearance",
    icon: Layout,
    label_en: "Appearance",
    label_ar: "المظهر",
    perm: "settings.view",
  },
  {
    id: "sounds",
    icon: Volume2,
    label_en: "Sounds",
    label_ar: "الأصوات",
    perm: "settings.view",
  },
  {
    id: "email",
    icon: Mail,
    label_en: "Email",
    label_ar: "البريد الإلكتروني",
    perm: "email.view",
  },
  {
    id: "users",
    icon: UsersIcon,
    label_en: "Users",
    label_ar: "المستخدمون",
    perm: "users.view",
  },
  {
    id: "roles",
    icon: Key,
    label_en: "Roles",
    label_ar: "الأدوار",
    perm: "users.view",
  },
  {
    id: "login-history",
    icon: Shield,
    label_en: "Login History",
    label_ar: "سجل الدخول",
    perm: "security.login_history",
  },
  {
    id: "audit-log",
    icon: FileText,
    label_en: "Audit Log",
    label_ar: "سجل النشاطات",
    perm: "security.audit_log",
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    label_en: "WhatsApp",
    label_ar: "واتساب",
    perm: "whatsapp.view",
  },
];

/* ⭐ كل التبويبات المتاحة للتخصيص */
const ALL_TABS_CONFIG = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label_en: "Dashboard",
    label_ar: "الرئيسية",
    perm: "schedule.view",
  },
  {
    id: "schedule",
    icon: Calendar,
    label_en: "Schedule",
    label_ar: "الجدول",
    perm: "schedule.view",
  },
  {
    id: "ftl",
    icon: Clock,
    label_en: "FTL",
    label_ar: "ساعات الطيران",
    perm: "ftl.view",
  },
  {
    id: "reports",
    icon: BarChart3,
    label_en: "Reports",
    label_ar: "التقارير",
    perm: "reports.view",
  },
  {
    id: "roster",
    icon: CalendarDays,
    label_en: "Roster",
    label_ar: "الجدول الشهري",
    perm: "roster.view",
  },
  {
    id: "standby",
    icon: Zap,
    label_en: "Standby",
    label_ar: "الاحتياطي",
    perm: "standby.view",
  },
  {
    id: "leave",
    icon: PlaneIcon,
    label_en: "Leave",
    label_ar: "الإجازات",
    perm: "leave.view",
  },
  {
    id: "training",
    icon: GraduationCap,
    label_en: "Training",
    label_ar: "التدريب",
    perm: "training.view",
  },
  {
    id: "tracking",
    icon: Navigation,
    label_en: "Flight Following",
    label_ar: "متابعة الرحلات",
    perm: "tracking.view",
  },
  {
    id: "charts",
    icon: BarChart3,
    label_en: "Charts",
    label_ar: "الرسوم البيانية",
    perm: "charts.view",
  },
  {
    id: "fleet",
    icon: Plane,
    label_en: "Fleet",
    label_ar: "الأسطول",
    perm: "fleet.view",
  },
  {
    id: "crew",
    icon: Users,
    label_en: "Crew",
    label_ar: "الطاقم",
    perm: "crew.view",
  },
  {
    id: "settings",
    icon: SettingsIcon,
    label_en: "Settings",
    label_ar: "الإعدادات",
    perm: "settings.view",
  },
];

/* ⭐ Default tab preferences */
const DEFAULT_TAB_PREFERENCES = {
  dashboard: "primary",
  schedule: "primary",
  ftl: "primary",
  reports: "primary",
  roster: "more",
  standby: "more",
  leave: "more",
  training: "more",
  tracking: "more",
  charts: "more",
  fleet: "more",
  crew: "more",
  settings: "more",
};

/* ⭐ تحويل رابط Drive إلى رابط عرض مباشر */
function logoToDisplayUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const match = url.match(/[?&]id=([^&]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  const pathMatch = url.match(/\/d\/([^/]+)/);
  if (pathMatch) return `https://lh3.googleusercontent.com/d/${pathMatch[1]}`;
  return url;
}

export function SettingsModule({
  settings,
  setSettings,
  lang,
  setLang,
  users = [],
  setUsers,
  roles = [],
  setRoles,
  loginHistory = [],
  setLoginHistory,
  auditLogs = [],
  setAuditLogs,
  crew = [],
  setSyncStatus,
}) {
  const t = useT();
  const { user } = useAuth();
  const langCode = document.documentElement.lang || "en";
  const [activeTab, setActiveTab] = useState("general");

  const visibleTabs = TABS.filter((tab) => checkPerm(user, tab.perm));

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || "general");
    }
  }, [user]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {t.settingsTitle || "Settings"}
            </h2>
            <div className="text-xs text-slate-300">
              {visibleTabs.length} {langCode === "ar" ? "أقسام" : "sections"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex flex-wrap gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
                isActive
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {langCode === "ar" ? tab.label_ar : tab.label_en}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === "general" && (
          <GeneralTab
            settings={settings}
            setSettings={setSettings}
            lang={lang}
            setLang={setLang}
            user={user}
            t={t}
          />
        )}
        {activeTab === "appearance" && (
          <AppearanceTab
            settings={settings}
            setSettings={setSettings}
            lang={lang}
            user={user}
            t={t}
          />
        )}
        {activeTab === "sounds" && <SoundsTab lang={lang} t={t} />}
        {activeTab === "email" && (
          <EmailModule
            crew={crew}
            users={users}
            setSyncStatus={setSyncStatus}
          />
        )}
        {activeTab === "users" && (
          <UsersModule
            users={users}
            setUsers={setUsers}
            roles={roles}
            lang={langCode}
            setSyncStatus={setSyncStatus}
          />
        )}
        {activeTab === "roles" && (
          <RolesModule
            roles={roles}
            setRoles={setRoles}
            setSyncStatus={setSyncStatus}
          />
        )}
        {activeTab === "login-history" && (
          <LoginHistoryModule
            loginHistory={loginHistory}
            setLoginHistory={setLoginHistory}
            currentUser={user}
          />
        )}
        {activeTab === "audit-log" && (
          <AuditLogModule auditLogs={auditLogs} setAuditLogs={setAuditLogs} />
        )}
        {activeTab === "whatsapp" && (
          <WhatsAppModule
            crew={crew}
            users={users}
            setSyncStatus={setSyncStatus}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * GENERAL TAB — Company + Logo + Stamp + Operator Code
 * ═══════════════════════════════════════════════════════════ */
function GeneralTab({ settings, setSettings, lang, setLang, user, t }) {
  const [draft, setDraft] = useState(settings || {});
  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const logoRef = useRef();

  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [stampError, setStampError] = useState(false);
  const stampRef = useRef();

  useEffect(() => {
    setDraft(settings || {});
    setLogoError(false);
    setStampError(false);
  }, [settings]);

  const editable = checkPerm(user, "settings.edit");
  const canEditStamp = checkPerm(user, "settings.edit_stamp");
  const canViewStamp = checkPerm(user, "settings.view_stamp");

  const [currentApiUrl, setCurrentApiUrl] = useState(getApiUrl());
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);

  const handleTestApi = async (testUrl) => {
    setTestingApi(true);
    setApiTestResult(null);
    try {
      const urlToTest = testUrl || currentApiUrl;
      const res = await fetch(`${urlToTest}?sheet=Users`, { method: "GET" });
      const text = await res.text();
      if (text.includes("You do not have permission")) {
        setApiTestResult({
          ok: false,
          error:
            lang === "ar"
              ? "خطأ صلاحيات: الـ Web App يحتاج ضبط (Execute as: Me) و (Who has access: Anyone)"
              : "Permission Error: Web App must be deployed as (Execute as: Me) and (Who has access: Anyone)",
        });
      } else {
        const parsed = JSON.parse(text);
        if (parsed.ok) {
          setApiTestResult({
            ok: true,
            message:
              lang === "ar"
                ? "الاتصال ناجح وقاعدة البيانات تعمل بشكل ممتاز!"
                : "Connection successful and database is responsive!",
          });
        } else {
          setApiTestResult({
            ok: false,
            error: parsed.error || "خطأ في الاستجابة",
          });
        }
      }
    } catch (e) {
      setApiTestResult({ ok: false, error: e.message });
    } finally {
      setTestingApi(false);
    }
  };

  const handleSwitchToBackup = () => {
    setApiUrl(BACKUP_API_URL);
    setCurrentApiUrl(BACKUP_API_URL);
    alert(
      lang === "ar"
        ? "تم التحويل إلى الرابط البديل الشغال. يمكنك الآن إضافة وتعديل الطاقم والطائرات بدون أخطاء."
        : "Switched to working backup URL. You can now add crew and aircraft."
    );
    window.location.reload();
  };

  const handleSwitchToPrimary = () => {
    setApiUrl(DEFAULT_API_URL);
    setCurrentApiUrl(DEFAULT_API_URL);
    alert(
      lang === "ar"
        ? "تم التبديل إلى الرابط الأساسي."
        : "Switched to primary URL."
    );
    window.location.reload();
  };

  const uploadLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      alert("⚠️ الحد الأقصى 2 MB");
      if (logoRef.current) logoRef.current.value = "";
      return;
    }
    if (!f.type.startsWith("image/")) {
      alert("⚠️ الرجاء اختيار صورة");
      if (logoRef.current) logoRef.current.value = "";
      return;
    }
    setUploadingLogo(true);
    try {
      const r = await uploadFile(f, "logos");
      if (!r || !r.fileUrl) throw new Error("لم يُرجع رابط الملف");
      const updated = { ...draft, logo: r.fileUrl };
      setDraft(updated);
      setLogoError(false);
      await settingsAPI.save({ logo: r.fileUrl });
      const fresh = await settingsAPI.get();
      setSettings(fresh || updated);
      alert("✅ " + (t.logoUploaded || "تم رفع الشعار"));
    } catch (err) {
      alert("❌ " + (t.failedUpload || "فشل الرفع") + "\n\n" + err.message);
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const uploadStamp = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      alert("⚠️ الحد الأقصى 2 MB");
      if (stampRef.current) stampRef.current.value = "";
      return;
    }
    if (!f.type.startsWith("image/")) {
      alert("⚠️ الرجاء اختيار صورة");
      if (stampRef.current) stampRef.current.value = "";
      return;
    }
    setUploadingStamp(true);
    try {
      const r = await uploadFile(f, "stamps");
      if (!r || !r.fileUrl) throw new Error("لم يُرجع رابط الملف");
      const updated = { ...draft, stamp: r.fileUrl };
      setDraft(updated);
      setStampError(false);
      await settingsAPI.save({ stamp: r.fileUrl });
      const fresh = await settingsAPI.get();
      setSettings(fresh || updated);
      alert("✅ تم رفع الختم");
    } catch (err) {
      alert("❌ فشل رفع الختم\n\n" + err.message);
    } finally {
      setUploadingStamp(false);
      if (stampRef.current) stampRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsAPI.save(draft);
      const fresh = await settingsAPI.get();
      setSettings(fresh || draft);
      alert("✅ " + (t.settingsSaved || "تم الحفظ"));
    } catch (e) {
      alert("❌ " + (t.failedSave || "فشل الحفظ") + ": " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    if (!confirm("إزالة الشعار؟")) return;
    const updated = { ...draft, logo: "" };
    setDraft(updated);
    setLogoError(false);
    try {
      await settingsAPI.save({ logo: "" });
      const fresh = await settingsAPI.get();
      setSettings(fresh || updated);
    } catch (e) {
      console.error(e);
    }
  };

  const removeStamp = async () => {
    if (!confirm("إزالة الختم؟")) return;
    const updated = { ...draft, stamp: "" };
    setDraft(updated);
    setStampError(false);
    try {
      await settingsAPI.save({ stamp: "" });
      const fresh = await settingsAPI.get();
      setSettings(fresh || updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {!editable && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> {t.readOnly || "عرض فقط"}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* الشعار */}
        <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Camera className="w-4 h-4" /> {t.companyLogo || "شعار الشركة"}
          </h4>
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
              {draft.logo && !logoError ? (
                <img
                  src={logoToDisplayUrl(draft.logo)}
                  alt="logo"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Plane className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                disabled={!editable || uploadingLogo}
                onClick={() => logoRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />{" "}
                {uploadingLogo ? "…" : "رفع الشعار"}
              </button>
              {draft.logo && editable && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs"
                >
                  إزالة
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">PNG/JPG · max 2 MB</p>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            onChange={uploadLogo}
            className="hidden"
          />
        </section>

        {/* الختم */}
        <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <ImageIcon className="w-4 h-4" /> {t.stamp || "الختم / Stamp"}
          </h4>
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
              {!canViewStamp ? (
                <Lock
                  className="w-8 h-8 text-slate-400"
                  title="ليس لديك صلاحية رؤية الختم"
                />
              ) : draft.stamp && !stampError ? (
                <img
                  src={logoToDisplayUrl(draft.stamp)}
                  alt="stamp"
                  className="w-full h-full object-contain p-1"
                  onError={() => setStampError(true)}
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                disabled={!canEditStamp || uploadingStamp}
                onClick={() => stampRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />{" "}
                {uploadingStamp ? "…" : "رفع الختم"}
              </button>
              {draft.stamp && canEditStamp && (
                <button
                  type="button"
                  onClick={removeStamp}
                  className="px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs"
                >
                  إزالة
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">PNG/JPG · max 2 MB</p>
          </div>
          <input
            ref={stampRef}
            type="file"
            accept="image/*"
            onChange={uploadStamp}
            className="hidden"
          />
        </section>
      </div>

      <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <Field label={t.companyName || "Company Name (EN)"}>
          <Input
            disabled={!editable}
            value={draft.companyName || ""}
            onChange={(e) =>
              setDraft({ ...draft, companyName: e.target.value })
            }
          />
        </Field>
        <Field label={t.companyNameAr || "Company Name (AR)"}>
          <Input
            disabled={!editable}
            value={draft.companyNameAr || ""}
            onChange={(e) =>
              setDraft({ ...draft, companyNameAr: e.target.value })
            }
          />
        </Field>
        <Field label={t.operatorCode || "Operator Code"}>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Hash className="w-4 h-4 text-sky-600" />
            </div>
            <Input
              disabled={!editable}
              value={draft.operatorCode || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  operatorCode: e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 8),
                })
              }
              placeholder="EACS"
              maxLength={8}
              className="pl-9 font-mono font-bold tracking-widest text-sky-700 dark:text-sky-300 uppercase"
              style={{ letterSpacing: "2px", fontSize: "15px" }}
            />
          </div>
        </Field>
        <Field label={t.language || "اللغة"}>
          <Select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="ar">{t.arabic || "العربية"}</option>
            <option value="en">{t.english || "English"}</option>
          </Select>
        </Field>
      </section>

      {/* ═══ API URL Configuration & Diagnostic ═══ */}
      <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Globe className="w-4 h-4 text-sky-600" />
            {lang === "ar" ? "رابط Google Apps Script (قاعدة البيانات)" : "Google Apps Script API URL"}
          </h4>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">
              {currentApiUrl}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              currentApiUrl === BACKUP_API_URL
                ? "bg-emerald-100 text-emerald-700"
                : "bg-sky-100 text-sky-700"
            }`}>
              {currentApiUrl === BACKUP_API_URL
                ? (lang === "ar" ? "الرابط البديل (شغال 100%)" : "Backup Active (Working)")
                : (lang === "ar" ? "الرابط الحالي (Primary)" : "Primary URL")}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => handleTestApi(currentApiUrl)}
              disabled={testingApi}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingApi ? "animate-spin" : ""}`} />
              <span>{testingApi ? (lang === "ar" ? "جاري الفحص..." : "Testing...") : (lang === "ar" ? "فحص هذا الرابط" : "Test URL")}</span>
            </button>
            {currentApiUrl !== BACKUP_API_URL && (
              <button
                type="button"
                onClick={handleSwitchToBackup}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                title="التحويل للرابط الشغال فوراً"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "التبديل إلى الرابط الشغال فوراً" : "Switch to Working Backup URL"}</span>
              </button>
            )}
            {currentApiUrl === BACKUP_API_URL && (
              <button
                type="button"
                onClick={handleSwitchToPrimary}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "العودة للرابط الجديد" : "Switch to Primary URL"}</span>
              </button>
            )}
          </div>

          {apiTestResult && (
            <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 mt-2 ${
              apiTestResult.ok
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200"
            }`}>
              {apiTestResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />}
              <div className="flex-1">
                <div>{apiTestResult.message || apiTestResult.error}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <button
        disabled={!editable || saving}
        onClick={save}
        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm flex items-center justify-center gap-2 font-bold"
      >
        <Save className="w-4 h-4" />{" "}
        {saving ? "…" : t.saveChanges || "حفظ التغييرات"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 🔊 SOUNDS TAB — الأصوات
 * ═══════════════════════════════════════════════════════════ */
function SoundsTab({ lang, t }) {
  const {
    soundsEnabled,
    setSoundsEnabled,
    soundsVolume,
    setSoundsVolume,
    alertSoundsEnabled,
    setAlertSoundsEnabled,
  } = useSounds();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl text-white shadow-lg flex items-center gap-3">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Volume2 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold">
            {lang === "ar" ? "الأصوات" : "Sounds"}
          </h3>
          <div className="text-xs text-emerald-100">
            {lang === "ar"
              ? "إعدادات الصوت والتنبيهات"
              : "Sound & alert settings"}
          </div>
        </div>
      </div>

      <section className="space-y-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <Volume2 className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t.soundsTitle || (lang === "ar" ? "الأصوات" : "Sounds")}
          </h3>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                soundsEnabled
                  ? "bg-emerald-100 dark:bg-emerald-950"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              {soundsEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {t.enableSounds ||
                  (lang === "ar" ? "تشغيل الأصوات" : "Enable Sounds")}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className={`relative w-14 h-8 rounded-full transition ${
              soundsEnabled
                ? "bg-emerald-600"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                soundsEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                alertSoundsEnabled
                  ? "bg-amber-100 dark:bg-amber-950"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              {alertSoundsEnabled ? (
                <Bell className="w-5 h-5 text-amber-600" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {t.enableAlertSounds ||
                  (lang === "ar" ? "أصوات التنبيه" : "Alert Sounds")}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAlertSoundsEnabled(!alertSoundsEnabled)}
            className={`relative w-14 h-8 rounded-full transition ${
              alertSoundsEnabled
                ? "bg-amber-600"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                alertSoundsEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {soundsEnabled && (
          <>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {t.volume || (lang === "ar" ? "مستوى الصوت" : "Volume")}
                </div>
                <div className="text-xs font-mono font-bold text-emerald-600">
                  {Math.round(soundsVolume * 100)}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundsVolume}
                onChange={(e) => setSoundsVolume(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 accent-emerald-600"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                {t.testSounds ||
                  (lang === "ar" ? "اختبر الأصوات" : "Test Sounds")}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SOUND_TYPES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => s.play()}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition active:scale-95"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {lang === "ar" ? s.label_ar : s.label_en}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => testSound()}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Volume2 className="w-5 h-5" />{" "}
              {t.testNotification ||
                (lang === "ar" ? "🔊 اختبر الإشعار" : "🔊 Test Notification")}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * APPEARANCE TAB — NavLayout + Tab Preferences
 * ═══════════════════════════════════════════════════════════ */
function AppearanceTab({ settings, setSettings, lang, user, t }) {
  const [draft, setDraft] = useState(settings || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings || {});
  }, [settings]);

  const editable = checkPerm(user, "settings.edit");
  const prefs = { ...DEFAULT_TAB_PREFERENCES, ...(draft.tabPreferences || {}) };
  const getTabPosition = (id) =>
    prefs[id] || DEFAULT_TAB_PREFERENCES[id] || "more";
  const setTabPosition = (id, position) => {
    setDraft({
      ...draft,
      tabPreferences: { ...(draft.tabPreferences || {}), [id]: position },
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsAPI.save({ ...settings, ...draft });
      const fresh = await settingsAPI.get();
      setSettings(fresh || draft);
      localStorage.setItem(
        "aeroops.tabPreferences",
        JSON.stringify(draft.tabPreferences || {})
      );
      localStorage.setItem("aeroops.navLayout", draft.navLayout || "top");
      window.dispatchEvent(new Event("aeroops:prefsChanged"));
      alert("✅ " + (t.settingsSaved || "تم الحفظ"));
    } catch (e) {
      alert("❌ " + (t.failedSave || "فشل الحفظ") + ": " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setDraft({
      ...draft,
      tabPreferences: { ...DEFAULT_TAB_PREFERENCES },
      navLayout: "top",
    });
  };

  return (
    <div className="max-w-3xl space-y-4">
      {!editable && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> {t.readOnly || "عرض فقط"}
        </div>
      )}

      <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Layout className="w-4 h-4" />{" "}
          {lang === "ar" ? "تخطيط التنقل" : "Navigation Layout"}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!editable}
            onClick={() => setDraft({ ...draft, navLayout: "top" })}
            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-3 ${
              (draft.navLayout || "top") === "top"
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <Layout
              className={`w-8 h-8 ${
                (draft.navLayout || "top") === "top"
                  ? "text-sky-600"
                  : "text-slate-400"
              }`}
            />
            <div
              className={`text-sm font-bold ${
                (draft.navLayout || "top") === "top"
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {lang === "ar" ? "أفقي (أعلى)" : "Top Nav"}
            </div>
            <div className="w-full h-10 border border-current rounded-lg overflow-hidden opacity-60">
              <div className="h-2 bg-current opacity-40" />
              <div className="flex gap-1 p-1">
                <div className="h-1.5 w-6 bg-current opacity-60 rounded" />
                <div className="h-1.5 w-6 bg-current opacity-40 rounded" />
                <div className="h-1.5 w-6 bg-current opacity-40 rounded" />
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={!editable}
            onClick={() => setDraft({ ...draft, navLayout: "side" })}
            className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-3 ${
              draft.navLayout === "side"
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <PanelLeft
              className={`w-8 h-8 ${
                draft.navLayout === "side" ? "text-sky-600" : "text-slate-400"
              }`}
            />
            <div
              className={`text-sm font-bold ${
                draft.navLayout === "side"
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {lang === "ar" ? "جانبي" : "Sidebar"}
            </div>
            <div className="w-full h-10 border border-current rounded-lg flex overflow-hidden opacity-60">
              <div className="w-3 bg-current opacity-40" />
              <div className="flex-1 p-1 flex flex-col gap-1">
                <div className="h-1.5 w-full bg-current opacity-40 rounded" />
                <div className="h-1.5 w-full bg-current opacity-40 rounded" />
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Sparkles className="w-4 h-4" />{" "}
          {lang === "ar" ? "تخصيص التبويبات" : "Tab Preferences"}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {lang === "ar"
            ? "اختر أي تبويب يظهر في الشريط الأساسي، أو تحت قائمة More، أو مخفي"
            : "Choose which tab appears in the main bar, under More, or hidden"}
        </p>

        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
          <div className="col-span-6">{lang === "ar" ? "التبويب" : "Tab"}</div>
          <div className="col-span-2 text-center">
            {lang === "ar" ? "أساسي" : "Primary"}
          </div>
          <div className="col-span-2 text-center">
            {lang === "ar" ? "More" : "More"}
          </div>
          <div className="col-span-2 text-center">
            {lang === "ar" ? "مخفي" : "Hidden"}
          </div>
        </div>

        <div className="space-y-1 mt-1">
          {ALL_TABS_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const label = lang === "ar" ? tab.label_ar : tab.label_en;
            const position = getTabPosition(tab.id);
            return (
              <div
                key={tab.id}
                className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
              >
                <div className="col-span-12 md:col-span-6 flex items-center gap-2 mb-2 md:mb-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                  </span>
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-center">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => setTabPosition(tab.id, "primary")}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                      position === "primary"
                        ? "border-sky-500 bg-sky-500"
                        : "border-slate-300 dark:border-slate-600 hover:border-sky-400"
                    }`}
                  >
                    {position === "primary" && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </button>
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-center">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => setTabPosition(tab.id, "more")}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                      position === "more"
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                    }`}
                  >
                    {position === "more" && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </button>
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-center">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => setTabPosition(tab.id, "hidden")}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                      position === "hidden"
                        ? "border-slate-500 bg-slate-500"
                        : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {position === "hidden" && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            disabled={!editable}
            onClick={resetToDefault}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-bold text-slate-700 dark:text-slate-200 transition"
          >
            {lang === "ar" ? "استعادة الافتراضي" : "Reset to Default"}
          </button>
        </div>
      </section>

      <button
        disabled={!editable || saving}
        onClick={save}
        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm flex items-center justify-center gap-2 font-bold"
      >
        <Save className="w-4 h-4" />{" "}
        {saving ? "…" : t.saveChanges || "حفظ التغييرات"}
      </button>
    </div>
  );
}

export default SettingsModule;
