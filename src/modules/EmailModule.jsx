/* ═══════════════════════════════════════════════════════════
 * EMAIL MODULE — Send notifications to crew via email
 * v2.0 — Added Auto Settings (autoFlightEmails / autoExpiryAlerts)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useMemo, useEffect } from "react";
import {
  Mail,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Lock,
  User as UserIcon,
  Settings,
  Save,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Code,
  ShieldCheck,
  Sparkles,
  Activity,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { can as checkPerm } from "../config/permissions";
import {
  sendEmail,
  settingsAPI,
  testEmailConnection,
  createGmailWebUrl,
  createMailtoUrl,
} from "../api";

/* ⭐ Templates */
const TEMPLATES = [
  {
    id: "roster",
    icon: "📅",
    label_en: "Roster Notification",
    label_ar: "إشعار الجدول",
    category: "Operations",
    subject_en: "New Roster Published",
    subject_ar: "تم نشر جدول جديد",
    text: "عزيزي {name},\nتم نشر جدولك الجديد. الرجاء مراجعة Roster في المنظومة.\n\nAeroOps Team",
  },
  {
    id: "flight_change",
    icon: "✈️",
    label_en: "Flight Change",
    label_ar: "تغيير رحلة",
    category: "Operations",
    subject_en: "Flight Change Notification",
    subject_ar: "إشعار تغيير رحلة",
    text: "عزيزي {name},\nتم تغيير تفاصيل رحلتك. الرجاء مراجعة الجدول فوراً.\n\nAeroOps Team",
  },
  {
    id: "standby_alert",
    icon: "⏰",
    label_en: "Standby Alert",
    label_ar: "تنبيه احتياطي",
    category: "Operations",
    subject_en: "Standby Alert",
    subject_ar: "تنبيه احتياطي",
    text: "عزيزي {name},\nأنت في Standby. الرجاء البقاء متاحاً.\n\nAeroOps Team",
  },
  {
    id: "reminder",
    icon: "🔔",
    label_en: "Duty Reminder",
    label_ar: "تذكير واجب",
    category: "Operations",
    subject_en: "Duty Reminder",
    subject_ar: "تذكير واجب",
    text: "عزيزي {name},\nتذكير: لديك رحلة غداً. الرجاء الحضور قبل STD بـ 60 دقيقة.\n\nAeroOps Team",
  },
  {
    id: "medical",
    icon: "🩺",
    label_en: "Medical Expiry",
    label_ar: "انتهاء طبي",
    category: "Compliance",
    subject_en: "Medical Certificate Expiry",
    subject_ar: "انتهاء الشهادة الطبية",
    text: "عزيزي {name},\nشهادتك الطبية على وشك الانتهاء. الرجاء التجديد قبل الموعد.\n\nAeroOps Team",
  },
  {
    id: "training",
    icon: "🎓",
    label_en: "Training Due",
    label_ar: "تدريب مستحق",
    category: "Compliance",
    subject_en: "Training Due",
    subject_ar: "تدريب مستحق",
    text: "عزيزي {name},\nلديك تدريب مستحق. الرجاء مراجعة المنظومة.\n\nAeroOps Team",
  },
  {
    id: "leave_approved",
    icon: "✅",
    label_en: "Leave Approved",
    label_ar: "موافقة إجازة",
    category: "HR",
    subject_en: "Leave Request Approved",
    subject_ar: "تمت الموافقة على طلب الإجازة",
    text: "عزيزي {name},\nتمت الموافقة على طلب إجازتك. نتمنى لك وقتاً سعيداً!\n\nAeroOps Team",
  },
  {
    id: "custom",
    icon: "✍️",
    label_en: "Custom Message",
    label_ar: "رسالة مخصصة",
    category: "Custom",
    subject_en: "",
    subject_ar: "",
    text: "",
  },
];

export const APPS_SCRIPT_EMAIL_SNIPPET = `// -------------------------------------------------------------
// أضف هذا الجزء داخل دالة doPost(e) في ملف Code.gs على Google Sheets:
// -------------------------------------------------------------
if (action === "sendEmail") {
  var to = data.to;
  var subject = data.subject || "AeroOps Flight Operations";
  var body = data.body || "";
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    name: "AeroOps Flight Operations"
  });
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: { sent: true, to: to }
  })).setMimeType(ContentService.MimeType.JSON);
}

if (action === "sendFlightEmail") {
  var flight = data.flight || {};
  var crewSlots = typeof flight.crewSlots === 'string' ? JSON.parse(flight.crewSlots || '[]') : (flight.crewSlots || []);
  var crewSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Crew");
  var crewData = crewSheet ? crewSheet.getDataRange().getValues() : [];
  var headers = crewData[0] || [];
  var idIdx = headers.indexOf("id");
  var emailIdx = headers.indexOf("email");
  var nameIdx = headers.indexOf("fullName");

  var sentCount = 0;
  for (var i = 0; i < crewSlots.length; i++) {
    var cId = crewSlots[i].crewId;
    for (var r = 1; r < crewData.length; r++) {
      if (crewData[r][idIdx] == cId && crewData[r][emailIdx]) {
        var recipientEmail = crewData[r][emailIdx];
        var crewName = crewData[r][nameIdx] || "Crew Member";
        var subject = "Flight Briefing: " + (flight.flightNo || "") + " (" + (flight.dep || "") + " -> " + (flight.arr || "") + ")";
        var body = "Dear " + crewName + ",\\n\\n" +
                   "Flight Notification:\\n" +
                   "Flight No: " + (flight.flightNo || "") + "\\n" +
                   "Route: " + (flight.dep || "") + " -> " + (flight.arr || "") + "\\n" +
                   "STD (UTC): " + (flight.std || "") + "\\n" +
                   "STA (UTC): " + (flight.sta || "") + "\\n" +
                   "Aircraft: " + (flight.acft || "") + "\\n" +
                   "Notes: " + (flight.notes || "-") + "\\n\\n" +
                   "AeroOps Operations";
        MailApp.sendEmail({ to: recipientEmail, subject: subject, body: body, name: "AeroOps Operations" });
        sentCount++;
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: { sent: sentCount, total: crewSlots.length }
  })).setMimeType(ContentService.MimeType.JSON);
}

if (action === "checkExpiry") {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: { sent: 0, checked: true }
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export function EmailModule({ crew = [], users = [], setSyncStatus }) {
  const t = useT();
  const { user } = useAuth();
  const lang = document.documentElement.lang || "en";

  // ⭐ الصلاحيات
  const canView =
    checkPerm(user, "email.view") || checkPerm(user, "settings.view");
  const canSend =
    checkPerm(user, "email.send") || checkPerm(user, "settings.edit");
  const canBulk =
    checkPerm(user, "email.bulk") || checkPerm(user, "settings.edit");

  /* ═══ Compose State ═══ */
  const [selectedCrew, setSelectedCrew] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("roster");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [sendHistory, setSendHistory] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCrewList, setSelectedCrewList] = useState([]);

  /* ═══ ⭐ Connection Test & Diagnostic State ═══ */
  const [connStatus, setConnStatus] = useState(null);
  const [testingConn, setTestingConn] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  /* ═══ ⭐ Auto Settings State ═══ */
  const [autoFlightEmails, setAutoFlightEmails] = useState(true);
  const [autoExpiryAlerts, setAutoExpiryAlerts] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  /* ⭐ تحميل الإعدادات التلقائية عند الفتح */
  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const s = await settingsAPI.get();
        if (!mounted) return;
        if (s) {
          setAutoFlightEmails(s.autoFlightEmails !== false);
          setAutoExpiryAlerts(s.autoExpiryAlerts !== false);
        }
      } catch (e) {
        console.warn("Failed to load auto settings:", e.message);
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  /* ⭐ حفظ الإعدادات التلقائية */
  const saveAutoSettings = async () => {
    setSavingAuto(true);
    try {
      await settingsAPI.save({ autoFlightEmails, autoExpiryAlerts });
      alert("✅ " + (t.settingsSaved || "تم حفظ الإعدادات"));
    } catch (e) {
      alert("❌ " + (t.failedSave || "فشل الحفظ") + ": " + e.message);
    } finally {
      setSavingAuto(false);
    }
  };

  /* ═══ Templates Filter ═══ */
  const filteredTemplates = useMemo(() => {
    if (categoryFilter === "all") return TEMPLATES;
    return TEMPLATES.filter((tmp) => tmp.category === categoryFilter);
  }, [categoryFilter]);

  /* ═══ Crew Filter ═══ */
  const filteredCrew = useMemo(() => {
    return crew.filter((c) => {
      if (!c.email) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.fullName.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [crew, search]);

  const applyTemplate = (templateId) => {
    setSelectedTemplate(templateId);
    const tmp = TEMPLATES.find((x) => x.id === templateId);
    if (tmp) {
      setMessage(tmp.text);
      setSubject(lang === "ar" ? tmp.subject_ar : tmp.subject_en);
    }
  };

  const sendMessage = async () => {
    if (!canSend) {
      setResult({ ok: false, message: "ليس لديك صلاحية إرسال الإيميلات" });
      return;
    }
    if (bulkMode && !canBulk) {
      setResult({ ok: false, message: "ليس لديك صلاحية الإرسال الجماعي" });
      return;
    }
    if (!subject.trim()) {
      setResult({ ok: false, message: "الرجاء إدخال موضوع الرسالة" });
      return;
    }
    if (!message.trim()) {
      setResult({ ok: false, message: "الرسالة فارغة" });
      return;
    }
    if (!bulkMode && !selectedCrew) {
      setResult({ ok: false, message: "اختر عضواً" });
      return;
    }
    if (bulkMode && selectedCrewList.length === 0) {
      setResult({ ok: false, message: "اختر مستلمين" });
      return;
    }

    setSending(true);
    setResult(null);

    const recipients = bulkMode ? selectedCrewList : [selectedCrew];
    const results = [];

    for (const crewId of recipients) {
      const member = crew.find((c) => c.id === crewId);
      if (!member?.email) {
        results.push({ crewId, ok: false, error: "No email" });
        continue;
      }
      const finalMessage = message.replace(/{name}/g, member.fullName);

      try {
        const res = await sendEmail({
          to: member.email,
          subject: subject,
          body: finalMessage,
        });
        if (!res || res.ok === false)
          throw new Error(res?.error || "Send failed");
        results.push({ crewId, ok: true, name: member.fullName });
      } catch (e) {
        results.push({
          crewId,
          ok: false,
          error: e.message,
          name: member.fullName,
        });
      }
    }

    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.length - successCount;

    setResult({
      ok: failCount === 0,
      message: `✅ ${t.sent || "Sent"}: ${successCount} · ❌ ${
        t.failed || "Failed"
      }: ${failCount}`,
      details: results,
    });

    setSendHistory((prev) => [
      {
        id: `email_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipients: results.map((r) => r.name || r.crewId),
        subject: subject.substring(0, 100),
        message: message.substring(0, 100),
        success: successCount,
        failed: failCount,
      },
      ...prev.slice(0, 49),
    ]);

    setSending(false);
  };

  const runTestConnection = async () => {
    setTestingConn(true);
    try {
      const res = await testEmailConnection();
      setConnStatus(res);
    } catch (e) {
      setConnStatus({ ok: false, error: e.message, isUnknownAction: false });
    } finally {
      setTestingConn(false);
    }
  };

  const copyScriptCode = () => {
    try {
      navigator.clipboard?.writeText(APPS_SCRIPT_EMAIL_SNIPPET);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch (err) {
      alert("يرجى تحديد النص ونسخه يدوياً");
    }
  };

  const getRecipientEmails = () => {
    if (bulkMode) {
      return selectedCrewList
        .map((id) => crew.find((c) => c.id === id)?.email)
        .filter(Boolean);
    }
    const member = crew.find((c) => c.id === selectedCrew);
    return member?.email ? [member.email] : [];
  };

  const openInGmailWeb = () => {
    const emails = getRecipientEmails();
    if (emails.length === 0) {
      alert("الرجاء اختيار مستلم لديه بريد إلكتروني مسجل أولاً");
      return;
    }
    const targetName = !bulkMode
      ? crew.find((c) => c.id === selectedCrew)?.fullName || ""
      : "";
    const finalBody = message.replace(/{name}/g, targetName);
    const url = createGmailWebUrl(emails, subject, finalBody);
    window.open(url, "_blank");
  };

  const openInMailClient = () => {
    const emails = getRecipientEmails();
    if (emails.length === 0) {
      alert("الرجاء اختيار مستلم لديه بريد إلكتروني مسجل أولاً");
      return;
    }
    const targetName = !bulkMode
      ? crew.find((c) => c.id === selectedCrew)?.fullName || ""
      : "";
    const finalBody = message.replace(/{name}/g, targetName);
    const url = createMailtoUrl(emails, subject, finalBody);
    window.location.href = url;
  };

  /* ⭐ منع العرض إذا لم تكن هناك صلاحية view */
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Lock className="w-12 h-12 mb-2" />
        <p>ليس لديك صلاحية الوصول إلى البريد الإلكتروني</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t.emailTitle || "Email Notifications"}
              </h2>
              <div className="text-xs text-blue-100">
                {t.emailNotifications || "Send notifications to crew via email"}
              </div>
            </div>
          </div>
          {canBulk && (
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedCrewList([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                bulkMode
                  ? "bg-white text-blue-700"
                  : "bg-white/20 hover:bg-white/30"
              }`}
            >
              <Users className="w-4 h-4" />
              {bulkMode ? t.bulkModeOn || "Bulk ON" : t.bulkMode || "Bulk"}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Email Connection Diagnostics & Status ═══ */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                connStatus?.ok
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600"
                  : connStatus?.isUnknownAction
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-600"
                  : "bg-blue-100 dark:bg-blue-950 text-blue-600"
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {lang === "ar" ? "حالة منظومة البريد الإلكتروني" : "Email System Status"}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    connStatus?.ok
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : connStatus?.isUnknownAction
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "bg-sky-100 text-sky-700 border border-sky-300"
                  }`}
                >
                  {connStatus?.ok
                    ? lang === "ar" ? "✅ متصل وجاهز للإرسال التلقائي" : "✅ Connected & Active"
                    : connStatus?.isUnknownAction
                    ? lang === "ar" ? "⚡ الإرسال المباشر جاهز (Gmail Web) + يحتاج كود التلقائي" : "⚡ Direct Webmail Ready / Script Pending"
                    : lang === "ar" ? "ℹ️ جاهز للفحص" : "ℹ️ Ready to Test"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {connStatus?.ok
                  ? lang === "ar"
                    ? "تم فحص الاتصال بخادم Google Apps Script بنجاح. الإرسال التلقائي عبر MailApp مفعل وشغال 100%."
                    : "Google Apps Script backend is verified and ready for automatic sending."
                  : connStatus?.isUnknownAction
                  ? lang === "ar"
                    ? "الإرسال المباشر عبر Gmail Web وتطبيق البريد متاح 100% بنقرة واحدة. لتفعيل الإرسال التلقائي الصامت بالخلفية، انسخ الكود أدناه إلى مشروع Apps Script."
                    : "Direct sending via Gmail Web is 100% functional. To enable background automated dispatch, add the snippet below to your Apps Script."
                  : lang === "ar"
                  ? "المنظومة تدعم الإرسال التلقائي عبر Google Apps Script وكذلك الإرسال المباشر عبر Gmail Web وتطبيق البريد."
                  : "Supports both headless Google Apps Script dispatch and direct Gmail Web compose."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={runTestConnection}
              disabled={testingConn}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? "animate-spin" : ""}`} />
              <span>
                {testingConn
                  ? lang === "ar" ? "جاري الفحص..." : "Testing..."
                  : lang === "ar" ? "فحص حالة الاتصال الآن" : "Test Connection"}
              </span>
            </button>
            <button
              onClick={() => setShowCodeGuide(!showCodeGuide)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {showCodeGuide
                  ? lang === "ar" ? "إخفاء كود التفعيل" : "Hide Script"
                  : lang === "ar" ? "كود تفعيل Apps Script" : "Apps Script Code"}
              </span>
            </button>
          </div>
        </div>

        {/* Apps Script Guide Accordion */}
        {showCodeGuide && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>
                  {lang === "ar"
                    ? "كود تفعيل الإرسال التلقائي في Google Apps Script (Code.gs)"
                    : "Google Apps Script Code to Enable Automatic Email (Code.gs)"}
                </span>
              </div>
              <button
                onClick={copyScriptCode}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{codeCopied ? (lang === "ar" ? "تم النسخ!" : "Copied!") : (lang === "ar" ? "نسخ الكود" : "Copy Code")}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === "ar"
                ? "خطوات التفعيل: افتح جدول Google Sheets > ثم Extensions > Apps Script > الصق هذا الكود داخل دالة doPost(e) > ثم Deploy > Manage Deployments > Edit > Version New > Deploy."
                : "Setup: Open your Google Sheet > Extensions > Apps Script > Paste inside doPost(e) > Deploy > New version."}
            </p>
            <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-slate-700" dir="ltr">
              {APPS_SCRIPT_EMAIL_SNIPPET}
            </pre>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
       * ⭐ قسم الإعدادات التلقائية
       * ═══════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Settings className="w-4 h-4 text-blue-600" />
          {t.autoSettings || "الإعدادات التلقائية"}
        </h3>

        {loadingSettings ? (
          <div className="text-center text-xs text-slate-400 py-4">
            {t.loading || "جاري التحميل…"}
          </div>
        ) : (
          <>
            {/* ⭐ إيميل الرحلة التلقائي */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    autoFlightEmails
                      ? "bg-blue-100 dark:bg-blue-950"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <Send
                    className={`w-5 h-5 ${
                      autoFlightEmails ? "text-blue-600" : "text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {t.autoFlightEmails || "إيميل الرحلة التلقائي"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {t.autoFlightEmailsHint ||
                      "يُرسل تلقائياً للطاقم عند إنشاء/تعديل رحلة"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoFlightEmails(!autoFlightEmails)}
                className={`relative w-14 h-8 rounded-full transition ${
                  autoFlightEmails
                    ? "bg-blue-600"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
                aria-label="toggle auto flight emails"
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    autoFlightEmails ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* ⭐ تنبيهات الوثائق التلقائية */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    autoExpiryAlerts
                      ? "bg-amber-100 dark:bg-amber-950"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <AlertCircle
                    className={`w-5 h-5 ${
                      autoExpiryAlerts ? "text-amber-600" : "text-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {t.autoExpiryAlerts || "تنبيهات الوثائق التلقائية"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {t.autoExpiryAlertsHint ||
                      "يومياً عند قرب انتهاء وثائق الطاقم"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoExpiryAlerts(!autoExpiryAlerts)}
                className={`relative w-14 h-8 rounded-full transition ${
                  autoExpiryAlerts
                    ? "bg-amber-600"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
                aria-label="toggle auto expiry alerts"
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    autoExpiryAlerts ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* ⭐ زر الحفظ */}
            <button
              type="button"
              onClick={saveAutoSettings}
              disabled={savingAuto}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingAuto
                ? "…"
                : t.saveAutoSettings || "حفظ الإعدادات التلقائية"}
            </button>
          </>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        {/* ═══ LEFT: Compose ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Send className="w-4 h-4 text-blue-600" />{" "}
            {t.composeEmail || "Compose Email"}
          </h3>

          {/* Recipient */}
          {!bulkMode ? (
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {t.recipient || "Recipient"}
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.search || "Search..."}
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
              />
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                size="5"
                className="w-full mt-1 px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
              >
                {filteredCrew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.email}
                  </option>
                ))}
              </select>
              {selectedCrew && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t.selected || "Selected"}:{" "}
                  {crew.find((c) => c.id === selectedCrew)?.fullName}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {t.recipients || "Recipients"} — {selectedCrewList.length}{" "}
                {t.selected || "selected"}
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.search || "Search..."}
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
              />
              <div className="mt-1 border border-slate-300 dark:border-slate-600 rounded-lg max-h-[150px] overflow-auto p-2 bg-white dark:bg-slate-900">
                <label className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      filteredCrew.length > 0 &&
                      selectedCrewList.length === filteredCrew.length
                    }
                    onChange={(e) =>
                      setSelectedCrewList(
                        e.target.checked ? filteredCrew.map((c) => c.id) : []
                      )
                    }
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <b className="text-slate-700 dark:text-slate-300">
                    {t.selectAll || "Select All"} ({filteredCrew.length})
                  </b>
                </label>
                {filteredCrew.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCrewList.includes(c.id)}
                      onChange={(e) =>
                        setSelectedCrewList(
                          e.target.checked
                            ? [...selectedCrewList, c.id]
                            : selectedCrewList.filter((x) => x !== c.id)
                        )
                      }
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      {c.fullName} — {c.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {t.subject || "Subject"}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPlaceholder || "Email subject..."}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Templates */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {t.template || "Template"}
            </label>
            <div className="flex gap-1 mt-1 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  categoryFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {t.all || "All"}
              </button>
              {["Operations", "Compliance", "HR", "Custom"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {filteredTemplates.map((tmp) => (
                <button
                  key={tmp.id}
                  onClick={() => applyTemplate(tmp.id)}
                  className={`p-2 rounded border text-[10px] font-bold text-start ${
                    selectedTemplate === tmp.id
                      ? "bg-blue-100 dark:bg-blue-950 border-blue-400 text-blue-800 dark:text-blue-200"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="text-lg leading-none">{tmp.icon}</div>
                  <div className="truncate mt-1">
                    {lang === "ar" ? tmp.label_ar : tmp.label_en}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {t.message || "Message"} — use {"{name}"} for crew name
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="5"
              placeholder={t.messagePlaceholder || "Write your message here..."}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-end">
              {message.length} {t.characters || "chars"}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim() || !canSend}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold disabled:opacity-50 transition cursor-pointer shadow-sm"
                title={canSend ? "" : "ليس لديك صلاحية الإرسال"}
              >
                {sending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />{" "}
                    {t.sending || "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> {lang === "ar" ? "إرسال تلقائي (Apps Script)" : "Send (Apps Script)"}{" "}
                    {bulkMode ? `(${selectedCrewList.length})` : ""}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setMessage("");
                  setSubject("");
                  setResult(null);
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold transition cursor-pointer"
              >
                {t.clear || "Clear"}
              </button>
            </div>

            {/* Direct Webmail & Client Options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={openInGmailWeb}
                disabled={!message.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                title="فتح الرسالة جاهزة في بريد Gmail في متصفحك مباشرة بنقرة واحدة"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "فتح في Gmail Web" : "Open in Gmail Web"}</span>
              </button>
              <button
                type="button"
                onClick={openInMailClient}
                disabled={!message.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                title="فتح في برنامج البريد الافتراضي لديك (Outlook / Apple Mail)"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "تطبيق البريد (Mail)" : "Mail Client"}</span>
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded-lg border-2 text-xs ${
                result.ok
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {result.ok ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {result.message}
              </div>
              {result.details && (
                <div className="mt-2 max-h-32 overflow-auto space-y-1">
                  {result.details.map((d, i) => (
                    <div key={i} className="text-[10px] py-0.5">
                      {d.ok ? "✅" : "❌"} {d.name}{" "}
                      {d.error ? `— ${d.error}` : ""}
                    </div>
                  ))}
                </div>
              )}
              {result.details?.some(
                (d) =>
                  d.error?.includes("Apps Script") ||
                  d.error?.includes("Unknown action")
              ) && (
                <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                    {lang === "ar"
                      ? "تعذر الإرسال التلقائي عبر Apps Script. يمكنك إرسال الرسالة فوراً عبر Gmail Web:"
                      : "Apps Script error. You can send directly via Gmail Web:"}
                  </span>
                  <button
                    onClick={openInGmailWeb}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{lang === "ar" ? "فتح في Gmail Web الآن" : "Open in Gmail Web"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Info ═══ */}
        <div className="space-y-3">
          {/* History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
              <History className="w-4 h-4 text-slate-500" />{" "}
              {t.recentSends || "Recent Sends"} ({sendHistory.length})
            </h3>
            {sendHistory.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">
                {t.noMessagesSent || "No messages sent yet"}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {sendHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                      <span className="font-bold">
                        {h.success > 0 && (
                          <span className="text-emerald-600">
                            ✅ {h.success}
                          </span>
                        )}
                        {h.failed > 0 && (
                          <span className="text-rose-600 ms-2">
                            ❌ {h.failed}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 truncate font-semibold">
                      {h.subject}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 truncate">
                      {h.message}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      → {h.recipients.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-100">
              <UserIcon className="w-4 h-4 text-blue-600" />{" "}
              {t.emailInfo || "Email Info"}
            </h3>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>يتم الإرسال عبر حساب Google المرتبط بالمنظومة.</li>
              <li>الحد الأقصى: 100 إيميل يومياً (حساب شخصي).</li>
              <li>تأكد من تفويض Apps Script لإرسال الإيميلات.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailModule;
