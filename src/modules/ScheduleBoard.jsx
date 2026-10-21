/* ═══════════════════════════════════════════════════════════
 * SCHEDULE BOARD — Main flights table
 * v2.2 — Permissions + no PAX column + short crew codes
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  Save,
  MoreVertical,
  Eye,
  Copy,
  X,
  CheckCircle2,
  Plane,
  Send,
  Mail,
  ExternalLink,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { AirportInput } from "../components/AirportInput";
import { FlightContextMenu } from "../components/FlightContextMenu";
import { FlightNotesModal } from "../components/FlightNotesModal";
import { CompleteFlightModal } from "../components/CompleteFlightModal";
import { FlightDetailsModal } from "../components/FlightDetailsModal";
import { CalendarView } from "./CalendarView";
import { TimelineView } from "./TimelineView";
import {
  flightsAPI,
  sendFlightEmail,
  sendEmail,
  createGmailWebUrl,
  createMailtoUrl,
  checkExpiryAlerts,
} from "../api";
import { logSafe } from "../utils/audit";
import { can as checkPerm } from "../config/permissions";
import {
  fmtTime,
  fmtDateParts,
  todayISO,
  safeArray,
  safeObject,
} from "../utils/helpers";
import {
  POSITION_ROLE_MAP,
  POSITION_OPTIONS,
  FLIGHT_TYPES,
  getFlightType,
} from "../config/constants";

const STATUS_LIST = [
  "SCHEDULED",
  "BOARDING",
  "DELAYED",
  "DEPARTED",
  "ARRIVED",
  "CANCELLED",
];

export function ScheduleBoard({
  flights,
  setFlights,
  crew,
  fleet,
  onGenDec,
  setSyncStatus,
}) {
  const t = useT();
  const { user } = useAuth();

  /* ⭐ الصلاحيات */
  const canView = checkPerm(user, "schedule.view");
  const canCreate = checkPerm(user, "schedule.create");
  const canEdit = checkPerm(user, "schedule.edit");
  const canDelete = checkPerm(user, "schedule.delete");
  const canAssignCrew = checkPerm(user, "schedule.assign_crew");
  const canComplete = checkPerm(user, "schedule.complete");
  const canGenDec = checkPerm(user, "schedule.gendec");
  const canNotes = checkPerm(user, "schedule.notes");

  /* ═══ State ═══ */
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [viewMode, setViewMode] = useState("table");
  const [showFilters, setShowFilters] = useState(false);
  const [detailsFlight, setDetailsFlight] = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [timeMode, setTimeMode] = useState("UTC");
  const [rangeDays, setRangeDays] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [acftFilter, setAcftFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [completeFlight, setCompleteFlight] = useState(null);
  const [notesModal, setNotesModal] = useState(null);
  const [filterCrewByAcft, setFilterCrewByAcft] = useState(true);
  const [emailModal, setEmailModal] = useState(null);
  const [expiryAlertModal, setExpiryAlertModal] = useState(null);

  /* ⭐ Helper — قراءة الطائرات المخصصة لعضو الطاقم */
  const getCrewAircraft = (member) => {
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

  /* ═══ Helpers ═══ */
  const now = new Date();
  const getFlightTime = (f) => (f.std ? new Date(f.std) : null);

  const isUpcoming = (f) => {
    const ft = getFlightTime(f);
    return ft ? ft.getTime() > now.getTime() - 30 * 60 * 1000 : false;
  };

  const isPast = (f) => {
    const ft = getFlightTime(f);
    return ft ? ft.getTime() <= now.getTime() - 30 * 60 * 1000 : false;
  };

  const getDateRange = () => {
    const start = new Date(selectedDate + "T00:00:00Z");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + rangeDays);
    return { start, end };
  };

  const isInRange = (f) => {
    const ft = getFlightTime(f);
    if (!ft) return false;
    const { start, end } = getDateRange();
    return ft >= start && ft < end;
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goToday = () => setSelectedDate(todayISO());

  /* ═══ Filtering ═══ */
  const filtered = flights
    .filter((f) => {
      if (!isInRange(f)) return false;
      const matchesSearch =
        !q ||
        (f.flightNo + f.dep + f.arr + (f.acft || ""))
          .toLowerCase()
          .includes(q.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      if (acftFilter && f.acft !== acftFilter) return false;
      if (typeFilter && f.flightType !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = getFlightTime(a)?.getTime() || 0;
      const tb = getFlightTime(b)?.getTime() || 0;
      return ta - tb;
    });

  const counters = {
    all: flights.filter(isInRange).length,
    upcoming: flights.filter((f) => isInRange(f) && isUpcoming(f)).length,
    past: flights.filter((f) => isInRange(f) && isPast(f)).length,
  };

  /* ⭐ Crew by position */
  const crewByPosDetailed = (f, pos) => {
    const slots = safeArray(f.crewSlots).filter((s) => s.position === pos);
    return slots
      .map((s) => crew.find((x) => x.id === s.crewId))
      .filter(Boolean);
  };

  /* ⭐ كود مختصر */
  const getShortCode = (member) => {
    if (!member) return "—";
    if (member.empNo) {
      return String(member.empNo).slice(-5);
    }
    const nameParts = (member.fullName || "").trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].slice(0, 3).toUpperCase();
    }
    const first = nameParts[0][0] || "";
    const last = nameParts[nameParts.length - 1].slice(0, 3) || "";
    return `${first}.${last}`.toUpperCase();
  };

  /* ⭐ كود مختصر مع لون حسب الدور */
  const getShortCodeWithColor = (member) => {
    if (!member) return null;
    const code = getShortCode(member);
    const colorMap = {
      captain:
        "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700",
      firstOfficer:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700",
      observer:
        "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700",
      flightAttendant:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
      fa1: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
      fa2: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
      engineer:
        "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
      security:
        "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-200 dark:border-rose-700",
      loadmaster:
        "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-700",
    };
    return {
      code,
      color:
        colorMap[member.role] ||
        "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
    };
  };

  /* ═══ Selection ═══ */
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((f) => f.id));
    }
  };

  /* ═══ CRUD ═══ */
  const openNew = () => {
    if (!canCreate) {
      alert("⚠️ ليس لديك صلاحية إنشاء رحلات");
      return;
    }
    setDraft({
      flightNo: "",
      dep: "",
      arr: "",
      altn: "",
      altn2: "",
      std: "",
      sta: "",
      acft: "",
      status: "SCHEDULED",
      flightType: "SCHEDULED",
      notes: "",
      permits: "",
      services: "",
      pax: 0,
      cargo: 0,
      crewSlots: [],
    });
    setEditing("new");
  };

  const openEdit = (f) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل الرحلات");
      return;
    }
    setDraft({
      ...f,
      std: f.std ? String(f.std).slice(0, 16) : "",
      sta: f.sta ? String(f.sta).slice(0, 16) : "",
      flightType: f.flightType || "SCHEDULED",
      notes: f.notes || "",
      permits: f.permits || "",
      services: f.services || "",
      crewSlots: safeArray(f.crewSlots),
      actual: safeObject(f.actual),
    });
    setEditing(f.id);
  };

  const save = async () => {
    /* ⭐ فحص الصلاحيات */
    if (editing === "new" && !canCreate) {
      alert("⚠️ ليس لديك صلاحية إنشاء رحلات");
      return;
    }
    if (editing !== "new" && !canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل الرحلات");
      return;
    }
    if (!draft.flightNo) return;

    setSyncStatus?.("syncing");
    try {
      if (editing === "new") {
        const created = await flightsAPI.create(draft);
        setFlights([...flights, { ...draft, id: created.id }]);
        logSafe(user, "CREATE", "Flight", created.id, draft.flightNo, {
          flightNo: draft.flightNo,
          dep: draft.dep,
          arr: draft.arr,
        });
      } else {
        const before = flights.find((f) => f.id === editing);
        await flightsAPI.update(editing, draft);
        setFlights(
          flights.map((f) => (f.id === editing ? { ...draft, id: editing } : f))
        );
        logSafe(user, "UPDATE", "Flight", editing, draft.flightNo, {
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
    /* ⭐ فحص الصلاحية */
    if (!canDelete) {
      alert("⚠️ ليس لديك صلاحية حذف الرحلات");
      return;
    }
    if (!confirm(t.confirmDelete)) return;
    const flight = flights.find((f) => f.id === id);
    try {
      await flightsAPI.remove(id);
      setFlights(flights.filter((f) => f.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      logSafe(user, "DELETE", "Flight", id, flight?.flightNo || "", {});
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  /* ⭐ حفظ الملاحظات */
  const saveNotesAndPermits = async (flightId, data) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل الملاحظات");
      throw new Error("No permission");
    }
    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;
    try {
      await flightsAPI.update(flightId, {
        ...flight,
        notes: data.notes || "",
        permits: data.permits || "",
        services: data.services || "",
      });
      setFlights(
        flights.map((f) =>
          f.id === flightId
            ? {
                ...f,
                notes: data.notes || "",
                permits: data.permits || "",
                services: data.services || "",
              }
            : f
        )
      );
      logSafe(user, "UPDATE", "Flight (Notes)", flightId, flight.flightNo, {
        notes: (data.notes || "").substring(0, 50),
      });
    } catch (e) {
      alert("Save failed: " + e.message);
      throw e;
    }
  };

  /* ⭐ إجراءات جماعية */
  const bulkAction = async (action) => {
    /* ⭐ فحص الصلاحيات */
    if (action === "delete" && !canDelete) {
      alert("⚠️ ليس لديك صلاحية حذف الرحلات");
      return;
    }
    if (action === "complete" && !canEdit) {
      alert("⚠️ ليس لديك صلاحية إكمال الرحلات");
      return;
    }
    if (action === "gendec" && !canView) {
      alert("⚠️ ليس لديك صلاحية GenDec");
      return;
    }

    if (selectedIds.length === 0) {
      alert(t.selectAll || "⚠️ الرجاء تحديد رحلة واحدة على الأقل");
      return;
    }

    const selectedFlights = flights.filter((f) => selectedIds.includes(f.id));

    if (action === "delete") {
      if (!confirm(`${t.delete} ${selectedFlights.length}?`)) return;
      try {
        for (const f of selectedFlights) {
          await flightsAPI.remove(f.id);
          logSafe(user, "DELETE", "Flight", f.id, f.flightNo, {});
        }
        setFlights(flights.filter((f) => !selectedIds.includes(f.id)));
        setSelectedIds([]);
      } catch (e) {
        alert("Delete failed: " + e.message);
      }
      return;
    }

    if (action === "complete") {
      for (const f of selectedFlights) {
        try {
          await flightsAPI.update(f.id, { ...f, status: "ARRIVED" });
          logSafe(user, "UPDATE", "Flight (JL)", f.id, f.flightNo, {
            action: "Bulk complete",
          });
        } catch (e) {
          console.error(e);
        }
      }
      setFlights(
        flights.map((f) =>
          selectedIds.includes(f.id) ? { ...f, status: "ARRIVED" } : f
        )
      );
      setSelectedIds([]);
      return;
    }

    if (action === "gendec") {
      for (const f of selectedFlights) {
        onGenDec(f);
      }
      return;
    }
  };

  /* ⭐ Crew Slots */
  const addSlot = () => {
    if (!canAssignCrew && !canEdit) {
      alert("⚠️ ليس لديك صلاحية تعيين طاقم");
      return;
    }
    setDraft({
      ...draft,
      crewSlots: [
        ...safeArray(draft.crewSlots),
        { crewId: "", position: "captain" },
      ],
    });
  };

  const updateSlot = (i, patch) => {
    const list = [...safeArray(draft.crewSlots)];
    list[i] = { ...list[i], ...patch };

    if (patch.position && list[i].crewId) {
      const member = crew.find((c) => c.id === list[i].crewId);
      const allowed = POSITION_ROLE_MAP[patch.position] || [];
      if (member && !allowed.includes(member.role)) {
        list[i].crewId = "";
      }
    }

    setDraft({ ...draft, crewSlots: list });
  };

  const removeSlot = (i) =>
    setDraft({
      ...draft,
      crewSlots: safeArray(draft.crewSlots).filter((_, idx) => idx !== i),
    });

  /* ⭐ Complete Flight */
  const saveCompleteFlight = async (updatedFlight) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية إكمال الرحلات");
      throw new Error("No permission");
    }
    setSyncStatus?.("syncing");
    try {
      await flightsAPI.update(updatedFlight.id, updatedFlight);
      setFlights(
        flights.map((f) => (f.id === updatedFlight.id ? updatedFlight : f))
      );
      logSafe(
        user,
        "UPDATE",
        "Flight (JL)",
        updatedFlight.id,
        updatedFlight.flightNo,
        { action: "Complete Journey Log" }
      );
      setSyncStatus?.("synced");
    } catch (e) {
      alert("Save failed: " + e.message);
      setSyncStatus?.("error");
      throw e;
    }
  };

  /* ⭐ Context Menu */
  const handleContextMenu = (e, flight) => {
    e.preventDefault();

    /* ⭐ إذا لا توجد أي صلاحية — لا تظهر القائمة */
    const hasAnyPerm = canView || canEdit || canDelete;
    if (!hasAnyPerm) return;

    if (selectedIds.includes(flight.id) && selectedIds.length > 0) {
      setContextMenu({
        bulk: true,
        ids: selectedIds,
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      setContextMenu({ flight, x: e.clientX, y: e.clientY });
    }
  };

  const updateFlightStatus = async (flightId, newStatus) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل الرحلات");
      return;
    }
    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;
    setSyncStatus?.("syncing");
    try {
      const updated = { ...flight, status: newStatus };
      await flightsAPI.update(flightId, updated);
      setFlights(flights.map((f) => (f.id === flightId ? updated : f)));
      logSafe(user, "UPDATE", "Flight (Status)", flightId, flight.flightNo, {
        status: newStatus,
      });
      setSyncStatus?.("synced");
    } catch (e) {
      alert("Status update failed: " + e.message);
      setSyncStatus?.("error");
    }
  };

  const bulkChangeStatus = async (newStatus) => {
    if (!canEdit) {
      alert("⚠️ ليس لديك صلاحية تعديل الرحلات");
      return;
    }
    const selectedFlights = flights.filter((f) => selectedIds.includes(f.id));
    setSyncStatus?.("syncing");
    try {
      for (const f of selectedFlights) {
        await flightsAPI.update(f.id, { ...f, status: newStatus });
        logSafe(user, "UPDATE", "Flight (Status)", f.id, f.flightNo, {
          status: newStatus,
        });
      }
      setFlights(
        flights.map((f) =>
          selectedIds.includes(f.id) ? { ...f, status: newStatus } : f
        )
      );
      setSelectedIds([]);
      setSyncStatus?.("synced");
    } catch (e) {
      alert("Bulk status update failed: " + e.message);
      setSyncStatus?.("error");
    }
  };

  const duplicateFlight = async (flight) => {
    if (!canCreate) {
      alert("⚠️ ليس لديك صلاحية إنشاء رحلات");
      return;
    }
    const newFlightData = {
      ...flight,
      flightNo: `${flight.flightNo}-COPY`,
      id: undefined,
      actual: {},
      status: "SCHEDULED",
    };
    setSyncStatus?.("syncing");
    try {
      const created = await flightsAPI.create(newFlightData);
      setFlights([...flights, { ...newFlightData, id: created.id }]);
      logSafe(user, "CREATE", "Flight (Duplicate)", created.id, newFlightData.flightNo, {});
      setSyncStatus?.("synced");
    } catch (e) {
      alert("Duplicate failed: " + e.message);
      setSyncStatus?.("error");
    }
  };

  const handleSendFlightEmail = (flight) => {
    if (!flight) return;
    const slots = safeArray(flight.crewSlots);
    const assignedCrew = slots
      .map((slot) => {
        const member = crew.find((c) => String(c.id) === String(slot.crewId));
        return {
          position: slot.position,
          member,
          name: member?.fullName || slot.crewName || "عضو طاقم",
          email: member?.email || "",
          empNo: member?.empNo || "",
        };
      })
      .filter(Boolean);

    const validEmails = assignedCrew
      .map((c) => c.email)
      .filter((em) => em && em.includes("@"));

    const dateStr = flight.std ? String(flight.std).slice(0, 10) : "";
    const subject = `✈️ تفاصيل الرحلة ${flight.flightNo || ""} (${flight.dep || ""} ➔ ${flight.arr || ""}) — ${dateStr}`;

    const manifestLines = assignedCrew
      .map(
        (c) =>
          `• ${c.position || "CREW"}: ${c.name} (${c.empNo || "—"})${c.email ? " <" + c.email + ">" : " [بدون بريد]"}`
      )
      .join("\n");

    const body = `السلام عليكم ورحمة الله،
تحية طيبة، مرفق إليكم تفاصيل الرحلة المجدولة:

════════════════════════════════════════
📋 بيانات الرحلة / FLIGHT BRIEFING
════════════════════════════════════════
• رقم الرحلة: ${flight.flightNo || "—"}
• مسار الرحلة: ${flight.dep || "—"} ➔ ${flight.arr || "—"}
• المطار البديل: ${flight.altn || "—"}${flight.altn2 ? ` / ${flight.altn2}` : ""}
• تاريخ الرحلة: ${dateStr || "—"}
• الإقلاع المجدول (STD): ${flight.std ? String(flight.std).replace("T", " ") + " UTC" : "—"}
• الوصول المجدول (STA): ${flight.sta ? String(flight.sta).replace("T", " ") + " UTC" : "—"}
• الطائرة: ${flight.acft || "—"}
• نوع الرحلة: ${flight.flightType || "SCHEDULED"}
• حالة الرحلة: ${flight.status || "SCHEDULED"}
• الركاب (PAX): ${flight.pax || 0}
• الشحن (Cargo): ${flight.cargo || 0} kg

════════════════════════════════════════
👥 طاقم الرحلة المكلف / CREW MANIFEST
════════════════════════════════════════
${manifestLines || "لم يتم تعيين أطقم بعد"}

${flight.notes ? `\n📝 ملاحظات إضافية:\n${flight.notes}` : ""}
${flight.permits ? `\n📑 التصاريح:\n${flight.permits}` : ""}

نتمنى لكم رحلة آمنة وموفقة.
${user?.fullName || "Operations Control Center (OCC)"}
AeroOps Flight Dispatch`;

    setEmailModal({
      flight,
      assignedCrew,
      emails: validEmails,
      toInput: validEmails.join(", "),
      subject,
      body,
      sending: false,
      sent: false,
      copied: false,
      error: null,
    });
  };

  const doSendServerEmail = async () => {
    if (!emailModal) return;
    const toList = emailModal.toInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));

    if (toList.length === 0) {
      alert("⚠️ يرجى إدخال بريد إلكتروني صالح واحد على الأقل");
      return;
    }

    setEmailModal((prev) => ({ ...prev, sending: true, error: null }));
    try {
      await sendEmail({
        to: toList,
        subject: emailModal.subject,
        body: emailModal.body,
      });
      setEmailModal((prev) => ({ ...prev, sending: false, sent: true }));
    } catch (err) {
      console.warn("Server email dispatch error:", err.message);
      setEmailModal((prev) => ({
        ...prev,
        sending: false,
        error: `تعذر الإرسال التلقائي عبر الخادم (${err.message}). يمكنك استخدام زر Gmail أو تطبيق البريد أدناه للإرسال بضغطة واحدة وبكامل التفاصيل الجاهزة.`,
      }));
    }
  };

  const handleSendExpiryAlerts = async () => {
    setExpiryAlertModal({ loading: true, result: null, error: null });
    try {
      const res = await checkExpiryAlerts();
      setExpiryAlertModal({ loading: false, result: res, error: null });
    } catch (e) {
      setExpiryAlertModal({ loading: false, result: null, error: e.message });
    }
  };

  const handleContextAction = (action, flight, extraData) => {
    if (action === "view_details") {
      setDetailsFlight(flight);
      return;
    }
    if (action === "send_flight_email") {
      handleSendFlightEmail(flight);
      return;
    }
    if (action === "send_expiry_alerts") {
      handleSendExpiryAlerts();
      return;
    }
    if (action === "open_notes_modal") {
      setNotesModal(flight);
      return;
    }
    if (action === "edit") {
      openEdit(flight);
      return;
    }
    if (action === "delete") {
      remove(flight.id);
      return;
    }
    if (action === "complete_flight") {
      setCompleteFlight(flight);
      return;
    }
    if (action === "gendec") {
      onGenDec(flight);
      return;
    }
    if (action === "change_status" && extraData) {
      updateFlightStatus(flight.id, extraData);
      return;
    }
    if (action === "duplicate") {
      duplicateFlight(flight);
      return;
    }
    if (action === "bulk_complete") {
      bulkAction("complete");
      return;
    }
    if (action === "bulk_gendec") {
      bulkAction("gendec");
      return;
    }
    if (action === "bulk_change_status" && extraData) {
      bulkChangeStatus(extraData);
      return;
    }
    if (action === "bulk_delete") {
      bulkAction("delete");
      return;
    }
    if (action === "bulk_deselect") {
      setSelectedIds([]);
      return;
    }
  };

  /* ⭐ Date Label */
  const selectedDateObj = new Date(selectedDate + "T00:00:00Z");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dateLabel = `${selectedDateObj.getUTCDate()} ${
    months[selectedDateObj.getUTCMonth()]
  } ${selectedDateObj.getUTCFullYear()}`;

  /* ⭐ [استمرار من الجزء 1] */

  return (
    <div className="space-y-2">
      {/* ═══ TOOLBAR ═══ */}
      <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-b from-sky-50 dark:from-slate-900 to-white dark:to-slate-800">
          {/* View Tabs */}
          <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
            {[
              { id: "table", label: `📋 ${t.table || "TABLE"}` },
              { id: "calendar", label: `📅 ${t.calendar || "CALENDAR"}` },
              { id: "timeline", label: `📊 ${t.timeline || "TIMELINE"}` },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 text-xs font-bold border-s first:border-s-0 border-slate-300 dark:border-slate-600 ${
                  viewMode === v.id
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Date */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
          />

          {/* Navigation */}
          <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-800">
            <button
              onClick={() => shiftDate(-rangeDays)}
              className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"
            >
              ◀
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-slate-700 text-xs font-bold text-sky-700 dark:text-sky-300 border-x border-slate-300 dark:border-slate-600"
            >
              {t.today}
            </button>
            <button
              onClick={() => shiftDate(rangeDays)}
              className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs"
            >
              ▶
            </button>
          </div>

          {/* UTC/Local */}
          <button
            onClick={() => setTimeMode((m) => (m === "UTC" ? "LOCAL" : "UTC"))}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-xs"
          >
            <span
              className={`font-bold ${
                timeMode === "UTC"
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {timeMode}
            </span>
            <span>▼</span>
          </button>

          {/* Range */}
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(+e.target.value)}
            className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none"
          >
            <option value={1}>1 {t.day || "day"}</option>
            <option value={3}>3</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>

          {/* ACFT */}
          <select
            value={acftFilter}
            onChange={(e) => setAcftFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none max-w-[120px]"
          >
            <option value="">✈️ {t.allAircraft || "ALL ACFT"}</option>
            {fleet.map((a) => (
              <option key={a.id} value={a.reg}>
                {a.reg}
              </option>
            ))}
          </select>

          {/* Flight Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none"
          >
            <option value="">🚀 {t.allTypes || "ALL TYPES"}</option>
            {FLIGHT_TYPES.map((ft) => (
              <option key={ft.key} value={ft.key}>
                {ft.icon} {t[ft.key.toLowerCase()] || ft.ar || ft.en || ft.key}
              </option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold ${
              showFilters
                ? "bg-sky-700 text-white"
                : "bg-sky-500 text-white hover:bg-sky-600"
            }`}
          >
            🔽 {t.filter}
          </button>

          {/* New — فقط مع صلاحية */}
          {canCreate && (
            <button
              onClick={openNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold ms-auto"
            >
              <Plus className="w-3.5 h-3.5" /> {t.add}
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {t.search}
              </label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.searchFlights}
                  className="w-full ps-7 pe-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {t.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="">{t.allStatuses}</option>
                {STATUS_LIST.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end md:col-span-2">
              <button
                onClick={() => {
                  setQ("");
                  setStatusFilter("");
                  setAcftFilter("");
                  setTypeFilter("");
                }}
                className="w-full px-3 py-1.5 bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded text-xs font-bold"
              >
                ✖ {t.clear}
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-3 py-1.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {t.standbyUpcoming || "Upcoming"} ({counters.upcoming})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            {t.standbyPast || "Past"} ({counters.past})
          </span>
          {selectedIds.length > 0 && (
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold">
              ✓ {selectedIds.length} {t.selected || ""}
            </span>
          )}
          <span className="ms-auto font-bold text-slate-700 dark:text-slate-200">
            {t.showing} {filtered.length} / {counters.all}
          </span>
          <span className="text-sky-600 dark:text-sky-400 font-bold">
            {t.rightClickHint}
          </span>
        </div>
      </div>

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === "table" && (
        <div className="overflow-x-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg">
          <table
            className="w-full text-xs"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            <thead className="bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 border-b-2 border-slate-400 dark:border-slate-700">
              <tr className="text-slate-700 dark:text-slate-200">
                {/* Status dot */}
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 w-8"></th>

                {/* Checkbox */}
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 w-8 text-center">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 cursor-pointer"
                    checked={
                      filtered.length > 0 &&
                      selectedIds.length === filtered.length
                    }
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          selectedIds.length > 0 &&
                          selectedIds.length < filtered.length;
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>

                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-start font-bold">
                  {t.flightNo}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.type}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.day}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-start font-bold">
                  {t.date}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  STD
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-start font-bold">
                  ADEP
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-start font-bold">
                  ADES
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  STA
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  ACFT
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.captain || "CPT"}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.firstOfficer || "FO"}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.fa1 || "FA1"}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.fa2 || "FA2"}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.engineer || "ENG"}
                </th>
                <th className="px-2 py-2 border-e border-slate-300 dark:border-slate-700 text-center font-bold">
                  {t.security || "SEC"}
                </th>
                <th className="px-2 py-2 text-start font-bold min-w-[150px] border-e border-slate-300 dark:border-slate-700">
                  📝 {t.notes}
                </th>
                <th className="px-2 py-2 text-center font-bold w-12 text-slate-700 dark:text-slate-200">
                  ⚙️
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="19"
                    className="p-10 text-center text-slate-400 text-sm"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📭</span>
                      <span>
                        {t.noFlights} — {dateLabel}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const past = isPast(f);
                  const { day, date } = fmtDateParts(f.std, timeMode);
                  const statusColor = past ? "#94a3b8" : "#22c55e";
                  const statusBg = past ? "#f1f5f9" : "#f0fdf4";
                  const hasActual = f.actual && (f.actual.std || f.actual.sta);
                  const isSelected = selectedIds.includes(f.id);
                  const ft = getFlightType(f.flightType);

                  return (
                    <tr
                      key={f.id}
                      onContextMenu={(e) => handleContextMenu(e, f)}
                      className={`border-b border-slate-200 dark:border-slate-700 hover:bg-sky-50/40 dark:hover:bg-slate-700/50 transition cursor-context-menu ${
                        past ? "opacity-75" : ""
                      } ${
                        isSelected ? "bg-sky-100/60 dark:bg-sky-950/40" : ""
                      }`}
                    >
                      {/* Status dot */}
                      <td
                        className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700"
                        style={{ background: statusBg }}
                      >
                        <div className="flex items-center justify-center">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: statusColor }}
                          />
                        </div>
                      </td>

                      {/* Checkbox */}
                      <td
                        className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center"
                        style={{ background: past ? "#fef2f2" : "#fef3c7" }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(f.id)}
                          className="w-3.5 h-3.5 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>

                      {/* Flight No */}
                      <td
                        className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center font-bold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsFlight(f);
                        }}
                        title="انقر لعرض تفاصيل الرحلة"
                      >
                        {f.flightNo}
                        {hasActual && (
                          <span
                            className="ms-1 text-[9px] text-emerald-600 font-bold"
                            title="JL ✓"
                          >
                            ✓
                          </span>
                        )}
                      </td>

                      {/* Flight Type */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${ft.color}`}
                          title={ft.en}
                        >
                          <span>{ft.icon}</span>
                          <span className="hidden md:inline">{ft.key}</span>
                        </span>
                      </td>

                      {/* Day */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center text-slate-600 dark:text-slate-400">
                        {day}
                      </td>

                      {/* Date */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {date}
                      </td>

                      {/* STD */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                        {fmtTime(f.std, timeMode)}
                      </td>

                      {/* ADEP */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {f.dep}
                      </td>

                      {/* ADES */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            f.arr === "HLWF"
                              ? "bg-rose-100 text-rose-700 border border-rose-300"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {f.arr}
                        </span>
                      </td>

                      {/* STA */}
                      <td className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center font-mono text-slate-700 dark:text-slate-300">
                        {fmtTime(f.sta, timeMode)}
                      </td>

                      {/* ACFT */}
                      <td
                        className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-slate-800 dark:text-slate-100"
                        style={{ background: "#fef3c7" }}
                      >
                        {f.acft}
                      </td>

                      {/* Crew — Short Codes */}
                      {[
                        "captain",
                        "firstOfficer",
                        "fa1",
                        "fa2",
                        "engineer",
                        "security",
                      ].map((pos) => {
                        const members = crewByPosDetailed(f, pos);
                        return (
                          <td
                            key={pos}
                            className="px-2 py-1.5 border-e border-slate-200 dark:border-slate-700 text-center"
                          >
                            {members.length > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                {members.map((m, idx) => {
                                  const sc = getShortCodeWithColor(m);
                                  return (
                                    <span
                                      key={idx}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${sc.color}`}
                                      title={`${m.fullName} (${m.role})`}
                                    >
                                      {sc.code}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* ⭐ PAX — محذوف */}

                      {/* Notes */}
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <div className="flex items-center gap-1">
                          {f.notes ? (
                            <span
                              className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]"
                              title={f.notes}
                            >
                              {f.notes}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-[10px] italic">
                              {t.noData || "—"}
                            </span>
                          )}
                          {f.permits && (
                            <span
                              className="text-[9px] px-1 rounded bg-amber-100 text-amber-700 border border-amber-300"
                              title={f.permits}
                            >
                              🛡️
                            </span>
                          )}
                          {f.services && (
                            <span
                              className="text-[9px] px-1 rounded bg-purple-100 text-purple-700 border border-purple-300"
                              title={f.services}
                            >
                              🚛
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions Popup Button */}
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setContextMenu({
                              flight: f,
                              x: rect.left - 200,
                              y: rect.bottom + 4,
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-500 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
                          title="الإجراءات والقائمة المنبثقة"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {viewMode === "calendar" && (
        <CalendarView
          flights={flights}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          timeMode={timeMode}
          isPast={isPast}
        />
      )}

      {/* ═══ TIMELINE VIEW ═══ */}
      {viewMode === "timeline" && (
        <TimelineView flights={filtered} timeMode={timeMode} isPast={isPast} />
      )}


      {/* ═══ FLOATING BULK ACTIONS BAR ═══ */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 start-1/2 -translate-x-1/2 z-[190] bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-3 animate-slideUp">
          <div className="flex items-center gap-2 pe-3 border-e border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-xs font-bold whitespace-nowrap">
              {selectedIds.length} {document.documentElement.lang === "ar" ? "رحلات محددة" : "selected"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => bulkAction("complete")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {document.documentElement.lang === "ar" ? "إكمال (JL)" : "Complete (JL)"}
            </button>

            <button
              type="button"
              onClick={() => bulkAction("gendec")}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plane className="w-3.5 h-3.5" />
              GenDec
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => bulkAction("delete")}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {document.documentElement.lang === "ar" ? "حذف" : "Delete"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Flight Details Modal ═══ */}
      {detailsFlight && (
        <FlightDetailsModal
          flight={detailsFlight}
          fleet={fleet}
          crew={crew}
          onClose={() => setDetailsFlight(null)}
          onEdit={openEdit}
          onComplete={setCompleteFlight}
          onGenDec={onGenDec}
          onNotes={setNotesModal}
          onSendEmail={handleSendFlightEmail}
          canEdit={canEdit}
          canComplete={canComplete}
          canGenDec={canGenDec}
          canNotes={canNotes}
          canSendEmail={canEdit}
        />
      )}

      {/* ═══ Email Dispatch Modal ═══ */}
      {emailModal && (
        <Modal
          open={!!emailModal}
          title={`📧 إرسال تفاصيل الرحلة للطاقم — ${emailModal.flight?.flightNo || ""}`}
          onClose={() => setEmailModal(null)}
          wide
          footer={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = createGmailWebUrl(
                      emailModal.toInput,
                      emailModal.subject,
                      emailModal.body
                    );
                    window.open(url, "_blank");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="فتح نافذة إنشاء الرسالة مباشرة في Gmail مع جميع الحقول معبأة"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح في Gmail</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = createMailtoUrl(
                      emailModal.toInput,
                      emailModal.subject,
                      emailModal.body
                    );
                    window.location.href = url;
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="فتح في تطبيق البريد الافتراضي على جهازك"
                >
                  <Mail className="w-4 h-4" />
                  <span>تطبيق البريد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `${emailModal.subject}\n\n${emailModal.body}`;
                    navigator.clipboard.writeText(text);
                    setEmailModal((prev) => ({ ...prev, copied: true }));
                    setTimeout(() => {
                      setEmailModal((prev) => (prev ? { ...prev, copied: false } : null));
                    }, 2500);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  {emailModal.copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{emailModal.copied ? "تم النسخ ✓" : "نسخ النص"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModal(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={doSendServerEmail}
                  disabled={emailModal.sending}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{emailModal.sending ? "جارٍ الإرسال..." : "إرسال عبر الخادم"}</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {emailModal.sent && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>تم إرسال تفاصيل الرحلة بنجاح إلى جميع الأطقم المحددة!</span>
              </div>
            )}

            {emailModal.error && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{emailModal.error}</p>
                </div>
              </div>
            )}

            {/* Crew Recipients summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  الأطقم المعينة في الرحلة ({emailModal.assignedCrew?.length || 0}):
                </span>
                <span className="text-[11px] text-slate-500">
                  {emailModal.emails?.length || 0} لديهم بريد إلكتروني
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {emailModal.assignedCrew?.map((c, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                      c.email
                        ? "bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                    }`}
                  >
                    <span>{c.position || "CREW"}:</span>
                    <span className="font-bold">{c.name}</span>
                    {c.email ? (
                      <span className="text-[10px] text-slate-500">({c.email})</span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-bold">(بدون إيميل)</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <Field label="المستلمون (إيميلات الأطقم)">
              <Input
                value={emailModal.toInput}
                onChange={(e) =>
                  setEmailModal((prev) => ({ ...prev, toInput: e.target.value }))
                }
                placeholder="crew1@airline.com, crew2@airline.com"
              />
            </Field>

            <Field label="عنوان الرسالة (Subject)">
              <Input
                value={emailModal.subject}
                onChange={(e) =>
                  setEmailModal((prev) => ({ ...prev, subject: e.target.value }))
                }
              />
            </Field>

            <Field label="نص تقرير الرحلة (Flight Briefing)">
              <textarea
                value={emailModal.body}
                onChange={(e) =>
                  setEmailModal((prev) => ({ ...prev, body: e.target.value }))
                }
                rows={11}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ═══ Expiry Alert Modal ═══ */}
      {expiryAlertModal && (
        <Modal
          open={!!expiryAlertModal}
          title="⚠️ فحص تنبيهات الوثائق"
          onClose={() => setExpiryAlertModal(null)}
          footer={
            <button
              onClick={() => setExpiryAlertModal(null)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold"
            >
              إغلاق
            </button>
          }
        >
          {expiryAlertModal.loading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              جارٍ فحص وثائق الأسطول والأطقم وإرسال التنبيهات...
            </div>
          ) : expiryAlertModal.error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              حدث خطأ أثناء فحص التنبيهات: {expiryAlertModal.error}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
              ✓ تم تنفيذ فحص التنبيهات بنجاح.
            </div>
          )}
        </Modal>
      )}

      {/* ═══ Context Menu ═══ */}
      {contextMenu && (
        <FlightContextMenu
          flight={
            contextMenu.bulk
              ? { bulk: true, ids: contextMenu.ids }
              : contextMenu.flight
          }
          x={contextMenu.x}
          y={contextMenu.y}
          user={user}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

{/* ═══ Flight Notes Modal ═══ */}
{notesModal && (
  <FlightNotesModal
    flight={notesModal}
    onClose={() => setNotesModal(null)}
    onSave={saveNotesAndPermits}
  />
)}

{/* ═══ Complete Flight Modal ═══ */}
{completeFlight && (
  <CompleteFlightModal
    flight={completeFlight}
    fleet={fleet}
    onClose={() => setCompleteFlight(null)}
    onSave={saveCompleteFlight}
  />
)}

{/* ═══ Edit Flight Modal ═══ */}
<Modal
  open={!!editing}
  title={editing === "new" ? t.addFlight : t.editFlight}
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
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2"
      >
        <Save className="w-4 h-4" /> {t.save}
      </button>
    </>
  }
>
  <div className="space-y-4">
    {/* ═══ Flight Info ═══ */}
    <div className="grid md:grid-cols-3 gap-3">
      <Field label={t.flightNo}>
        <Input
          value={draft.flightNo || ""}
          onChange={(e) =>
            setDraft({ ...draft, flightNo: e.target.value })
          }
          placeholder="GAK770"
        />
      </Field>

      <Field label={t.dep}>
        <AirportInput
          value={draft.dep || ""}
          onChange={(v) => setDraft({ ...draft, dep: v })}
        />
      </Field>

      <Field label={t.arr}>
        <AirportInput
          value={draft.arr || ""}
          onChange={(v) => setDraft({ ...draft, arr: v })}
        />
      </Field>

      <Field label={t.altn}>
        <AirportInput
          value={draft.altn || ""}
          onChange={(v) => setDraft({ ...draft, altn: v })}
        />
      </Field>

      <Field label={t.altn2}>
        <AirportInput
          value={draft.altn2 || ""}
          onChange={(v) => setDraft({ ...draft, altn2: v })}
        />
      </Field>

      <Field label={t.acft}>
        <Select
          value={draft.acft || ""}
          onChange={(e) => setDraft({ ...draft, acft: e.target.value })}
        >
          <option value="">—</option>
          {fleet.map((a) => (
            <option key={a.id} value={a.reg}>
              {a.reg} ({a.type})
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t.std}>
        <Input
          type="datetime-local"
          value={draft.std || ""}
          onChange={(e) => setDraft({ ...draft, std: e.target.value })}
        />
      </Field>

      <Field label={t.sta}>
        <Input
          type="datetime-local"
          value={draft.sta || ""}
          onChange={(e) => setDraft({ ...draft, sta: e.target.value })}
        />
      </Field>

      <Field label={t.status}>
        <Select
          value={draft.status || ""}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          {STATUS_LIST.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>

      {/* ⭐ Flight Type — مع SCHEDULED */}
      <Field label={t.flightType}>
        <Select
          value={draft.flightType || "SCHEDULED"}
          onChange={(e) =>
            setDraft({ ...draft, flightType: e.target.value })
          }
        >
          {FLIGHT_TYPES.map((ft) => (
            <option key={ft.key} value={ft.key}>
              {ft.icon}{" "}
              {t[ft.key.toLowerCase()] || ft.ar || ft.en || ft.key} (
              {ft.key})
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t.paxCount || "PAX"}>
        <Input
          type="number"
          value={draft.pax || 0}
          onChange={(e) => setDraft({ ...draft, pax: +e.target.value })}
        />
      </Field>

      <Field label={t.cargoWeight || "Cargo"}>
        <Input
          type="number"
          value={draft.cargo || 0}
          onChange={(e) => setDraft({ ...draft, cargo: +e.target.value })}
        />
      </Field>
    </div>

    {/* ═══ Notes / Permits / Services ═══ */}
    <div className="grid md:grid-cols-3 gap-3">
      <Field label={`📝 ${t.freeNotes}`}>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          rows="3"
          placeholder={t.writeNote}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
        />
      </Field>

      <Field label={`🛡️ ${t.permits}`}>
        <textarea
          value={draft.permits || ""}
          onChange={(e) =>
            setDraft({ ...draft, permits: e.target.value })
          }
          rows="3"
          placeholder={t.writePermit}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </Field>

      <Field label={`🚛 ${t.servicesCompany}`}>
        <textarea
          value={draft.services || ""}
          onChange={(e) =>
            setDraft({ ...draft, services: e.target.value })
          }
          rows="3"
          placeholder={t.writeService}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
        />
      </Field>
    </div>

    {/* ═══ Crew Assignment — فقط مع صلاحية ═══ */}
    {canAssignCrew || canEdit ? (
      <section>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t.crewMembers}
          </h4>
          <button
            onClick={addSlot}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> {t.addPosition}
          </button>
        </div>

        {/* ⭐ Aircraft Qualification Filter Toggle */}
        {draft.acft && (
          <div className="flex items-center justify-between mb-3 p-2.5 bg-sky-50 dark:bg-sky-950/60 rounded-xl border border-sky-200 dark:border-sky-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sky-900 dark:text-sky-200">
              <input
                type="checkbox"
                checked={filterCrewByAcft}
                onChange={(e) => setFilterCrewByAcft(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>إظهار الأطقم المؤهلة للطائرة ({draft.acft}) فقط</span>
            </label>
            <span className="text-[11px] text-sky-700 dark:text-sky-300 font-mono font-bold">
              {crew.filter((c) => c.status === "active" && getCrewAircraft(c).includes(draft.acft)).length} طاقم مؤهل
            </span>
          </div>
        )}

        {safeArray(draft.crewSlots).map((slot, i) => {
          const usedCrewIds = safeArray(draft.crewSlots)
            .filter((_, idx) => idx !== i)
            .map((s) => s.crewId)
            .filter(Boolean);

          const allowedRoles = POSITION_ROLE_MAP[slot.position] || [];

          const availableCrew = crew.filter((c) => {
            if (c.status !== "active") return false;
            if (allowedRoles.length > 0 && !allowedRoles.includes(c.role))
              return false;
            if (usedCrewIds.includes(c.id) && c.id !== slot.crewId)
              return false;
            if (draft.acft && filterCrewByAcft) {
              const acfts = getCrewAircraft(c);
              if (!acfts.includes(draft.acft)) return false;
            }
            return true;
          });

          return (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg mb-2 border border-slate-200 dark:border-slate-700"
            >
              <div className="col-span-4">
                <Select
                  value={slot.position || ""}
                  onChange={(e) =>
                    updateSlot(i, { position: e.target.value })
                  }
                >
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {t[p.key] || p.en}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="col-span-7">
                <Select
                  value={slot.crewId || ""}
                  onChange={(e) =>
                    updateSlot(i, { crewId: e.target.value })
                  }
                >
                  <option value="">{t.selectCrew}</option>
                  {[...availableCrew]
                    .sort((a, b) => {
                      const aMatch = draft.acft && getCrewAircraft(a).includes(draft.acft) ? 1 : 0;
                      const bMatch = draft.acft && getCrewAircraft(b).includes(draft.acft) ? 1 : 0;
                      return bMatch - aMatch;
                    })
                    .map((c) => {
                      const cAcfts = getCrewAircraft(c);
                      const isLinked = draft.acft && cAcfts.includes(draft.acft);
                      const acftLabel = cAcfts.length > 0 ? cAcfts.join(", ") : "";
                      return (
                        <option key={c.id} value={c.id}>
                          {isLinked
                            ? `✈️ ⭐ ${c.fullName} (${c.empNo}) [${acftLabel}]`
                            : acftLabel
                            ? `${c.fullName} (${c.empNo}) [${acftLabel}]`
                            : `${c.fullName} (${c.empNo})`}
                        </option>
                      );
                    })}
                  {availableCrew.length === 0 && (
                    <option disabled>
                      {draft.acft && filterCrewByAcft
                        ? `— لا توجد أطقم مؤهلة للطائرة ${draft.acft} (فك التحديد لعرض الكل) —`
                        : `— ${t.noResults} —`}
                    </option>
                  )}
                </Select>
              </div>

              <div className="col-span-1 text-end">
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {safeArray(draft.crewSlots).length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
            {t.noCrewAssigned} — {t.addPosition}
          </div>
        )}
      </section>
    ) : (
      <div className="p-4 text-center text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
        ⚠️ ليس لديك صلاحية تعيين طاقم
      </div>
    )}
  </div>
</Modal>
</div>
);
}

export default ScheduleBoard;