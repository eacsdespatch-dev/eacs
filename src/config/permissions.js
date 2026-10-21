/* ═══════════════════════════════════════════════════════════
 * PERMISSIONS SYSTEM
 * v3.1 — Added alerts.* (view, dismiss, manage)
 * ═══════════════════════════════════════════════════════════ */

export const ALL_PERMISSIONS = {
  schedule: {
    label_en: "Schedule",
    label_ar: "الجدول",
    icon: "📋",
    perms: [
      { key: "schedule.view", en: "View", ar: "عرض" },
      { key: "schedule.create", en: "Create", ar: "إنشاء" },
      { key: "schedule.edit", en: "Edit", ar: "تعديل" },
      { key: "schedule.delete", en: "Delete", ar: "حذف" },
      { key: "schedule.assign_crew", en: "Assign crew", ar: "تعيين طاقم" },
    ],
  },
  ftl: {
    label_en: "FTL",
    label_ar: "FTL",
    icon: "⏱️",
    perms: [
      { key: "ftl.view", en: "View", ar: "عرض" },
      { key: "ftl.edit", en: "Edit", ar: "تعديل" },
    ],
  },
  fleet: {
    label_en: "Fleet",
    label_ar: "الأسطول",
    icon: "✈️",
    perms: [
      { key: "fleet.view", en: "View", ar: "عرض" },
      { key: "fleet.create", en: "Add", ar: "إضافة" },
      { key: "fleet.edit", en: "Edit", ar: "تعديل" },
      { key: "fleet.delete", en: "Delete", ar: "حذف" },
      { key: "fleet.docs", en: "View Documents", ar: "عرض المستندات" },
      { key: "fleet.docs_edit", en: "Edit Documents", ar: "تعديل المستندات" },
      {
        key: "fleet.docs_download",
        en: "Download Documents",
        ar: "تحميل المستندات",
      },
    ],
  },
  crew: {
    label_en: "Crew",
    label_ar: "الأطقم",
    icon: "👥",
    perms: [
      { key: "crew.view", en: "View", ar: "عرض" },
      { key: "crew.create", en: "Add", ar: "إضافة" },
      { key: "crew.edit", en: "Edit", ar: "تعديل" },
      { key: "crew.delete", en: "Delete", ar: "حذف" },
      { key: "crew.docs", en: "View Documents", ar: "عرض المستندات" },
      { key: "crew.docs_edit", en: "Edit Documents", ar: "تعديل المستندات" },
      {
        key: "crew.docs_download",
        en: "Download Documents",
        ar: "تحميل المستندات",
      },
      { key: "crew.card", en: "ID Card", ar: "بطاقة" },
      {
        key: "crew.portal",
        en: "Access Crew Portal",
        ar: "الوصول لواجهة الطاقم",
      },
    ],
  },
  manuals: {
    label_en: "Manuals",
    label_ar: "الأدلة والمراجع",
    icon: "📖",
    perms: [
      { key: "manuals.view", en: "View Manuals", ar: "عرض الأدلة" },
      { key: "manuals.upload", en: "Upload PDF", ar: "رفع PDF" },
      { key: "manuals.manage", en: "Manage Manuals", ar: "إدارة الأدلة" },
      { key: "manuals.audit", en: "View Audit Log", ar: "عرض سجل التحديثات" },
    ],
  },
  roster: {
    label_en: "Roster",
    label_ar: "الجدول",
    icon: "📅",
    perms: [
      { key: "roster.view", en: "View", ar: "عرض" },
      { key: "roster.create", en: "Create", ar: "إنشاء" },
      { key: "roster.edit", en: "Edit", ar: "تعديل" },
      { key: "roster.delete", en: "Delete", ar: "حذف" },
      { key: "roster.publish", en: "Publish", ar: "نشر" },
    ],
  },
  standby: {
    label_en: "Standby",
    label_ar: "الاحتياطي",
    icon: "⏰",
    perms: [
      { key: "standby.view", en: "View", ar: "عرض" },
      { key: "standby.create", en: "Create", ar: "إنشاء" },
      { key: "standby.edit", en: "Edit", ar: "تعديل" },
      { key: "standby.delete", en: "Delete", ar: "حذف" },
    ],
  },
  leave: {
    label_en: "Leave",
    label_ar: "الإجازات",
    icon: "🌴",
    perms: [
      { key: "leave.view", en: "View", ar: "عرض" },
      { key: "leave.create", en: "Create", ar: "إنشاء" },
      { key: "leave.approve", en: "Approve", ar: "موافقة" },
      { key: "leave.delete", en: "Delete", ar: "حذف" },
    ],
  },
  training: {
    label_en: "Training",
    label_ar: "التدريب",
    icon: "🎓",
    perms: [
      { key: "training.view", en: "View", ar: "عرض" },
      { key: "training.create", en: "Create", ar: "إنشاء" },
      { key: "training.edit", en: "Edit", ar: "تعديل" },
      { key: "training.delete", en: "Delete", ar: "حذف" },
    ],
  },
  reports: {
    label_en: "Reports",
    label_ar: "التقارير",
    icon: "📊",
    perms: [
      { key: "reports.view", en: "View", ar: "عرض" },
      { key: "reports.view_all", en: "View All Crew", ar: "عرض كل الطاقم" },
      { key: "reports.export", en: "Export", ar: "تصدير" },
      {
        key: "reports.export_stamp",
        en: "Export with Stamp",
        ar: "تصدير بالختم",
      },
    ],
  },
  tracking: {
    label_en: "Flight Following",
    label_ar: "تتبع الرحلات",
    icon: "🛰️",
    perms: [{ key: "tracking.view", en: "View", ar: "عرض" }],
  },
  charts: {
    label_en: "Charts",
    label_ar: "الرسوم البيانية",
    icon: "📈",
    perms: [{ key: "charts.view", en: "View", ar: "عرض" }],
  },
  whatsapp: {
    label_en: "WhatsApp",
    label_ar: "واتساب",
    icon: "💬",
    perms: [
      { key: "whatsapp.view", en: "View", ar: "عرض" },
      { key: "whatsapp.send", en: "Send", ar: "إرسال" },
      { key: "whatsapp.bulk", en: "Bulk Send", ar: "إرسال جماعي" },
    ],
  },
  email: {
    label_en: "Email",
    label_ar: "البريد الإلكتروني",
    icon: "📧",
    perms: [
      { key: "email.view", en: "View", ar: "عرض" },
      { key: "email.send", en: "Send", ar: "إرسال" },
      { key: "email.bulk", en: "Bulk Send", ar: "إرسال جماعي" },
    ],
  },
  users: {
    label_en: "Users",
    label_ar: "المستخدمون",
    icon: "👤",
    perms: [
      { key: "users.view", en: "View", ar: "عرض" },
      { key: "users.create", en: "Add", ar: "إضافة" },
      { key: "users.edit", en: "Edit", ar: "تعديل" },
      { key: "users.delete", en: "Delete", ar: "حذف" },
      { key: "users.password", en: "Password", ar: "كلمة السر" },
      { key: "users.perms", en: "Permissions", ar: "صلاحيات" },
    ],
  },
  security: {
    label_en: "Security",
    label_ar: "الأمان",
    icon: "🔐",
    perms: [
      { key: "security.login_history", en: "Login History", ar: "سجل الدخول" },
      { key: "security.audit_log", en: "Audit Log", ar: "سجل النشاطات" },
    ],
  },
  settings: {
    label_en: "Settings",
    label_ar: "الإعدادات",
    icon: "⚙️",
    perms: [
      { key: "settings.view", en: "View", ar: "عرض" },
      { key: "settings.edit", en: "Edit", ar: "تعديل" },
      { key: "settings.view_stamp", en: "View Stamp", ar: "رؤية الختم" },
      { key: "settings.edit_stamp", en: "Edit Stamp", ar: "تعديل الختم" },
    ],
  },
  /* ⭐ ALERTS — صلاحيات التنبيهات */
  alerts: {
    label_en: "Alerts",
    label_ar: "التنبيهات",
    icon: "🔔",
    perms: [
      { key: "alerts.view", en: "View Alerts", ar: "عرض التنبيهات" },
      { key: "alerts.dismiss", en: "Dismiss Alerts", ar: "تجاهل التنبيهات" },
      {
        key: "alerts.manage",
        en: "Manage Alert Settings",
        ar: "إدارة إعدادات التنبيهات",
      },
    ],
  },
};

export const ALL_PERMS_FLAT = Object.values(ALL_PERMISSIONS).flatMap((g) =>
  g.perms.map((p) => p.key)
);

export const TOTAL_PERMS_COUNT = ALL_PERMS_FLAT.length;

export const ROLE_TEMPLATES = {
  superAdmin: {
    label_en: "Super Admin",
    label_ar: "مدير عام",
    description_en: "Full system access",
    description_ar: "وصول كامل للنظام",
    color: "rose",
    icon: "👑",
    perms: ["*"],
  },
  dispatcher: {
    label_en: "Dispatcher",
    label_ar: "منظم رحلات",
    description_en: "Flight dispatcher with full ops access",
    description_ar: "منظم رحلات مع صلاحيات تشغيلية كاملة",
    color: "sky",
    icon: "📋",
    perms: [
      "schedule.view",
      "schedule.create",
      "schedule.edit",
      "schedule.delete",
      "schedule.assign_crew",
      "ftl.view",
      "ftl.edit",
      "reports.view",
      "reports.view_all",
      "reports.export",
      "reports.export_stamp",
      "fleet.view",
      "fleet.docs",
      "fleet.docs_download",
      "crew.view",
      "crew.edit",
      "crew.docs",
      "crew.docs_edit",
      "crew.docs_download",
      "crew.card",
      "manuals.view",
      "manuals.upload",
      "manuals.manage",
      "manuals.audit",
      "roster.view",
      "roster.create",
      "roster.edit",
      "roster.delete",
      "roster.publish",
      "standby.view",
      "standby.create",
      "standby.edit",
      "standby.delete",
      "leave.view",
      "leave.create",
      "leave.approve",
      "leave.delete",
      "training.view",
      "training.create",
      "training.edit",
      "training.delete",
      "tracking.view",
      "charts.view",
      "whatsapp.view",
      "whatsapp.send",
      "whatsapp.bulk",
      "email.view",
      "email.send",
      "email.bulk",
      "users.view",
      "security.login_history",
      "security.audit_log",
      "settings.view",
      "settings.view_stamp",
      "settings.edit",
      "settings.edit_stamp",
      "alerts.view",
      "alerts.dismiss",
      "alerts.manage",
    ],
  },
  captain: {
    label_en: "Captain",
    label_ar: "كابتن",
    description_en: "Captain with read access to ops",
    description_ar: "كابتن بصلاحيات عرض",
    color: "amber",
    icon: "✈️",
    perms: [
      "schedule.view",
      "ftl.view",
      "reports.view",
      "reports.export",
      "fleet.view",
      "fleet.docs",
      "fleet.docs_download",
      "crew.view",
      "crew.card",
      "crew.docs",
      "crew.docs_download",
      "crew.portal",
      "manuals.view",
      "roster.view",
      "standby.view",
      "leave.view",
      "training.view",
      "tracking.view",
      "charts.view",
      "email.view",
      "email.send",
      "settings.view",
      "settings.view_stamp",
      "alerts.view",
    ],
  },
  camo: {
    label_en: "CAMO",
    label_ar: "CAMO",
    description_en: "Continuing airworthiness management",
    description_ar: "إدارة صلاحية الطيران",
    color: "purple",
    icon: "🔧",
    perms: [
      "fleet.view",
      "fleet.create",
      "fleet.edit",
      "fleet.delete",
      "fleet.docs",
      "fleet.docs_edit",
      "fleet.docs_download",
      "crew.view",
      "crew.docs",
      "crew.docs_download",
      "manuals.view",
      "manuals.upload",
      "reports.view",
      "reports.view_all",
      "reports.export",
      "reports.export_stamp",
      "charts.view",
      "email.view",
      "email.send",
      "email.bulk",
      "settings.view",
      "settings.view_stamp",
      "settings.edit",
      "settings.edit_stamp",
      "alerts.view",
      "alerts.dismiss",
    ],
  },
  crewMember: {
    label_en: "Crew Member",
    label_ar: "عضو طاقم",
    description_en: "Crew member with minimal access",
    description_ar: "عضو طاقم بصلاحيات محدودة",
    color: "emerald",
    icon: "👤",
    perms: [
      "schedule.view",
      "ftl.view",
      "reports.view",
      "reports.export",
      "crew.view",
      "crew.card",
      "crew.docs",
      "crew.docs_download",
      "crew.portal",
      "manuals.view",
      "roster.view",
      "standby.view",
      "leave.view",
      "training.view",
      "settings.view",
      "alerts.view",
    ],
  },
};

let _globalRoles = [];
export const setGlobalRoles = (r) => {
  _globalRoles = r || [];
};
export const getGlobalRoles = () => _globalRoles;

const _parsePerms = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const can = (user, perm) => {
  if (!user) return false;
  if (user.role === "superAdmin") return true;
  const userPerms = _parsePerms(user.perms);
  if (userPerms.length > 0) {
    if (userPerms.includes("*")) return true;
    return userPerms.includes(perm);
  }
  const role = _globalRoles.find((r) => r.name === user.role);
  let rolePerms = role?.perms;
  if (!rolePerms) rolePerms = ROLE_TEMPLATES[user.role]?.perms || [];
  rolePerms = _parsePerms(rolePerms);
  if (rolePerms.includes("*")) return true;
  return rolePerms.includes(perm);
};

export const getUserPermissions = (user) => {
  if (!user) return [];
  if (user.role === "superAdmin") return ["*"];
  const userPerms = _parsePerms(user.perms);
  if (userPerms.length > 0) return userPerms;
  const role = _globalRoles.find((r) => r.name === user.role);
  let rolePerms = role?.perms || ROLE_TEMPLATES[user.role]?.perms || [];
  return _parsePerms(rolePerms);
};

export const countPermissions = (user) => {
  if (!user) return 0;
  if (user.role === "superAdmin") return TOTAL_PERMS_COUNT;
  const userPerms = _parsePerms(user.perms);
  if (userPerms.length > 0) {
    if (userPerms.includes("*")) return TOTAL_PERMS_COUNT;
    return userPerms.length;
  }
  const role = _globalRoles.find((r) => r.name === user.role);
  let rolePerms = role?.perms || ROLE_TEMPLATES[user.role]?.perms || [];
  rolePerms = _parsePerms(rolePerms);
  if (rolePerms.includes("*")) return TOTAL_PERMS_COUNT;
  return rolePerms.length;
};

export const getRolePermissions = (roleName) => {
  if (!roleName) return [];
  const role = _globalRoles.find((r) => r.name === roleName);
  if (role && role.perms) {
    const parsed = _parsePerms(role.perms);
    if (parsed.length > 0) return parsed;
  }
  const tpl = ROLE_TEMPLATES[roleName];
  if (tpl && Array.isArray(tpl.perms)) return tpl.perms;
  return [];
};

const ROLE_COLOR_MAP = {
  superAdmin:
    "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
  dispatcher:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700",
  captain:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
  camo: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700",
  crewMember:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
};

const ROLE_ICON_MAP = {
  superAdmin: "👑",
  dispatcher: "📋",
  captain: "✈️",
  camo: "🔧",
  crewMember: "👤",
};

const FALLBACK_COLORS = [
  "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700",
  "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-700",
  "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-700",
  "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700",
  "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950 dark:text-lime-200 dark:border-lime-700",
];

const _hashColor = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
};

export const getRoleColor = (roleName, lang = "en") => {
  if (!roleName) return FALLBACK_COLORS[0];
  if (ROLE_COLOR_MAP[roleName]) return ROLE_COLOR_MAP[roleName];
  const role = _globalRoles.find((r) => r.name === roleName);
  if (role?.color) {
    const c = role.color;
    if (typeof c === "string" && c.startsWith("#"))
      return `border-slate-300 dark:border-slate-600`;
    if (typeof c === "string" && /^[a-z]+$/.test(c))
      return `bg-${c}-100 text-${c}-800 border-${c}-300 dark:bg-${c}-950 dark:text-${c}-200 dark:border-${c}-700`;
  }
  return _hashColor(roleName);
};

export const getRoleIcon = (roleName) => {
  if (!roleName) return "👤";
  if (ROLE_ICON_MAP[roleName]) return ROLE_ICON_MAP[roleName];
  const role = _globalRoles.find((r) => r.name === roleName);
  if (role?.icon) return role.icon;
  return "👤";
};

export const getRoleLabel = (roleName, lang = "en") => {
  if (!roleName) return "—";
  const tpl = ROLE_TEMPLATES[roleName];
  if (tpl) return lang === "ar" ? tpl.label_ar : tpl.label_en;
  const role = _globalRoles.find((r) => r.name === roleName);
  if (role) return lang === "ar" ? role.nameAr || role.name : role.name;
  return roleName;
};

export const getRoleTemplate = (roleName) => ROLE_TEMPLATES[roleName] || null;
export const hasPermission = can;

export const getPermissionLabel = (permKey, lang = "en") => {
  for (const group of Object.values(ALL_PERMISSIONS)) {
    const perm = group.perms.find((p) => p.key === permKey);
    if (perm) return lang === "ar" ? perm.ar : perm.en;
  }
  return permKey;
};

export const groupPermissions = () => {
  return Object.entries(ALL_PERMISSIONS).map(([key, group]) => ({
    key,
    label_en: group.label_en,
    label_ar: group.label_ar,
    icon: group.icon,
    perms: group.perms,
  }));
};
