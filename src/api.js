/* ═══════════════════════════════════════════════════════════
 * AeroOps API Client — Google Sheets + Drive
 * Version 4.2 — Fixed attachments double-encoding (Crew + Fleet)
 * ═══════════════════════════════════════════════════════════ */

export const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbwZV3JFVlXrBbBFu54l3bvSkaqKEykMwFsdIfPHzZMlD8bGNuZ9un-MRLgHM_tEAlOC/exec";
export const BACKUP_API_URL =
  "https://script.google.com/macros/s/AKfycbx1Q_uFSgUs43Y3xqS7C8_yptcPPizMIBaUf0Kf07TKf4n_X75j84rHlAvwcXcTeMVtTg/exec";

export function getApiUrl() {
  try {
    const stored = localStorage.getItem("aeroops.apiUrl");
    if (stored && stored.startsWith("https://script.google.com")) return stored;
  } catch {}
  return DEFAULT_API_URL;
}

export function setApiUrl(url) {
  try {
    if (url) localStorage.setItem("aeroops.apiUrl", url);
    else localStorage.removeItem("aeroops.apiUrl");
  } catch {}
}

/* ═══════════════════════════════════════════════════════════
 * SAFE HELPERS
 * ═══════════════════════════════════════════════════════════ */
function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeArrayOrCsv(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

function safeObject(val) {
  if (!val) return null;
  if (typeof val === "object" && !Array.isArray(val)) {
    if (val instanceof Date) return null;
    return Object.keys(val).length > 0 ? val : null;
  }
  if (typeof val === "string") {
    let trimmed = val.trim();
    if (trimmed.startsWith("'")) trimmed = trimmed.slice(1);
    if (
      !trimmed ||
      trimmed === "" ||
      trimmed === "null" ||
      trimmed === "undefined"
    ) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch (e) {
      try {
        const fixed = trimmed.replace(/,\s*$/, "") + "}";
        const parsed = JSON.parse(fixed);
        if (parsed && typeof parsed === "object") {
          console.warn(
            "⚠️ safeObject — fixed truncated JSON for:",
            trimmed.substring(0, 50)
          );
          return parsed;
        }
      } catch (e2) {
        /* تجاهل */
      }
      try {
        const cleaned = trimmed
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\");
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object") {
          console.warn(
            "⚠️ safeObject — cleaned escape chars for:",
            trimmed.substring(0, 50)
          );
          return parsed;
        }
      } catch (e3) {
        /* تجاهل */
      }
      console.warn("⚠️ safeObject — JSON.parse failed:", {
        raw: trimmed.substring(0, 150),
        error: e.message,
      });
      return null;
    }
  }
  return null;
}

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === "") return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function safeBool(val) {
  return (
    val === true || val === "true" || val === "TRUE" || val === 1 || val === "1"
  );
}

function safeString(val, fallback = "") {
  if (val === null || val === undefined) return fallback;
  return String(val);
}

function cleanUrl(url) {
  if (!url) return "";
  let str = String(url).trim();
  if (str.startsWith("'")) str = str.slice(1);
  if (str === "undefined" || str === "null") return "";
  return str;
}

/* ⭐ NEW — تسلسل آمن للمرفقات (يمنع double-encoding) */
function serializeAttachments(att) {
  if (att === null || att === undefined) return "[]";

  // إذا كانت string — تحقق أنها JSON صالح لمصفوفة
  if (typeof att === "string") {
    const trimmed = att.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return "[]";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      return "[]";
    } catch {
      return "[]";
    }
  }

  // إذا كانت مصفوفة — حوّلها مباشرة
  if (Array.isArray(att)) return JSON.stringify(att);

  // أي شيء آخر — مصفوفة فارغة
  return "[]";
}

/* ⭐ NEW — إلغاء أي ترميز مزدوج عند القراءة */
function normalizeAttachments(val) {
  if (!val) return [];
  let current = val;

  // فك الترميز حتى 3 مرات (يكفي لمعالجة double/triple encoding)
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current;
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed) return [];
    try {
      current = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  return Array.isArray(current) ? current : [];
}

/* ═══════════════════════════════════════════════════════════
 * Core
 * ═══════════════════════════════════════════════════════════ */
async function executeFetch(url, payload) {
  const body = "payload=" + encodeURIComponent(payload);

  const res = await fetch(url, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    redirect: "follow",
  });

  const text = await res.text();
  if (text.trim().startsWith("<")) {
    if (text.includes("You do not have permission to access the requested document")) {
      throw new Error("PERMISSION_DENIED: You do not have permission to access the requested document.");
    }
    const divMatch = text.match(/<div[^>]*>([^<]{10,200})<\/div>/i);
    const m = text.match(/<title>(.*?)<\/title>/i);
    const msg = divMatch ? divMatch[1].trim() : (m ? m[1] : "HTML Error");
    throw new Error("Apps Script: " + msg);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Non-JSON: " + text.substring(0, 200));
  }

  if (!result.ok) throw new Error(result.error || "API Error");
  return result.data;
}

async function apiCall(action, sheet, data = {}, id = null) {
  const payload = JSON.stringify({ action, sheet, data, id });
  const activeUrl = getApiUrl();

  try {
    return await executeFetch(activeUrl, payload);
  } catch (err) {
    if (
      err.message &&
      err.message.includes("PERMISSION_DENIED") &&
      activeUrl !== BACKUP_API_URL
    ) {
      console.warn(
        "⚠️ Primary Apps Script URL returned permission error. Falling back to working backup URL...",
        BACKUP_API_URL
      );
      try {
        const backupResult = await executeFetch(BACKUP_API_URL, payload);
        console.log("✅ Backup URL succeeded for action:", action, sheet);
        return backupResult;
      } catch (backupErr) {
        throw new Error(
          "خطأ صلاحيات في رابط Google Apps Script: يرجى التأكد من ضبط النشر على (Execute as: Me) و (Who has access: Anyone)."
        );
      }
    }
    throw err;
  }
}

async function executeRead(url, sheet) {
  const res = await fetch(`${url}?sheet=${encodeURIComponent(sheet)}`, {
    method: "GET",
    redirect: "follow",
  });

  const text = await res.text();
  if (text.trim().startsWith("<")) {
    if (text.includes("You do not have permission to access the requested document")) {
      throw new Error("PERMISSION_DENIED: You do not have permission to access the requested document.");
    }
    const m = text.match(/<title>(.*?)<\/title>/i);
    throw new Error("Apps Script: " + (m ? m[1] : "HTML"));
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Non-JSON: " + text.substring(0, 200));
  }

  if (!result.ok) throw new Error(result.error || "Read Error");
  return result.data || [];
}

async function apiRead(sheet) {
  const activeUrl = getApiUrl();
  try {
    return await executeRead(activeUrl, sheet);
  } catch (err) {
    if (
      err.message &&
      err.message.includes("PERMISSION_DENIED") &&
      activeUrl !== BACKUP_API_URL
    ) {
      console.warn("⚠️ Primary read returned permission error, falling back to backup...");
      return await executeRead(BACKUP_API_URL, sheet);
    }
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
 * CREW
 * ═══════════════════════════════════════════════════════════ */
export const crewAPI = {
  list: async () => {
    const list = await apiRead("Crew");
    return list.map((c) => ({
      ...c,
      attachments: normalizeAttachments(c.attachments),
      ftl28: safeNumber(c.ftl28, 0),
      active: safeBool(c.active),
      status: safeString(c.status, "active"),
      assignedAircraft: safeArrayOrCsv(c.assignedAircraft),
    }));
  },
  create: (c) =>
    apiCall("create", "Crew", {
      fullName: c.fullName || "",
      role: c.role || "",
      empNo: c.empNo || "",
      email: c.email || "",
      phone: c.phone || "",
      nationality: c.nationality || "",
      dob: c.dob || "",
      gender: c.gender || "male",
      base: c.base || "",
      licenseNo: c.licenseNo || "",
      licenseExpiry: c.licenseExpiry || "",
      medicalExpiry: c.medicalExpiry || "",
      passportNo: c.passportNo || "",
      passportExpiry: c.passportExpiry || "",
      eNumber: c.eNumber || "",
      ftl28: c.ftl28 || 0,
      avatar: c.avatar || "",
      status: c.status || "active",
      assignedAircraft: JSON.stringify(c.assignedAircraft || []),
      attachments: serializeAttachments(c.attachments),
    }),
  update: (id, c) =>
    apiCall(
      "update",
      "Crew",
      {
        fullName: c.fullName || "",
        role: c.role || "",
        empNo: c.empNo || "",
        email: c.email || "",
        phone: c.phone || "",
        nationality: c.nationality || "",
        dob: c.dob || "",
        gender: c.gender || "male",
        base: c.base || "",
        licenseNo: c.licenseNo || "",
        licenseExpiry: c.licenseExpiry || "",
        medicalExpiry: c.medicalExpiry || "",
        passportNo: c.passportNo || "",
        passportExpiry: c.passportExpiry || "",
        eNumber: c.eNumber || "",
        ftl28: c.ftl28 || 0,
        avatar: c.avatar || "",
        status: c.status || "active",
        assignedAircraft: JSON.stringify(c.assignedAircraft || []),
        attachments: serializeAttachments(c.attachments),
      },
      id
    ),
  remove: (id) => apiCall("delete", "Crew", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * FLEET
 * ═══════════════════════════════════════════════════════════ */
export const fleetAPI = {
  list: async () => {
    const list = await apiRead("Fleet");
    return list.map((a) => ({
      ...a,
      attachments: normalizeAttachments(a.attachments),
      tah: safeNumber(a.tah, 0),
      tac: safeNumber(a.tac, 0),
      status: safeString(a.status, "AIRWORTHY"),
    }));
  },
  create: (a) =>
    apiCall("create", "Fleet", {
      reg: a.reg || "",
      type: a.type || "",
      status: a.status || "AIRWORTHY",
      tah: a.tah || 0,
      tac: a.tac || 0,
      lastCheck: a.lastCheck || "",
      nextCheck: a.nextCheck || "",
      attachments: serializeAttachments(a.attachments),
    }),
  update: (id, a) =>
    apiCall(
      "update",
      "Fleet",
      {
        reg: a.reg || "",
        type: a.type || "",
        status: a.status || "AIRWORTHY",
        tah: a.tah || 0,
        tac: a.tac || 0,
        lastCheck: a.lastCheck || "",
        nextCheck: a.nextCheck || "",
        attachments: serializeAttachments(a.attachments),
      },
      id
    ),
  remove: (id) => apiCall("delete", "Fleet", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * FLIGHTS
 * ═══════════════════════════════════════════════════════════ */
export const flightsAPI = {
  list: async () => {
    const list = await apiRead("Flights");
    return list.map((f) => {
      const actualRaw = f.actual;
      let actual = safeObject(actualRaw);
      if (!actual && actualRaw && String(actualRaw).trim() !== "") {
        console.warn("⚠️ flightsAPI.list — actual failed for", f.flightNo, {
          raw: String(actualRaw).substring(0, 200),
          type: typeof actualRaw,
        });
      }
      return {
        ...f,
        crewSlots: safeArray(f.crewSlots),
        actual: actual || {},
        pax: safeNumber(f.pax, 0),
        cargo: safeNumber(f.cargo, 0),
        status: safeString(f.status, "SCHEDULED"),
        flightType: safeString(f.flightType, "SCHEDULED"),
        notes: safeString(f.notes),
        permits: safeString(f.permits),
        services: safeString(f.services),
      };
    });
  },
  create: (f) =>
    apiCall("create", "Flights", {
      flightNo: f.flightNo || "",
      dep: f.dep || "",
      arr: f.arr || "",
      altn: f.altn || "",
      altn2: f.altn2 || "",
      std: f.std || "",
      sta: f.sta || "",
      acft: f.acft || "",
      status: f.status || "SCHEDULED",
      flightType: f.flightType || "SCHEDULED",
      notes: f.notes || "",
      permits: f.permits || "",
      services: f.services || "",
      pax: f.pax || 0,
      cargo: f.cargo || 0,
      crewSlots: JSON.stringify(f.crewSlots || []),
      actual: f.actual ? JSON.stringify(f.actual) : "",
    }),
  update: (id, f) =>
    apiCall(
      "update",
      "Flights",
      {
        flightNo: f.flightNo || "",
        dep: f.dep || "",
        arr: f.arr || "",
        altn: f.altn || "",
        altn2: f.altn2 || "",
        std: f.std || "",
        sta: f.sta || "",
        acft: f.acft || "",
        status: f.status || "SCHEDULED",
        flightType: f.flightType || "SCHEDULED",
        notes: f.notes || "",
        permits: f.permits || "",
        services: f.services || "",
        pax: f.pax || 0,
        cargo: f.cargo || 0,
        crewSlots: JSON.stringify(f.crewSlots || []),
        actual: f.actual ? JSON.stringify(f.actual) : "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Flights", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * USERS
 * ═══════════════════════════════════════════════════════════ */
export const usersAPI = {
  list: async () => {
    const list = await apiRead("Users");
    return list.map((u) => ({
      ...u,
      perms: safeArray(u.perms),
      active: safeBool(u.active),
      username: safeString(u.username),
      password: safeString(u.password),
      fullName: safeString(u.fullName),
      role: safeString(u.role, "crewMember"),
    }));
  },
  create: (u) =>
    apiCall("create", "Users", {
      username: u.username || "",
      password: u.password || "",
      fullName: u.fullName || "",
      role: u.role || "dispatcher",
      email: u.email || "",
      phone: u.phone || "",
      jobTitle: u.jobTitle || "",
      active: u.active !== false,
      crewId: u.crewId || "",
      perms: JSON.stringify(u.perms || []),
      avatar: u.avatar || "",
    }),
  update: (id, u) =>
    apiCall(
      "update",
      "Users",
      {
        username: u.username || "",
        password: u.password || "",
        fullName: u.fullName || "",
        role: u.role || "dispatcher",
        email: u.email || "",
        phone: u.phone || "",
        jobTitle: u.jobTitle || "",
        active: u.active !== false,
        crewId: u.crewId || "",
        perms: JSON.stringify(u.perms || []),
        avatar: u.avatar || "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Users", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * ROLES
 * ═══════════════════════════════════════════════════════════ */
export const rolesAPI = {
  list: async () => {
    const list = await apiRead("Roles");
    return list.map((r) => ({
      id: r.id,
      name: safeString(r.name),
      nameAr: safeString(r.nameAr, r.name),
      description: safeString(r.description),
      perms: safeArray(r.perms),
      active: safeBool(r.active),
    }));
  },
  create: (role) =>
    apiCall("create", "Roles", {
      name: role.name || "",
      nameAr: role.nameAr || role.name || "",
      description: role.description || "",
      perms: JSON.stringify(role.perms || []),
      active: role.active !== false,
    }),
  update: (id, role) =>
    apiCall(
      "update",
      "Roles",
      {
        name: role.name || "",
        nameAr: role.nameAr || role.name || "",
        description: role.description || "",
        perms: JSON.stringify(role.perms || []),
        active: role.active !== false,
      },
      id
    ),
  remove: (id) => apiCall("delete", "Roles", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * SETTINGS
 * ═══════════════════════════════════════════════════════════ */
export const settingsAPI = {
  get: async () => {
    const list = await apiRead("Settings");
    if (!list[0]) return null;
    return {
      ...list[0],
      companyName: safeString(list[0].companyName, "AeroOps"),
      companyNameAr: safeString(list[0].companyNameAr, "إيرو أوبس"),
      operatorCode: safeString(list[0].operatorCode, "EACS"),
      navLayout: safeString(list[0].navLayout, "top"),
      tabPreferences: safeObject(list[0].tabPreferences) || null,
      logo: cleanUrl(list[0].logo),
      stamp: cleanUrl(list[0].stamp),
      timeMode: safeString(list[0].timeMode, "utc"),
      emailFrom: cleanUrl(list[0].emailFrom || ""),
      autoFlightEmails: list[0].autoFlightEmails !== false,
      autoExpiryAlerts: list[0].autoExpiryAlerts !== false,
    };
  },

  update: (id, data) => {
    const payload = {
      companyName: data.companyName !== undefined ? data.companyName : "",
      companyNameAr: data.companyNameAr !== undefined ? data.companyNameAr : "",
      operatorCode: (data.operatorCode || "EACS").toUpperCase(),
      navLayout: data.navLayout || "top",
      tabPreferences: data.tabPreferences
        ? JSON.stringify(data.tabPreferences)
        : "",
      logo: data.logo !== undefined ? data.logo : "",
      stamp: data.stamp !== undefined ? data.stamp : "",
      timeMode: data.timeMode || "utc",
      emailFrom: data.emailFrom !== undefined ? data.emailFrom : "",
      autoFlightEmails:
        data.autoFlightEmails !== undefined ? data.autoFlightEmails : true,
      autoExpiryAlerts:
        data.autoExpiryAlerts !== undefined ? data.autoExpiryAlerts : true,
    };
    if (data.__clearFields && Array.isArray(data.__clearFields)) {
      payload.__clearFields = data.__clearFields;
    }
    return apiCall("update", "Settings", payload, id);
  },

  save: async (data) => {
    let existing = null;
    try {
      existing = await settingsAPI.get();
    } catch (e) {
      console.warn(
        "⚠️ settingsAPI.save — could not fetch existing:",
        e.message
      );
    }

    const merged = {
      companyName:
        data.companyName !== undefined
          ? data.companyName
          : existing?.companyName || "",
      companyNameAr:
        data.companyNameAr !== undefined
          ? data.companyNameAr
          : existing?.companyNameAr || "",
      operatorCode:
        data.operatorCode !== undefined
          ? data.operatorCode
          : existing?.operatorCode || "EACS",
      navLayout:
        data.navLayout !== undefined
          ? data.navLayout
          : existing?.navLayout || "top",
      tabPreferences:
        data.tabPreferences !== undefined
          ? data.tabPreferences
          : existing?.tabPreferences || null,
      logo: data.logo !== undefined ? data.logo : existing?.logo || "",
      stamp: data.stamp !== undefined ? data.stamp : existing?.stamp || "",
      timeMode:
        data.timeMode !== undefined
          ? data.timeMode
          : existing?.timeMode || "utc",
      emailFrom:
        data.emailFrom !== undefined
          ? data.emailFrom
          : existing?.emailFrom || "",
      autoFlightEmails:
        data.autoFlightEmails !== undefined
          ? data.autoFlightEmails
          : existing?.autoFlightEmails ?? true,
      autoExpiryAlerts:
        data.autoExpiryAlerts !== undefined
          ? data.autoExpiryAlerts
          : existing?.autoExpiryAlerts ?? true,
    };

    if (data.__clearFields && Array.isArray(data.__clearFields)) {
      merged.__clearFields = data.__clearFields;
    }

    const payload = {
      companyName: merged.companyName || "",
      companyNameAr: merged.companyNameAr || "",
      operatorCode: (merged.operatorCode || "EACS").toUpperCase(),
      navLayout: merged.navLayout || "top",
      tabPreferences: merged.tabPreferences
        ? JSON.stringify(merged.tabPreferences)
        : "",
      logo: merged.logo || "",
      stamp: merged.stamp || "",
      timeMode: merged.timeMode || "utc",
      emailFrom: merged.emailFrom || "",
      autoFlightEmails: merged.autoFlightEmails ?? true,
      autoExpiryAlerts: merged.autoExpiryAlerts ?? true,
    };

    if (merged.__clearFields) {
      payload.__clearFields = merged.__clearFields;
    }

    if (existing && existing.id) {
      return apiCall("update", "Settings", payload, existing.id);
    }
    return apiCall("create", "Settings", payload);
  },

  clearLogo: async () =>
    settingsAPI.save({ logo: "", __clearFields: ["logo"] }),
  clearStamp: async () =>
    settingsAPI.save({ stamp: "", __clearFields: ["stamp"] }),
};

/* ═══════════════════════════════════════════════════════════
 * AUDIT LOG
 * ═══════════════════════════════════════════════════════════ */
export const auditAPI = {
  list: async () => {
    const list = await apiRead("AuditLog");
    return list.map((l) => ({
      ...l,
      timestamp: safeString(l.timestamp),
      userId: safeString(l.userId),
      userName: safeString(l.userName),
      userRole: safeString(l.userRole),
      action: safeString(l.action),
      entity: safeString(l.entity),
      entityId: safeString(l.entityId),
      entityName: safeString(l.entityName),
      details: safeString(l.details, "{}"),
      ipAddress: safeString(l.ipAddress),
      userAgent: safeString(l.userAgent),
    }));
  },
  create: (log) =>
    apiCall("create", "AuditLog", {
      timestamp: log.timestamp || new Date().toISOString(),
      userId: log.userId || "",
      userName: log.userName || "",
      userRole: log.userRole || "",
      action: log.action || "",
      entity: log.entity || "",
      entityId: log.entityId || "",
      entityName: log.entityName || "",
      details:
        typeof log.details === "string"
          ? log.details
          : JSON.stringify(log.details || {}),
      ipAddress: log.ipAddress || "",
      userAgent: log.userAgent || "",
    }),
  remove: (id) => apiCall("delete", "AuditLog", {}, id),
  clearAll: async () => {
    const all = await apiRead("AuditLog");
    for (const log of all) {
      await apiCall("delete", "AuditLog", {}, log.id);
    }
  },
};

/* ═══════════════════════════════════════════════════════════
 * ROSTER
 * ═══════════════════════════════════════════════════════════ */
export const rosterAPI = {
  list: async () => {
    const list = await apiRead("Roster");
    return list.map((r) => ({
      ...r,
      date: safeString(r.date),
      crewId: safeString(r.crewId),
      crewName: safeString(r.crewName),
      type: safeString(r.type, "FLIGHT"),
      flightIds: safeArray(r.flightIds),
      startTime: safeString(r.startTime),
      endTime: safeString(r.endTime),
      notes: safeString(r.notes),
      status: safeString(r.status, "published"),
      publishedAt: safeString(r.publishedAt),
    }));
  },
  create: (r) =>
    apiCall("create", "Roster", {
      date: r.date || "",
      crewId: r.crewId || "",
      crewName: r.crewName || "",
      type: r.type || "FLIGHT",
      flightIds: JSON.stringify(r.flightIds || []),
      startTime: r.startTime || "",
      endTime: r.endTime || "",
      notes: r.notes || "",
      status: r.status || "published",
      publishedAt: r.publishedAt || "",
    }),
  update: (id, r) =>
    apiCall(
      "update",
      "Roster",
      {
        date: r.date || "",
        crewId: r.crewId || "",
        crewName: r.crewName || "",
        type: r.type || "FLIGHT",
        flightIds: JSON.stringify(r.flightIds || []),
        startTime: r.startTime || "",
        endTime: r.endTime || "",
        notes: r.notes || "",
        status: r.status || "published",
        publishedAt: r.publishedAt || "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Roster", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * STANDBY
 * ═══════════════════════════════════════════════════════════ */
export const standbyAPI = {
  list: async () => {
    const list = await apiRead("Standby");
    return list.map((s) => ({
      ...s,
      date: safeString(s.date),
      crewId: safeString(s.crewId),
      crewName: safeString(s.crewName),
      type: safeString(s.type, "AIRPORT"),
      startTime: safeString(s.startTime),
      endTime: safeString(s.endTime),
      durationMin: safeNumber(s.durationMin, 0),
      activated: safeBool(s.activated),
      activatedAt: safeString(s.activatedAt),
      flightId: safeString(s.flightId),
      notes: safeString(s.notes),
    }));
  },
  create: (s) =>
    apiCall("create", "Standby", {
      date: s.date || "",
      crewId: s.crewId || "",
      crewName: s.crewName || "",
      type: s.type || "AIRPORT",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
      durationMin: s.durationMin || 0,
      activated: s.activated || false,
      activatedAt: s.activatedAt || "",
      flightId: s.flightId || "",
      notes: s.notes || "",
    }),
  update: (id, s) =>
    apiCall(
      "update",
      "Standby",
      {
        date: s.date || "",
        crewId: s.crewId || "",
        crewName: s.crewName || "",
        type: s.type || "AIRPORT",
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        durationMin: s.durationMin || 0,
        activated: s.activated || false,
        activatedAt: s.activatedAt || "",
        flightId: s.flightId || "",
        notes: s.notes || "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Standby", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * LEAVE
 * ═══════════════════════════════════════════════════════════ */
export const leaveAPI = {
  list: async () => {
    const list = await apiRead("Leave");
    return list.map((l) => ({
      ...l,
      crewId: safeString(l.crewId),
      crewName: safeString(l.crewName),
      type: safeString(l.type, "ANNUAL"),
      fromDate: safeString(l.fromDate),
      toDate: safeString(l.toDate),
      days: safeNumber(l.days, 0),
      reason: safeString(l.reason),
      status: safeString(l.status, "pending"),
      requestedAt: safeString(l.requestedAt),
      approvedBy: safeString(l.approvedBy),
      approvedAt: safeString(l.approvedAt),
      notes: safeString(l.notes),
    }));
  },
  create: (l) =>
    apiCall("create", "Leave", {
      crewId: l.crewId || "",
      crewName: l.crewName || "",
      type: l.type || "ANNUAL",
      fromDate: l.fromDate || "",
      toDate: l.toDate || "",
      days: l.days || 0,
      reason: l.reason || "",
      status: l.status || "pending",
      requestedAt: l.requestedAt || new Date().toISOString(),
      approvedBy: l.approvedBy || "",
      approvedAt: l.approvedAt || "",
      notes: l.notes || "",
    }),
  update: (id, l) =>
    apiCall(
      "update",
      "Leave",
      {
        crewId: l.crewId || "",
        crewName: l.crewName || "",
        type: l.type || "ANNUAL",
        fromDate: l.fromDate || "",
        toDate: l.toDate || "",
        days: l.days || 0,
        reason: l.reason || "",
        status: l.status || "pending",
        requestedAt: l.requestedAt || "",
        approvedBy: l.approvedBy || "",
        approvedAt: l.approvedAt || "",
        notes: l.notes || "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Leave", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * TRAINING
 * ═══════════════════════════════════════════════════════════ */
export const trainingAPI = {
  list: async () => {
    const list = await apiRead("Training");
    return list.map((t) => ({
      ...t,
      crewId: safeString(t.crewId),
      crewName: safeString(t.crewName),
      type: safeString(t.type, "SIMULATOR"),
      title: safeString(t.title),
      date: safeString(t.date),
      expiryDate: safeString(t.expiryDate),
      instructor: safeString(t.instructor),
      location: safeString(t.location),
      result: safeString(t.result, "PASS"),
      score: safeString(t.score),
      notes: safeString(t.notes),
      certificate: safeString(t.certificate),
    }));
  },
  create: (t) =>
    apiCall("create", "Training", {
      crewId: t.crewId || "",
      crewName: t.crewName || "",
      type: t.type || "SIMULATOR",
      title: t.title || "",
      date: t.date || "",
      expiryDate: t.expiryDate || "",
      instructor: t.instructor || "",
      location: t.location || "",
      result: t.result || "PASS",
      score: t.score || "",
      notes: t.notes || "",
      certificate: t.certificate || "",
    }),
  update: (id, t) =>
    apiCall(
      "update",
      "Training",
      {
        crewId: t.crewId || "",
        crewName: t.crewName || "",
        type: t.type || "SIMULATOR",
        title: t.title || "",
        date: t.date || "",
        expiryDate: t.expiryDate || "",
        instructor: t.instructor || "",
        location: t.location || "",
        result: t.result || "PASS",
        score: t.score || "",
        notes: t.notes || "",
        certificate: t.certificate || "",
      },
      id
    ),
  remove: (id) => apiCall("delete", "Training", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * LOGIN HISTORY
 * ═══════════════════════════════════════════════════════════ */
export const loginHistoryAPI = {
  list: async () => {
    const list = await apiRead("LoginHistory");
    return list.map((h) => ({
      ...h,
      timestamp: safeString(h.timestamp),
      userId: safeString(h.userId),
      userName: safeString(h.userName),
      username: safeString(h.username),
      userRole: safeString(h.userRole),
      action: safeString(h.action, "LOGIN"),
      browser: safeString(h.browser),
      os: safeString(h.os),
      userAgent: safeString(h.userAgent),
      ipAddress: safeString(h.ipAddress),
      success: safeBool(h.success) || h.success === undefined,
      reason: safeString(h.reason),
    }));
  },
  create: (h) =>
    apiCall("create", "LoginHistory", {
      timestamp: h.timestamp || new Date().toISOString(),
      userId: h.userId || "",
      userName: h.userName || "",
      username: h.username || "",
      userRole: h.userRole || "",
      action: h.action || "LOGIN",
      browser: h.browser || "",
      os: h.os || "",
      userAgent: h.userAgent || "",
      ipAddress: h.ipAddress || "",
      success: h.success !== false,
      reason: h.reason || "",
    }),
  remove: (id) => apiCall("delete", "LoginHistory", {}, id),
  clearAll: async () => {
    const all = await apiRead("LoginHistory");
    for (const h of all) {
      await apiCall("delete", "LoginHistory", {}, h.id);
    }
  },
};

/* ═══════════════════════════════════════════════════════════
 * MANUALS
 * ═══════════════════════════════════════════════════════════ */
export const manualsAPI = {
  list: async () => {
    const list = await apiRead("Manuals");
    return list.map((m) => ({
      ...m,
      code: safeString(m.code, ""),
      title_en: safeString(m.title_en, "Untitled"),
      title_ar: safeString(m.title_ar, ""),
      category: safeString(m.category, "Operations"),
      rev: safeString(m.rev, ""),
      effectiveDate: safeString(m.effectiveDate, ""),
      approval: safeString(m.approval, ""),
      status: safeString(m.status, "active"),
      pages: safeNumber(m.pages, 0),
      fileSize: safeString(m.fileSize, ""),
      pdfData: safeString(m.pdfData, ""),
      pdfName: safeString(m.pdfName, ""),
      visibleTo: safeString(m.visibleTo, "all"),
      lastUpdated: safeString(m.lastUpdated, ""),
      lastUpdatedBy: safeString(m.lastUpdatedBy, ""),
      lastUpdatedById: safeString(m.lastUpdatedById, ""),
      summary: safeString(m.summary, ""),
      chapters: safeArray(m.chapters),
    }));
  },
  create: (m) =>
    apiCall("create", "Manuals", {
      code: m.code || "",
      title_en: m.title_en || "",
      title_ar: m.title_ar || "",
      category: m.category || "Operations",
      rev: m.rev || "",
      effectiveDate: m.effectiveDate || "",
      approval: m.approval || "",
      status: m.status || "active",
      pages: m.pages || 0,
      fileSize: m.fileSize || "",
      pdfData: m.pdfData || "",
      pdfName: m.pdfName || "",
      visibleTo: m.visibleTo || "all",
      lastUpdated: m.lastUpdated || new Date().toISOString(),
      lastUpdatedBy: m.lastUpdatedBy || "",
      lastUpdatedById: m.lastUpdatedById || "",
      summary: m.summary || "",
      chapters: JSON.stringify(m.chapters || []),
    }),
  update: (id, m) =>
    apiCall(
      "update",
      "Manuals",
      {
        code: m.code || "",
        title_en: m.title_en || "",
        title_ar: m.title_ar || "",
        category: m.category || "Operations",
        rev: m.rev || "",
        effectiveDate: m.effectiveDate || "",
        approval: m.approval || "",
        status: m.status || "active",
        pages: m.pages || 0,
        fileSize: m.fileSize || "",
        pdfData: m.pdfData || "",
        pdfName: m.pdfName || "",
        visibleTo: m.visibleTo || "all",
        lastUpdated: m.lastUpdated || new Date().toISOString(),
        lastUpdatedBy: m.lastUpdatedBy || "",
        lastUpdatedById: m.lastUpdatedById || "",
        summary: m.summary || "",
        chapters: JSON.stringify(m.chapters || []),
      },
      id
    ),
  remove: (id) => apiCall("delete", "Manuals", {}, id),
};

/* ═══════════════════════════════════════════════════════════
 * MANUALS AUDIT LOG
 * ═══════════════════════════════════════════════════════════ */
export const manualAuditAPI = {
  list: async () => {
    const list = await apiRead("ManualsAuditLog");
    return list.map((l) => ({
      ...l,
      timestamp: safeString(l.timestamp),
      userId: safeString(l.userId),
      userName: safeString(l.userName),
      userRole: safeString(l.userRole),
      action: safeString(l.action),
      manualId: safeString(l.manualId),
      manualCode: safeString(l.manualCode),
      manualTitle: safeString(l.manualTitle),
      previousUpdate: safeString(l.previousUpdate),
      newUpdate: safeString(l.newUpdate),
      details: safeString(l.details, "{}"),
    }));
  },
  create: (log) => apiCall("logManualAudit", null, log),
  remove: (id) => apiCall("deleteManualAuditLog", null, {}, id),
  clearOld: async (beforeDate) =>
    apiCall("clearOldManualAuditLog", null, { beforeDate }),
};

/* ═══════════════════════════════════════════════════════════
 * ALERTS — Dismissed alerts
 * ═══════════════════════════════════════════════════════════ */
export const alertsAPI = {
  listDismissed: async () => {
    const list = await apiRead("DismissedAlerts");
    return list.map((d) => ({
      id: safeString(d.id),
      alertKey: safeString(d.alertKey),
      dismissedBy: safeString(d.dismissedBy),
      dismissedAt: safeString(d.dismissedAt),
      reason: safeString(d.reason),
    }));
  },
  dismiss: (alertKey, userId, userName, reason = "") =>
    apiCall("dismissAlert", null, { alertKey, dismissedBy: userName, reason }),
  undismiss: (alertKey) => apiCall("undismissAlert", null, { alertKey }),
};

/* ═══════════════════════════════════════════════════════════
 * FILES
 * ═══════════════════════════════════════════════════════════ */
export async function uploadFile(file, folder = "general") {
  if (!file) throw new Error("لم يتم اختيار ملف");
  if (file.size === 0) throw new Error("الملف فارغ");
  if (file.size > 10 * 1024 * 1024) throw new Error("حجم الملف يتجاوز 10 MB");

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!result || typeof result !== "string")
        return reject(new Error("FileReader result invalid"));
      const parts = result.split(",");
      if (parts.length < 2 || !parts[1])
        return reject(new Error("Cannot extract base64"));
      resolve(parts[1]);
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });

  const payload = JSON.stringify({
    action: "upload",
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
    base64,
    folder,
  });

  const body = "payload=" + encodeURIComponent(payload);
  const activeUrl = getApiUrl();

  const doUpload = async (targetUrl) => {
    const res = await fetch(targetUrl, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      redirect: "follow",
    });

    const text = await res.text();
    if (text.trim().startsWith("<")) {
      const m = text.match(/<title>(.*?)<\/title>/i);
      const divMatch = text.match(/<div[^>]*>([^<]{10,200})<\/div>/i);
      const msg = divMatch ? divMatch[1].trim() : (m ? m[1] : "HTML Error");
      throw new Error("Apps Script: " + msg);
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Non-JSON: " + text.substring(0, 200));
    }

    if (!result.ok) throw new Error(result.error || "Upload failed");
    return result.data;
  };

  try {
    return await doUpload(activeUrl);
  } catch (err) {
    if (activeUrl !== BACKUP_API_URL) {
      console.warn(
        "⚠️ Upload on primary URL failed, trying backup URL...",
        err.message
      );
      try {
        const backupData = await doUpload(BACKUP_API_URL);
        console.log("✅ Backup URL succeeded for file upload");
        return backupData;
      } catch (backupErr) {
        throw new Error(err.message || backupErr.message);
      }
    }
    throw err;
  }
}

export async function deleteFile(filePath) {
  if (!filePath) return { ok: true };
  return apiCall("deleteFile", null, { filePath });
}

/* ═══════════════════════════════════════════════════════════
 * EMAIL — Send via Apps Script (MailApp) & Webmail Helpers
 * ═══════════════════════════════════════════════════════════ */
export async function sendEmail({ to, subject, body }) {
  return apiCall("sendEmail", null, { to, subject, body });
}

export async function sendFlightEmail(flight) {
  return apiCall("sendFlightEmail", null, { flight });
}

export async function checkExpiryAlerts() {
  return apiCall("checkExpiry", null, {});
}

export async function testEmailConnection() {
  try {
    const res = await apiCall("sendEmail", null, {
      to: "test@example.com",
      subject: "Ping Test",
      body: "Connection test",
      isDryRun: true,
    });
    return { ok: true, data: res };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      isUnknownAction: err.message && err.message.includes("Unknown action"),
    };
  }
}

export function createGmailWebUrl(to, subject, body) {
  const t = Array.isArray(to) ? to.join(",") : (to || "");
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(t)}&su=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
}

export function createMailtoUrl(to, subject, body) {
  const t = Array.isArray(to) ? to.join(",") : (to || "");
  return `mailto:${encodeURIComponent(t)}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
}
