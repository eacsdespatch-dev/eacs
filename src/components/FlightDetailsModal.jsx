/* ═══════════════════════════════════════════════════════════
 * FLIGHT DETAILS MODAL
 * Comprehensive Flight Details View (Route, Times, ACFT, Crew, Operations)
 * ═══════════════════════════════════════════════════════════ */
import React from "react";
import {
  X,
  Plane,
  Clock,
  Calendar,
  Users,
  Shield,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit,
  FileCheck,
  Tag,
  Luggage,
  Package,
  Send,
  Mail,
} from "lucide-react";
import { useT } from "../contexts";
import { fmtTime, fmtDateParts, safeArray } from "../utils/helpers";
import { getFlightType } from "../config/constants";

export function FlightDetailsModal({
  flight,
  fleet = [],
  crew = [],
  onClose,
  onEdit,
  onComplete,
  onGenDec,
  onNotes,
  onSendEmail,
  canEdit = false,
  canComplete = false,
  canGenDec = false,
  canNotes = false,
  canSendEmail = false,
}) {
  const t = useT();
  const lang = document.documentElement.lang || "en";

  if (!flight) return null;

  const acftObj = fleet.find((a) => a.reg === flight.acft) || null;
  const ft = getFlightType(flight.flightType);
  const actual = flight.actual || {};
  const hasActual = Boolean(actual.std || actual.sta || actual.blockTime || actual.flightTime);

  const { date: stdDate, day: stdDay } = fmtDateParts(flight.std, "UTC");
  const { date: staDate } = fmtDateParts(flight.sta, "UTC");

  const crewSlots = safeArray(flight.crewSlots);
  const assignedCrew = crewSlots.map((slot) => {
    const member = crew.find((c) => c.id === slot.crewId);
    return {
      position: slot.position,
      crewId: slot.crewId,
      name: member?.fullName || slot.crewName || "—",
      empNo: member?.empNo || "—",
      role: member?.role || "—",
      email: member?.email || "",
      phone: member?.phone || "",
    };
  });

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-3 md:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700 my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ Header ═══ */}
        <div className="bg-gradient-to-r from-sky-700 via-indigo-700 to-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Plane className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight tracking-wide">
                  {flight.flightNo || "Flight"}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${ft.color}`}
                >
                  {ft.icon} {t[ft.key.toLowerCase()] || ft.ar || ft.en || ft.key}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
                  {flight.status || "SCHEDULED"}
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                {flight.dep} ➔ {flight.arr}
                {flight.altn ? ` · Altn: ${flight.altn}` : ""}
                {flight.altn2 ? ` · Altn2: ${flight.altn2}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100 text-sm">
          {/* Route & Times Card */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 rtl:md:divide-x-reverse">
              {/* Departure */}
              <div className="space-y-1 pb-3 md:pb-0 md:pe-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>{lang === "ar" ? "المغادرة (Departure)" : "Departure"}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-sky-700 dark:text-sky-300">
                  {flight.dep || "—"}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-bold text-base">
                    {fmtTime(flight.std, "UTC")} <span className="text-[10px] text-slate-400 font-normal">UTC</span>
                  </span>
                  <span className="text-slate-500">({stdDay} {stdDate})</span>
                </div>
                {actual.std && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ {lang === "ar" ? "الفعلي (ATD)" : "Actual ATD"}: {fmtTime(actual.std, "UTC")} UTC
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div className="space-y-1 pt-3 md:pt-0 md:ps-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === "ar" ? "الوصول (Arrival)" : "Arrival"}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {flight.arr || "—"}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-bold text-base">
                    {fmtTime(flight.sta, "UTC")} <span className="text-[10px] text-slate-400 font-normal">UTC</span>
                  </span>
                  <span className="text-slate-500">({staDate})</span>
                </div>
                {actual.sta && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ {lang === "ar" ? "الفعلي (ATA)" : "Actual ATA"}: {fmtTime(actual.sta, "UTC")} UTC
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aircraft & Payload */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                {t.acft || "Aircraft"}
              </span>
              <span className="font-bold font-mono text-base text-slate-800 dark:text-slate-100">
                {flight.acft || "—"}
              </span>
              {acftObj && (
                <span className="text-[10px] text-slate-400 block">{acftObj.type}</span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-500" /> {t.paxCount || "PAX"}
              </span>
              <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                {flight.pax || 0}
              </span>
              <span className="text-[10px] text-slate-400 block">{lang === "ar" ? "راكب" : "Passengers"}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <Package className="w-3 h-3 text-amber-500" /> {t.cargoWeight || "Cargo"}
              </span>
              <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                {flight.cargo || 0} <span className="text-xs font-normal">kg</span>
              </span>
              <span className="text-[10px] text-slate-400 block">{lang === "ar" ? "شحن" : "Freight"}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <Tag className="w-3 h-3 text-purple-500" /> {t.flightType || "Type"}
              </span>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {flight.flightType || "SCHEDULED"}
              </span>
              <span className="text-[10px] text-slate-400 block">{ft.en}</span>
            </div>
          </div>

          {/* Actuals / Journey Log summary if completed */}
          {hasActual && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === "ar" ? "بيانات إكمال الرحلة (Journey Log)" : "Journey Log Data"}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{lang === "ar" ? "مدة البلوك" : "Block Time"}:</span>
                  <span className="font-bold font-mono">{actual.blockTime ? `${actual.blockTime} hrs` : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{lang === "ar" ? "مدة الطيران" : "Flight Time"}:</span>
                  <span className="font-bold font-mono">{actual.flightTime ? `${actual.flightTime} hrs` : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{lang === "ar" ? "وقود البلوك" : "Block Fuel"}:</span>
                  <span className="font-bold font-mono">{actual.fuelBlock ? `${actual.fuelBlock} kg` : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">{lang === "ar" ? "الوقود المتبقي" : "Remaining Fuel"}:</span>
                  <span className="font-bold font-mono">{actual.fuelRemaining ? `${actual.fuelRemaining} kg` : "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Crew Section */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Users className="w-4 h-4 text-sky-600" />
              <span>{t.crewMembers || "Assigned Crew"}</span>
              <span className="text-xs text-slate-400 font-normal">({assignedCrew.length})</span>
            </h4>

            {assignedCrew.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                {t.noCrewAssigned || "No crew assigned yet"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {assignedCrew.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate text-slate-800 dark:text-slate-100">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t[c.position] || c.position} · {c.empNo}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                      {c.position}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operations: Notes, Permits & Handling */}
          <div className="space-y-2 pt-1">
            <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>{lang === "ar" ? "الملاحظات والعمليات" : "Operations & Dispatch"}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  📝 {t.freeNotes || "Notes"}
                </span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {flight.notes || "—"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  🛡️ {t.permits || "Permits"}
                </span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {flight.permits || "—"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  🚛 {t.handling || "Handling"}
                </span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {flight.services || flight.handling || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Footer ═══ */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {t.close || "Close"}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {(canNotes || canEdit) && onNotes && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNotes(flight);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.notes || "Notes"}</span>
              </button>
            )}

            {(canGenDec || canEdit) && onGenDec && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGenDec(flight);
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>GenDec</span>
              </button>
            )}

            {onSendEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendEmail(flight);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "إرسال للطاقم 📧" : "Email Crew"}</span>
              </button>
            )}

            {(canComplete || canEdit) && onComplete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onComplete(flight);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "إكمال الرحلة (JL)" : "Journey Log"}</span>
              </button>
            )}

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(flight);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{t.edit || "Edit"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightDetailsModal;
