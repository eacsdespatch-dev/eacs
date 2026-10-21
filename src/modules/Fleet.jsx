/* ═══════════════════════════════════════════════════════════
 * FLEET MODULE — Permission-aware (Info + Docs + Expiry)
 * v3.3 — saveDocs بدون JSON.stringify (fleetAPI تتولى التحويل)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  Check,
  Plane,
  Save,
  Paperclip,
  Eye,
  FileDown,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { AircraftStatusBadge } from "../components/ui/AircraftStatusBadge";
import { AttachmentsEditor } from "../components/AttachmentsEditor";
import { fleetAPI } from "../api";
import { logSafe } from "../utils/audit";
import {
  fmtDate,
  docStatus,
  daysUntil,
  formatFileSize,
  getStatusColor,
} from "../utils/helpers";
import { AIRCRAFT_STATUSES } from "../config/constants";
import { can as checkPerm } from "../config/permissions";
import { useLocalStorage } from "../hooks/useLocalStorage";

function getDocs(a) {
  let att = a.attachments || [];
  if (typeof att === "string") {
    try {
      att = JSON.parse(att);
    } catch {
      att = [];
    }
  }
  return Array.isArray(att) ? att : [];
}

export function Fleet({ fleet, setFleet, lang = "en", setSyncStatus }) {
  const t = useT();
  const { user } = useAuth();

  const canCreate = checkPerm(user, "fleet.create");
  const canEdit = checkPerm(user, "fleet.edit");
  const canDelete = checkPerm(user, "fleet.delete");
  const canDocsView = checkPerm(user, "fleet.docs");
  const canDocsEdit = checkPerm(user, "fleet.docs_edit");
  const canDocsDownload = checkPerm(user, "fleet.docs_download");

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [docsAcft, setDocsAcft] = useState(null);
  const [docsDraft, setDocsDraft] = useState([]);
  const [docsSaving, setDocsSaving] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage("aeroops.fleetView", "cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredFleet = fleet.filter((a) => {
    const matchesSearch =
      !search || (a.reg + a.type).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openNew = () => {
    if (!canCreate) return;
    setDraft({
      reg: "",
      type: "",
      status: "AIRWORTHY",
      tah: 0,
      tac: 0,
      lastCheck: "",
      nextCheck: "",
      attachments: [],
    });
    setEditing("new");
  };

  const openEdit = (a) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل");
      return;
    }
    setDraft({
      ...a,
      lastCheck: a.lastCheck ? String(a.lastCheck).slice(0, 10) : "",
      nextCheck: a.nextCheck ? String(a.nextCheck).slice(0, 10) : "",
    });
    setEditing(a.id);
  };

  const save = async () => {
    if (editing === "new" && !canCreate) {
      alert("⚠️ ليس لديك صلاحية إضافة");
      return;
    }
    if (editing !== "new" && !canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل");
      return;
    }
    if (!draft.reg) return;
    setSyncStatus?.("syncing");
    try {
      if (editing === "new") {
        const created = await fleetAPI.create({ ...draft, attachments: [] });
        setFleet([...fleet, { ...draft, id: created.id, attachments: [] }]);
        logSafe(user, "CREATE", "Fleet", created.id, draft.reg, {
          reg: draft.reg,
          type: draft.type,
        });
      } else {
        const before = fleet.find((a) => a.id === editing);
        const updated = { ...draft, attachments: before?.attachments || [] };
        await fleetAPI.update(editing, updated);
        setFleet(
          fleet.map((a) => (a.id === editing ? { ...updated, id: editing } : a))
        );
        logSafe(user, "UPDATE", "Fleet", editing, draft.reg, {
          before: { status: before?.status },
          after: { status: draft.status },
        });
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
    const aircraft = fleet.find((a) => a.id === id);
    try {
      await fleetAPI.remove(id);
      setFleet(fleet.filter((a) => a.id !== id));
      logSafe(user, "DELETE", "Fleet", id, aircraft?.reg || "", {});
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const openDocs = (a) => {
    if (!canDocsView) {
      alert("⚠️ ليس لديك صلاحية عرض المستندات");
      return;
    }
    setDocsAcft(a);
    setDocsDraft(getDocs(a));
  };

  /* ⭐ التعديل: إرسال docsDraft كمصفوفة — fleetAPI تتولى التحويل */
  const saveDocs = async () => {
    if (!canDocsEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل المستندات");
      return;
    }
    if (!docsAcft) return;
    setDocsSaving(true);
    try {
      const updated = { ...docsAcft, attachments: docsDraft }; // ← array
      await fleetAPI.update(docsAcft.id, updated);
      setFleet(fleet.map((a) => (a.id === docsAcft.id ? { ...updated } : a)));
      logSafe(user, "UPDATE", "Fleet (Documents)", docsAcft.id, docsAcft.reg, {
        count: docsDraft.length,
      });
      setDocsAcft(null);
      setDocsDraft([]);
      alert("✅ " + (t.saved || "تم الحفظ"));
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setDocsSaving(false);
    }
  };

  const hasAnyAction = canEdit || canDocsView || canDelete || canCreate;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {t.fleet}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fleet.length} {t.aircraft || "aircraft"}
              </p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" /> {t.addAircraft}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="ps-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">{t.allStatuses}</option>
            {AIRCRAFT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {lang === "ar" ? s.ar : s.en}
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
        </div>
      </div>

      {!hasAnyAction && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <Eye className="w-4 h-4" /> ⚠️ لديك صلاحية العرض فقط — لا يمكنك تعديل
          أو إضافة أو حذف
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFleet.map((a) => {
            const docs = getDocs(a);
            return (
              <div
                key={a.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg text-slate-800 dark:text-slate-100">
                      {a.reg}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {a.type}
                    </div>
                  </div>
                  <AircraftStatusBadge status={a.status} lang={lang} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      {t.tah || "TAH"}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {a.tah?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      {t.tac || "TAC"}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {a.tac?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      {t.lastCheck || "Last Check"}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {fmtDate(a.lastCheck)}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      {t.nextCheck || "Next Check"}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {fmtDate(a.nextCheck)}
                    </div>
                  </div>
                </div>
                {hasAnyAction && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {canEdit && (
                      <button
                        onClick={() => openEdit(a)}
                        className="flex-1 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-1 font-bold"
                      >
                        <Edit className="w-3.5 h-3.5" /> {t.edit || "تعديل"}
                      </button>
                    )}
                    {canDocsView && (
                      <button
                        onClick={() => openDocs(a)}
                        className="relative flex-1 py-2 rounded-lg bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center gap-1 font-bold"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {t.attachments || "مستندات"}
                        {docs.length > 0 && (
                          <span className="absolute -top-1.5 -end-1.5 bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {docs.length}
                          </span>
                        )}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(a.id)}
                        className="py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "table" && (
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {[
                  "#",
                  t.registration,
                  t.type,
                  t.status,
                  t.tah,
                  t.tac,
                  t.lastCheck,
                  t.nextCheck,
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
              {filteredFleet.map((a, idx) => {
                const docs = getDocs(a);
                return (
                  <tr
                    key={a.id}
                    className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">
                      {a.reg}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {a.type}
                    </td>
                    <td className="px-3 py-2">
                      <AircraftStatusBadge status={a.status} lang={lang} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {a.tah?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {a.tac?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {fmtDate(a.lastCheck)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {fmtDate(a.nextCheck)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {canDocsView ? (
                        <button
                          onClick={() => openDocs(a)}
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
                              onClick={() => openEdit(a)}
                              className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                              title={t.edit}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => remove(a.id)}
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

      {viewMode === "list" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filteredFleet.map((a) => {
            const docs = getDocs(a);
            return (
              <div
                key={a.id}
                className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {a.reg}{" "}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({a.type})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    TAH: {a.tah?.toLocaleString()} · TAC:{" "}
                    {a.tac?.toLocaleString()}
                  </div>
                </div>
                <AircraftStatusBadge status={a.status} lang={lang} />
                {canDocsView && (
                  <button
                    onClick={() => openDocs(a)}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Paperclip className="w-3 h-3" /> {docs.length}
                  </button>
                )}
                {hasAnyAction && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(a.id)}
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

      <Modal
        open={!!editing}
        title={editing === "new" ? t.addAircraft : t.editAircraft}
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
          <div className="grid md:grid-cols-2 gap-3">
            <Field label={t.registration}>
              <Input
                value={draft.reg || ""}
                onChange={(e) => setDraft({ ...draft, reg: e.target.value })}
              />
            </Field>
            <Field label={t.type}>
              <Input
                value={draft.type || ""}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              />
            </Field>
            <Field label={t.status} span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AIRCRAFT_STATUSES.map((s) => {
                  const active = draft.status === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setDraft({ ...draft, status: s.key })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-start ${
                        active
                          ? `${s.color} ring-2 ring-offset-1 ring-slate-400`
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: s.dot }}
                      />
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                        {lang === "ar" ? s.ar : s.en}
                      </span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t.tah}>
              <Input
                type="number"
                value={draft.tah || 0}
                onChange={(e) => setDraft({ ...draft, tah: +e.target.value })}
              />
            </Field>
            <Field label={t.tac}>
              <Input
                type="number"
                value={draft.tac || 0}
                onChange={(e) => setDraft({ ...draft, tac: +e.target.value })}
              />
            </Field>
            <Field label={t.lastCheck}>
              <Input
                type="date"
                value={draft.lastCheck || ""}
                onChange={(e) =>
                  setDraft({ ...draft, lastCheck: e.target.value })
                }
              />
            </Field>
            <Field label={t.nextCheck}>
              <Input
                type="date"
                value={draft.nextCheck || ""}
                onChange={(e) =>
                  setDraft({ ...draft, nextCheck: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </Modal>

      {docsAcft && (
        <Modal
          open={!!docsAcft}
          title={`📎 ${t.aircraftDocs || "مستندات الطائرة"} — ${docsAcft.reg}`}
          onClose={() => {
            setDocsAcft(null);
            setDocsDraft([]);
          }}
          wide
          footer={
            <>
              <button
                onClick={() => {
                  setDocsAcft(null);
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
                  {docsSaving ? "…" : t.save || "حفظ"}
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  {docsAcft.reg}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {docsAcft.type}
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
                  "أضف المستندات هنا — تُحفظ منفصلة عن معلومات الطائرة."
                : t.docsReadonlyHint || "للتعديل، تواصل مع المسؤول."}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

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

export default Fleet;
