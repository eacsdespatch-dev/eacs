/* ═══════════════════════════════════════════════════════════
 * CREW MODULE — Permission-aware (Info + Docs + Card + Expiry)
 * v3.5 — Prevent duplicate user creation + hide User button after creation
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  User,
  Phone,
  Mail,
  IdCard,
  FileDown,
  UserPlus,
  Paperclip,
  Eye,
  Plane,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { AvatarUpload } from "../components/AvatarUpload";
import { AttachmentsEditor } from "../components/AttachmentsEditor";
import {
  CrewTableIcon,
  CrewIDCardIcon,
  CrewEditorIcon,
  CrewMedicalIcon,
  CrewLicenseIcon,
  CrewBlockHoursIcon,
  CrewQualifiedIcon,
  CrewWarningIcon,
} from "../crewIcons";
import { crewAPI, usersAPI } from "../api";
import { logSafe } from "../utils/audit";
import {
  docStatus,
  daysUntil,
  formatFileSize,
  getStatusColor,
  fmtDate,
  initials,
} from "../utils/helpers";
import { can as checkPerm } from "../config/permissions";
import { generateCrewCardPDF, downloadPDF } from "../utils/pdf";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { ROLE_OPTIONS } from "../config/constants";

/* ⭐ Helper — استخراج المستندات */
function getDocs(c) {
  let att = c.attachments || [];
  if (typeof att === "string") {
    try {
      att = JSON.parse(att);
    } catch {
      att = [];
    }
  }
  return Array.isArray(att) ? att : [];
}

const mapCrewRoleToUserRole = (crewRole) => {
  const map = {
    captain: "captain",
    firstOfficer: "captain",
    flightAttendant: "crewMember",
    engineer: "camo",
    security: "crewMember",
    loadmaster: "crewMember",
  };
  return map[crewRole] || "crewMember";
};

const suggestUsername = (member) => {
  if (member.email) {
    return member.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
  }
  return member.fullName
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");
};

export function Crew({
  crew,
  setCrew,
  fleet = [],
  users = [],
  setUsers,
  companyName,
  setSyncStatus,
}) {
  const t = useT();
  const { user } = useAuth();

  const canCreate = checkPerm(user, "crew.create");
  const canEdit = checkPerm(user, "crew.edit");
  const canDelete = checkPerm(user, "crew.delete");
  const canCard = checkPerm(user, "crew.card");
  const canDocsView = checkPerm(user, "crew.docs");
  const canDocsEdit = checkPerm(user, "crew.docs_edit");
  const canDocsDownload = checkPerm(user, "crew.docs_download");
  const canCreateUser = canEdit && checkPerm(user, "users.create");

  /* ⭐ هل هذا العضو لديه مستخدم بالفعل؟ */
  const hasUser = (member) => {
    if (!member?.id) return false;
    return users.some(
      (u) => u.crewId && String(u.crewId) === String(member.id)
    );
  };

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [docsCrew, setDocsCrew] = useState(null);
  const [docsDraft, setDocsDraft] = useState([]);
  const [docsSaving, setDocsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [viewMode, setViewMode] = useLocalStorage("aeroops.crewView", "cards");
  const [busyPdf, setBusyPdf] = useState(null);

  const [createUserCrew, setCreateUserCrew] = useState(null);
  const [userDraft, setUserDraft] = useState({});
  const [userSaving, setUserSaving] = useState(false);

  const filtered = crew.filter((c) => {
    const s = (c.fullName + (c.empNo || "") + (c.email || "")).toLowerCase();
    return (
      s.includes(search.toLowerCase()) && (!roleFilter || c.role === roleFilter)
    );
  });

  const openNew = () => {
    if (!canCreate) return;
    setDraft({
      fullName: "",
      role: "captain",
      empNo: "",
      eNumber: "",
      email: "",
      phone: "",
      nationality: "",
      dob: "",
      gender: "male",
      base: "",
      licenseNo: "",
      licenseExpiry: "",
      medicalExpiry: "",
      passportNo: "",
      passportExpiry: "",
      ftl28: 0,
      avatar: null,
      status: "active",
      assignedAircraft: [],
      attachments: [],
    });
    setEditing("new");
  };

  const parseCrewAircraft = (member) => {
    if (!member?.assignedAircraft) return [];
    if (Array.isArray(member.assignedAircraft)) return member.assignedAircraft.filter(Boolean);
    if (typeof member.assignedAircraft === "string") {
      const trimmed = member.assignedAircraft.trim();
      if (!trimmed || trimmed === "null" || trimmed === "undefined") return [];
      try {
        const p = JSON.parse(trimmed);
        if (Array.isArray(p)) return p.filter(Boolean);
      } catch {}
      if (trimmed.includes(",")) {
        return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [trimmed];
    }
    return [];
  };

  const openEdit = (c) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل");
      return;
    }
    setDraft({
      ...c,
      assignedAircraft: parseCrewAircraft(c),
      dob: c.dob ? String(c.dob).slice(0, 10) : "",
      licenseExpiry: c.licenseExpiry
        ? String(c.licenseExpiry).slice(0, 10)
        : "",
      medicalExpiry: c.medicalExpiry
        ? String(c.medicalExpiry).slice(0, 10)
        : "",
      passportExpiry: c.passportExpiry
        ? String(c.passportExpiry).slice(0, 10)
        : "",
    });
    setEditing(c.id);
  };

  const save = async () => {
    if (editing === "new" && !canCreate) {
      alert("⚠️ ليس لديك صلاحية إنشاء");
      return;
    }
    if (editing !== "new" && !canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل");
      return;
    }
    if (!draft.fullName) return;
    setSyncStatus?.("syncing");
    try {
      const cleanAssigned = Array.isArray(draft.assignedAircraft)
        ? draft.assignedAircraft.filter(Boolean)
        : [];
      const cleanDraft = {
        ...draft,
        assignedAircraft: cleanAssigned,
      };

      if (editing === "new") {
        const created = await crewAPI.create({ ...cleanDraft, attachments: [] });
        setCrew([...crew, { ...cleanDraft, id: created.id, attachments: [] }]);
        logSafe(user, "CREATE", "Crew", created.id, cleanDraft.fullName, {});
      } else {
        const before = crew.find((c) => c.id === editing);
        const updated = { ...cleanDraft, attachments: before?.attachments || [] };
        await crewAPI.update(editing, updated);
        setCrew(
          crew.map((c) => (c.id === editing ? { ...updated, id: editing } : c))
        );
        logSafe(user, "UPDATE", "Crew", editing, cleanDraft.fullName, {});
      }
      setEditing(null);
      setSyncStatus?.("synced");
    } catch (e) {
      alert("Save failed: " + e.message);
      setSyncStatus?.("error");
    }
  };

  const remove = async (id) => {
    if (!canDelete) {
      alert("⚠️ ليس لديك صلاحية حذف");
      return;
    }
    if (!confirm(t.confirmDelete)) return;
    const member = crew.find((c) => c.id === id);
    try {
      await crewAPI.remove(id);
      setCrew(crew.filter((c) => c.id !== id));
      logSafe(user, "DELETE", "Crew", id, member?.fullName || "", {});
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const downloadCard = async (c) => {
    if (!canCard) {
      alert("⚠️ ليس لديك صلاحية ID Card");
      return;
    }
    setBusyPdf(c.id);
    try {
      const bytes = await generateCrewCardPDF(c, companyName);
      downloadPDF(bytes, `crew-card-${c.empNo || c.id}.pdf`);
    } catch (e) {
      alert("PDF failed: " + e.message);
    } finally {
      setBusyPdf(null);
    }
  };

  const openDocs = (c) => {
    if (!canDocsView) {
      alert("⚠️ ليس لديك صلاحية عرض المستندات");
      return;
    }
    setDocsCrew(c);
    setDocsDraft(getDocs(c));
  };

  /* ⭐ إرسال docsDraft كمصفوفة — crewAPI.update تحوّلها */
  const saveDocs = async () => {
    if (!canDocsEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل المستندات");
      return;
    }
    if (!docsCrew) return;
    setDocsSaving(true);
    try {
      await crewAPI.update(docsCrew.id, {
        ...docsCrew,
        attachments: docsDraft,
      });

      setCrew(
        crew.map((c) =>
          c.id === docsCrew.id ? { ...c, attachments: docsDraft } : c
        )
      );

      logSafe(
        user,
        "UPDATE",
        "Crew (Documents)",
        docsCrew.id,
        docsCrew.fullName,
        {}
      );
      alert("✅ " + (t.saved || "تم حفظ المستندات"));
      setDocsCrew(null);
      setDocsDraft([]);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setDocsSaving(false);
    }
  };

  const openCreateUser = (c) => {
    if (!canCreateUser) return;
    if (hasUser(c)) {
      alert("⚠️ هذا العضو لديه حساب مستخدم بالفعل");
      return;
    }
    setUserDraft({
      username: suggestUsername(c),
      password: "Aeroops@2026",
      fullName: c.fullName,
      email: c.email || "",
      phone: c.phone || "",
      jobTitle: c.role,
      role: mapCrewRoleToUserRole(c.role),
      active: true,
      crewId: c.id,
      avatar: c.avatar || null,
      perms: [],
    });
    setCreateUserCrew(c);
  };

  const saveNewUser = async () => {
    if (!canCreateUser) return;
    if (!userDraft.username || !userDraft.password) {
      alert("Username and password are required");
      return;
    }

    /* ⭐ منع التكرار — تحقق من users */
    if (createUserCrew && hasUser(createUserCrew)) {
      alert("⚠️ هذا العضو لديه حساب مستخدم بالفعل");
      setCreateUserCrew(null);
      setUserDraft({});
      return;
    }

    /* ⭐ منع تكرار username */
    const usernameTaken = users.some(
      (u) =>
        String(u.username || "").toLowerCase() ===
        String(userDraft.username || "").toLowerCase()
    );
    if (usernameTaken) {
      alert("⚠️ اسم المستخدم مستخدم بالفعل — اختر اسماً آخر");
      return;
    }

    setUserSaving(true);
    try {
      const created = await usersAPI.create(userDraft);
      logSafe(user, "CREATE", "User", created.id, userDraft.fullName, {});

      /* ⭐ أضف المستخدم الجديد إلى users فوراً — لإخفاء الزر */
      if (typeof setUsers === "function") {
        setUsers((prev) => [...prev, { ...userDraft, id: created.id }]);
      }

      alert(
        `✅ تم إنشاء المستخدم\n\n👤 ${userDraft.fullName}\n🔑 ${userDraft.username}\n🔒 ${userDraft.password}`
      );
      setCreateUserCrew(null);
      setUserDraft({});
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setUserSaving(false);
    }
  };

  const hasAnyAction =
    canEdit || canDocsView || canCard || canDelete || canCreateUser;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-md">
            <CrewTableIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {t.crew}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {crew.filter((c) => c.status === "active").length} {t.active} ·{" "}
              {crew.length} {t.all || "total"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="ps-9 w-56"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">{t.allStatuses || "All Roles"}</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {t[r] || r}
              </option>
            ))}
          </Select>
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
            {[
              { id: "cards", l: "⊞" },
              { id: "table", l: "☰" },
              { id: "list", l: "≡" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 text-sm font-bold ${
                  viewMode === v.id
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {v.l}
              </button>
            ))}
          </div>
          {canCreate && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" /> {t.addCrew}
            </button>
          )}
        </div>
      </div>

      {!hasAnyAction && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <Eye className="w-4 h-4" /> ⚠️ لديك صلاحية العرض فقط — لا يمكنك تعديل
          أو إضافة أو حذف
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const medSt = docStatus(c.medicalExpiry);
            const licSt = docStatus(c.licenseExpiry);
            const hasCritical =
              medSt === "critical" ||
              medSt === "expired" ||
              licSt === "critical" ||
              licSt === "expired";
            const docs = getDocs(c);
            const docsN = docs.length;
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 hover:shadow-lg transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex-shrink-0">
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt={c.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900 dark:to-sky-800 text-sky-700 dark:text-sky-300 font-bold text-lg">
                        {initials(c.fullName)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                      <span className="truncate">{c.fullName}</span>
                      {c.role === "captain" && (
                        <CrewQualifiedIcon className="w-3.5 h-3.5 text-sky-600" />
                      )}
                      {hasCritical && (
                        <CrewWarningIcon className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t[c.role] || c.role} · {c.empNo}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{c.email || "—"}</span>
                    </div>
                    {/* Assigned Aircraft Badges */}
                    {(() => {
                      const acfts = parseCrewAircraft(c);
                      if (acfts.length === 0) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {acfts.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                            >
                              ✈️ {r}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <Badge kind={c.status}>{t[c.status] || c.status}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-center">
                    <CrewBlockHoursIcon className="w-4 h-4 text-sky-600 mx-auto mb-1" />
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                      FTL28
                    </div>
                    <div
                      className={`font-bold text-slate-800 dark:text-slate-100 ${
                        c.ftl28 > 85 ? "text-rose-600" : ""
                      }`}
                    >
                      {c.ftl28}h
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-center">
                    <CrewMedicalIcon className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                      Medical
                    </div>
                    <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {fmtDate(c.medicalExpiry).slice(5)}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-center">
                    <CrewLicenseIcon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                      License
                    </div>
                    <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {fmtDate(c.licenseExpiry).slice(5)}
                    </div>
                  </div>
                </div>

                {hasAnyAction && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(c)}
                          className="py-2 rounded-lg bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-1 font-bold"
                        >
                          <CrewEditorIcon className="w-3.5 h-3.5" />{" "}
                          {t.edit || "تعديل"}
                        </button>
                      )}
                      {canDocsView && (
                        <button
                          onClick={() => openDocs(c)}
                          className="relative py-2 rounded-lg bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center gap-1 font-bold"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {t.attachments || "مستندات"}
                          {docsN > 0 && (
                            <span className="absolute -top-1.5 -end-1.5 bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {docsN}
                            </span>
                          )}
                        </button>
                      )}
                      {canCard && (
                        <button
                          onClick={() => downloadCard(c)}
                          disabled={busyPdf === c.id}
                          className="py-2 rounded-lg bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs flex items-center justify-center gap-1 font-bold disabled:opacity-50"
                        >
                          <CrewIDCardIcon className="w-3.5 h-3.5" /> ID
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {canCreateUser && !hasUser(c) && (
                        <button
                          onClick={() => openCreateUser(c)}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" /> User
                        </button>
                      )}
                      {canCreateUser && hasUser(c) && (
                        <div className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] flex items-center justify-center gap-1 font-bold">
                          ✓ Account
                        </div>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => remove(c.id)}
                          className="py-1.5 px-2 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {[
                  "#",
                  t.fullName,
                  t.role,
                  t.empNo,
                  t.email,
                  "FTL28",
                  "Medical",
                  "License",
                  "Docs",
                  ...(hasAnyAction ? [t.actions] : []),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-start font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const docs = getDocs(c);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                      {c.fullName}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      <div>{t[c.role] || c.role}</div>
                      {(() => {
                        const acfts = parseCrewAircraft(c);
                        if (acfts.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {acfts.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {c.empNo}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {c.email}
                    </td>
                    <td
                      className={`px-3 py-2 font-bold ${
                        c.ftl28 > 85
                          ? "text-rose-600"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {c.ftl28}h
                    </td>
                    <td className="px-3 py-2">
                      <Badge kind={docStatus(c.medicalExpiry)}>
                        {fmtDate(c.medicalExpiry)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge kind={docStatus(c.licenseExpiry)}>
                        {fmtDate(c.licenseExpiry)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {canDocsView ? (
                        <button
                          onClick={() => openDocs(c)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold"
                        >
                          <Paperclip className="w-3 h-3" /> {docs.length}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {docs.length}
                        </span>
                      )}
                    </td>
                    {hasAnyAction && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                              title={t.edit}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canCard && (
                            <button
                              onClick={() => downloadCard(c)}
                              className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300"
                              title="ID Card"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          )}
                          {canCreateUser && !hasUser(c) && (
                            <button
                              onClick={() => openCreateUser(c)}
                              className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                              title="Create User"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          {canCreateUser && hasUser(c) && (
                            <span
                              className="p-1.5 rounded text-emerald-600 dark:text-emerald-400"
                              title="Account exists"
                            >
                              <User className="w-4 h-4" />
                            </span>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => remove(c.id)}
                              className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.map((c) => {
            const docs = getDocs(c);
            return (
              <div
                key={c.id}
                className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex-shrink-0">
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-full h-full p-2 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-slate-800 dark:text-slate-100">
                    {c.fullName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t[c.role] || c.role} · {c.empNo} · {c.base}
                  </div>
                </div>
                <div className="hidden md:block">
                  <Badge kind={docStatus(c.medicalExpiry)}>Medical</Badge>
                </div>
                <div className="hidden md:block">
                  <Badge kind={docStatus(c.licenseExpiry)}>License</Badge>
                </div>
                {canDocsView && (
                  <button
                    onClick={() => openDocs(c)}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Paperclip className="w-3 h-3" /> {docs.length}
                  </button>
                )}
                {hasAnyAction && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canCard && (
                      <button
                        onClick={() => downloadCard(c)}
                        className="p-1.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    )}
                    {canCreateUser && !hasUser(c) && (
                      <button
                        onClick={() => openCreateUser(c)}
                        className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                        title="Create User"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    {canCreateUser && hasUser(c) && (
                      <span
                        className="p-1.5 rounded text-emerald-600 dark:text-emerald-400"
                        title="Account exists"
                      >
                        <User className="w-4 h-4" />
                      </span>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MODAL */}
      <Modal
        open={!!editing}
        title={editing === "new" ? t.addCrew : t.editCrew}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200"
            >
              {t.cancel}
            </button>
            <button
              onClick={save}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {t.save}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> {t.identity || "Identity"}
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <AvatarUpload
                  value={draft.avatar}
                  onChange={(v) => setDraft({ ...draft, avatar: v })}
                  name={draft.fullName}
                />
              </div>
              <Field label={t.fullName}>
                <Input
                  value={draft.fullName || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, fullName: e.target.value })
                  }
                />
              </Field>
              <Field label={t.empNo}>
                <Input
                  value={draft.empNo || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, empNo: e.target.value })
                  }
                />
              </Field>
              <Field label={t.eNumber || "E-NUMBER"}>
                <Input
                  value={draft.eNumber || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, eNumber: e.target.value })
                  }
                  placeholder="2119035"
                />
              </Field>
              <Field label={t.role}>
                <Select
                  value={draft.role || ""}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {t[r] || r}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.status}>
                <Select
                  value={draft.status || "active"}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </Select>
              </Field>
              <Field label={t.dob}>
                <Input
                  type="date"
                  value={draft.dob || ""}
                  onChange={(e) => setDraft({ ...draft, dob: e.target.value })}
                />
              </Field>
              <Field label={t.gender}>
                <Select
                  value={draft.gender || "male"}
                  onChange={(e) =>
                    setDraft({ ...draft, gender: e.target.value })
                  }
                >
                  <option value="male">{t.male}</option>
                  <option value="female">{t.female}</option>
                </Select>
              </Field>
              <Field label={t.nationality}>
                <Input
                  value={draft.nationality || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, nationality: e.target.value })
                  }
                />
              </Field>
              <Field label={t.base}>
                <Input
                  value={draft.base || ""}
                  onChange={(e) => setDraft({ ...draft, base: e.target.value })}
                />
              </Field>
            </div>
          </section>
          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" /> {t.contact || "Contact"}
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label={t.email}>
                <Input
                  type="email"
                  value={draft.email || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </Field>
              <Field label={t.phone}>
                <Input
                  value={draft.phone || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                />
              </Field>
            </div>
          </section>
          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <IdCard className="w-4 h-4" /> {t.licensing || "Licensing"}
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label={t.licenseNo}>
                <Input
                  value={draft.licenseNo || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, licenseNo: e.target.value })
                  }
                />
              </Field>
              <Field label={t.licenseExpiry}>
                <Input
                  type="date"
                  value={draft.licenseExpiry || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, licenseExpiry: e.target.value })
                  }
                />
              </Field>
              <Field label={t.medicalExpiry}>
                <Input
                  type="date"
                  value={draft.medicalExpiry || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, medicalExpiry: e.target.value })
                  }
                />
              </Field>
              <Field label={t.passportNo}>
                <Input
                  value={draft.passportNo || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, passportNo: e.target.value })
                  }
                />
              </Field>
              <Field label={t.passportExpiry}>
                <Input
                  type="date"
                  value={draft.passportExpiry || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, passportExpiry: e.target.value })
                  }
                />
              </Field>
              <Field label={t.ftl28}>
                <Input
                  type="number"
                  value={draft.ftl28 || 0}
                  onChange={(e) =>
                    setDraft({ ...draft, ftl28: +e.target.value })
                  }
                />
              </Field>
            </div>
          </section>

          {/* ═══ Assigned Aircraft Qualifications ═══ */}
          <section className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-600" />
                <span>الطائرات المخصصة / المؤهل عليها (Assigned Aircraft)</span>
              </h4>
              {fleet && fleet.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        assignedAircraft: fleet.map((a) => a.reg).filter(Boolean),
                      })
                    }
                    className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, assignedAircraft: [] })}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              حدد الطائرات التي يطير عليها أو يعمل فيها عضو الطاقم. عند إنشاء رحلة واختيار طائرة، سيتم تصفية الأطقم المؤهلة فقط تلقائياً.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {fleet && fleet.length > 0 ? (
                fleet.map((a) => {
                  const reg = a.reg || "";
                  if (!reg) return null;
                  const isAssigned = (draft.assignedAircraft || []).includes(reg);
                  return (
                    <button
                      key={a.id || reg}
                      type="button"
                      onClick={() => {
                        const cur = Array.isArray(draft.assignedAircraft)
                          ? [...draft.assignedAircraft]
                          : [];
                        const next = isAssigned
                          ? cur.filter((r) => r !== reg)
                          : [...cur, reg];
                        setDraft({ ...draft, assignedAircraft: next });
                      }}
                      className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition cursor-pointer text-xs ${
                        isAssigned
                          ? "bg-sky-50 dark:bg-sky-950/80 border-sky-500 text-sky-900 dark:text-sky-200 font-bold shadow-xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="font-mono font-bold">{reg}</div>
                        {a.type && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {a.type}
                          </div>
                        )}
                      </div>
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0 ${
                          isAssigned
                            ? "bg-sky-600 text-white font-bold"
                            : "border border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isAssigned ? "✓" : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-2 text-xs text-slate-400 italic">
                  لا توجد طائرات مسجلة في الأسطول حالياً. يمكنك إضافة طائرات من شاشة الأسطول.
                </div>
              )}
            </div>

            {/* Selected Summary */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                الطائرات المحددة:{" "}
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {(draft.assignedAircraft || []).length}
                </span>
              </span>
              {(draft.assignedAircraft || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(draft.assignedAircraft || []).map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200"
                    >
                      ✈️ {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      {/* DOCS MODAL */}
      {docsCrew && (
        <Modal
          open={!!docsCrew}
          title={`📎 ${t.attachments || "المستندات"} — ${docsCrew.fullName}`}
          onClose={() => {
            setDocsCrew(null);
            setDocsDraft([]);
          }}
          wide
          footer={
            <>
              <button
                onClick={() => {
                  setDocsCrew(null);
                  setDocsDraft([]);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200"
              >
                {t.cancel || "إغلاق"}
              </button>
              {canDocsEdit && (
                <button
                  onClick={saveDocs}
                  disabled={docsSaving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-2 font-bold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {docsSaving ? "جاري الحفظ..." : t.save || "حفظ المستندات"}
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-slate-800 border flex-shrink-0">
                {docsCrew.avatar ? (
                  <img
                    src={docsCrew.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-2 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  {docsCrew.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t[docsCrew.role] || docsCrew.role} · {docsCrew.empNo}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
                {docsDraft.length} {t.attachments || "مستندات"}
              </span>
            </div>
            {!canDocsEdit && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {t.docs_readonly || "وضع العرض فقط — لا يمكنك تعديل المستندات"}
              </div>
            )}
            {canDocsEdit ? (
              <AttachmentsEditor
                value={docsDraft}
                onChange={(v) => setDocsDraft(v)}
              />
            ) : (
              <ReadOnlyDocsList
                docs={docsDraft}
                canDownload={canDocsDownload}
              />
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              💡{" "}
              {canDocsEdit
                ? t.docsHint ||
                  "أضف المستندات هنا — تُحفظ منفصلة عن معلومات العضو."
                : t.docsReadonlyHint || "للتعديل، تواصل مع المسؤول."}
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE USER MODAL */}
      <Modal
        open={!!createUserCrew}
        title={`Create User — ${createUserCrew?.fullName || ""}`}
        onClose={() => setCreateUserCrew(null)}
        wide
        footer={
          <>
            <button
              onClick={() => setCreateUserCrew(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200"
            >
              {t.cancel}
            </button>
            <button
              onClick={saveNewUser}
              disabled={userSaving}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {userSaving ? "…" : "Create User"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-3 bg-sky-50 dark:bg-sky-950 rounded-lg border border-sky-200 dark:border-sky-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-slate-800 border flex-shrink-0">
              {createUserCrew?.avatar ? (
                <img
                  src={createUserCrew.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-full h-full p-2 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-800 dark:text-slate-100">
                {createUserCrew?.fullName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t[createUserCrew?.role]} · {createUserCrew?.empNo}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label={t.username + " *"}>
              <Input
                value={userDraft.username || ""}
                onChange={(e) =>
                  setUserDraft({
                    ...userDraft,
                    username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                  })
                }
              />
            </Field>
            <Field label={t.assignPassword + " *"}>
              <Input
                value={userDraft.password || ""}
                onChange={(e) =>
                  setUserDraft({ ...userDraft, password: e.target.value })
                }
              />
            </Field>
            <Field label={t.role}>
              <Select
                value={userDraft.role || "crewMember"}
                onChange={(e) =>
                  setUserDraft({ ...userDraft, role: e.target.value })
                }
              >
                <option value="superAdmin">👑 Super Admin</option>
                <option value="dispatcher">📋 Dispatcher</option>
                <option value="captain">✈️ Captain</option>
                <option value="camo">🔧 CAMO</option>
                <option value="crewMember">👤 Crew Member</option>
              </Select>
            </Field>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">
              ⚠️ بيانات الدخول
            </div>
            <div className="text-sm font-mono text-amber-900 dark:text-amber-100 space-y-1">
              <div>
                <b>Username:</b> {userDraft.username || "—"}
              </div>
              <div>
                <b>Password:</b> {userDraft.password || "—"}
              </div>
              <div>
                <b>Role:</b> {userDraft.role || "—"}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* READ-ONLY DOCS LIST */
function ReadOnlyDocsList({ docs = [], canDownload = false }) {
  const t = useT();
  if (docs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
        <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <div>{t.noData || "لا توجد مستندات"}</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc, idx) => {
        const name = doc.name || doc.fileName || `Document ${idx + 1}`;
        const url = doc.url || doc.fileUrl || doc.data || "";
        const size = doc.size ? formatFileSize(doc.size) : "";
        const type = doc.type || doc.mimeType || doc.mime || "";
        const st = docStatus(doc.expiry);
        const days = daysUntil(doc.expiry);
        const colorCls = getStatusColor(st);
        const cardBg =
          st === "expired"
            ? "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800"
            : st === "critical"
            ? "bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800"
            : st === "expiring"
            ? "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700";
        return (
          <div
            key={idx}
            className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${cardBg}`}
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
              <Paperclip className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                {name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {type && <span className="font-mono">{type}</span>}
                {size && <span> · {size}</span>}
              </div>
              {doc.expiry && days !== null && (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    📅 {String(doc.expiry).slice(0, 10)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${colorCls}`}
                  >
                    {days < 0
                      ? `منتهي منذ ${Math.abs(days)} يوم`
                      : days === 0
                      ? "ينتهي اليوم"
                      : `${days} يوم متبقٍ`}
                  </span>
                </div>
              )}
            </div>
            {canDownload && url ? (
              <a
                href={url}
                download={name}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 hover:bg-sky-200 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" /> {t.download || "تحميل"}
              </a>
            ) : (
              <span className="text-[10px] text-slate-400 italic">
                {t.noDownloadPerm || "بدون تحميل"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Crew;
