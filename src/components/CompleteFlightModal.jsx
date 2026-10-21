/* ═══════════════════════════════════════════════════════════
 * COMPLETE FLIGHT MODAL — Journey Log
 * Input actual times, fuel, crew, and JL fields
 * v2.1 — FIXED: يضمن حفظ std + sta دائماً (fallback آمن)
 * ═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useT } from "../contexts";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

/* ⭐ حساب فرق الوقت */
const calcDiff = (stdISO, staISO) => {
  const std = stdISO?.slice(11, 16);
  const sta = staISO?.slice(11, 16);
  if (!std || !sta) return { block: "00:00", night: "00:00" };

  const [sh, sm] = std.split(":").map(Number);
  const [eh, em] = sta.split(":").map(Number);
  let min = eh * 60 + em - (sh * 60 + sm);
  if (min < 0) min += 24 * 60;

  const h = Math.floor(min / 60);
  const m = min % 60;
  const nh = Math.floor((min * 0.2) / 60);
  const nm = Math.round(min * 0.2) % 60;

  return {
    block: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    night: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
  };
};

export function CompleteFlightModal({ flight, onClose, onSave, fleet }) {
  const t = useT();
  const [draft, setDraft] = useState({
    actual: flight?.actual || {},
    status: flight?.status || "ARRIVED",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flight) {
      setDraft({
        actual: flight.actual || {
          std: flight.std || "",
          sta: flight.sta || "",
          takeoff: "",
          landing: "",
          pic: "",
          sic: "",
          picFlying: false,
          pilotMonitoring: "",
          blockFuel: 0,
          fuelUsed: 0,
          fuelRemaining: 0,
          uplift: 0,
          night: 0,
          instrument: 0,
          delayCode: "",
          restFacility: "Suitable",
          notes: "",
        },
        status: flight.status || "ARRIVED",
      });
    }
  }, [flight]);

  if (!flight) return null;

  const upd = (field, value) => {
    setDraft((d) => ({
      ...d,
      actual: { ...(d.actual || {}), [field]: value },
    }));
  };

  const copyFromFW = () => {
    setDraft((d) => ({
      ...d,
      actual: {
        ...(d.actual || {}),
        std: flight.std || "",
        sta: flight.sta || "",
      },
    }));
  };

  const diff = calcDiff(draft.actual?.std, draft.actual?.sta);

  /* ⭐⭐⭐ handleSave — مضمون حفظ std + sta ⭐⭐⭐ */
  const handleSave = async () => {
    console.log("🔍 [A] handleSave START");
    console.log("🔍 [B] draft.actual:", draft.actual);

    let stdValue = draft.actual?.std;
    let staValue = draft.actual?.sta;

    console.log("🔍 [C] Before fallback — std:", stdValue, "sta:", staValue);

    /* ⭐ Fallback 1: flight.std / flight.sta */
    if (!stdValue || String(stdValue).trim() === "") {
      stdValue = flight.std || "";
      console.log("🔍 [D] std fallback to flight.std:", stdValue);
    }
    if (!staValue || String(staValue).trim() === "") {
      staValue = flight.sta || "";
      console.log("🔍 [E] sta fallback to flight.sta:", staValue);
    }

    /* ⭐ Fallback 2: الوقت الحالي كحل أخير */
    if (!stdValue || String(stdValue).trim() === "") {
      const now = new Date();
      stdValue = now.toISOString().slice(0, 16) + ":00Z";
      console.warn("⚠️ [F] std was empty — using now:", stdValue);
    }
    if (!staValue || String(staValue).trim() === "") {
      const now = new Date();
      staValue = now.toISOString().slice(0, 16) + ":00Z";
      console.warn("⚠️ [G] sta was empty — using now:", staValue);
    }

    const actualToSave = {
      ...draft.actual,
      std: stdValue,
      sta: staValue,
    };

    console.log("🔍 [H] actualToSave FINAL:", actualToSave);
    console.log("🔍 [I] Calling onSave with id:", flight.id);

    setSaving(true);
    try {
      await onSave({
        ...flight,
        actual: actualToSave,
        status: draft.status,
      });
      console.log("🔍 [J] onSave returned OK");
      onClose();
    } catch (e) {
      console.error("🔍 [K] onSave FAILED:", e);
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-sky-50 dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-sky-500 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              ✍️ Complete Flight — {flight.flightNo}
            </h3>
            <p className="text-xs text-sky-100">
              {flight.dep} → {flight.arr} · {flight.acft}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Copy From FW */}
          <div className="flex justify-end">
            <button
              onClick={copyFromFW}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold"
            >
              ⬇️ COPY DATA FROM FW
            </button>
          </div>

          {/* ═══ TIMES ═══ */}
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                ⏱️ TIMES
              </h4>
              <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                All times in UTC
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Date *">
                <Input
                  type="date"
                  value={flight.std?.slice(0, 10) || ""}
                  disabled
                />
              </Field>
              <Field label="ADEP *">
                <Input value={flight.dep} disabled />
              </Field>
              <Field label="ADES *">
                <Input value={flight.arr} disabled />
              </Field>

              <Field label="BLOFF *">
                <Input
                  type="time"
                  value={draft.actual?.std?.slice(11, 16) || ""}
                  onChange={(e) =>
                    upd(
                      "std",
                      `${flight.std?.slice(0, 10)}T${e.target.value}:00Z`
                    )
                  }
                />
              </Field>
              <Field label="T/O *">
                <Input
                  type="time"
                  value={draft.actual?.takeoff?.slice(11, 16) || ""}
                  onChange={(e) =>
                    upd(
                      "takeoff",
                      `${flight.std?.slice(0, 10)}T${e.target.value}:00Z`
                    )
                  }
                />
              </Field>
              <Field label="LDG *">
                <Input
                  type="time"
                  value={draft.actual?.landing?.slice(11, 16) || ""}
                  onChange={(e) =>
                    upd(
                      "landing",
                      `${flight.sta?.slice(0, 10)}T${e.target.value}:00Z`
                    )
                  }
                />
              </Field>
              <Field label="BLON *">
                <Input
                  type="time"
                  value={draft.actual?.sta?.slice(11, 16) || ""}
                  onChange={(e) =>
                    upd(
                      "sta",
                      `${flight.sta?.slice(0, 10)}T${e.target.value}:00Z`
                    )
                  }
                />
              </Field>
            </div>

            <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded flex gap-6 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300">
                <b>Block:</b> <span className="font-mono">{diff.block}</span>
              </span>
              <span className="text-emerald-700 dark:text-emerald-300">
                <b>Night:</b> <span className="font-mono">{diff.night}</span>
              </span>
            </div>
          </section>

          {/* ═══ FUEL ═══ */}
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
              ⛽ FUEL
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Block fuel *">
                <Input
                  type="number"
                  value={draft.actual?.blockFuel || 0}
                  onChange={(e) => upd("blockFuel", +e.target.value)}
                />
              </Field>
              <Field label="Fuel used *">
                <Input
                  type="number"
                  value={draft.actual?.fuelUsed || 0}
                  onChange={(e) => upd("fuelUsed", +e.target.value)}
                />
              </Field>
              <Field label="Fuel remaining *">
                <Input
                  type="number"
                  value={draft.actual?.fuelRemaining || 0}
                  onChange={(e) => upd("fuelRemaining", +e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* ═══ CREW ═══ */}
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
              👨‍✈️ CREW
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PIC (Pilot in Command)">
                <Input
                  value={draft.actual?.pic || ""}
                  onChange={(e) => upd("pic", e.target.value)}
                  placeholder="Captain name"
                />
              </Field>
              <Field label="SIC (Second in Command)">
                <Input
                  value={draft.actual?.sic || ""}
                  onChange={(e) => upd("sic", e.target.value)}
                  placeholder="First officer name"
                />
              </Field>
              <Field label="Pilot Flying (PF)">
                <Select
                  value={String(draft.actual?.picFlying ?? false)}
                  onChange={(e) => upd("picFlying", e.target.value === "true")}
                >
                  <option value="false">PIC</option>
                  <option value="true">SIC</option>
                </Select>
              </Field>
              <Field label="Pilot Monitoring (PM)">
                <Input
                  value={draft.actual?.pilotMonitoring || ""}
                  onChange={(e) => upd("pilotMonitoring", e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* ═══ OPTIONAL JL ═══ */}
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
              ⚙️ OPTIONAL JL FIELDS
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  In-flight Rest Facility:
                </label>
                <Select
                  value={draft.actual?.restFacility || "Suitable"}
                  onChange={(e) => upd("restFacility", e.target.value)}
                  className="col-span-2"
                >
                  <option>Suitable</option>
                  <option>Not Suitable</option>
                  <option>Class 1</option>
                  <option>Class 2</option>
                  <option>Class 3</option>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Uplift [lbs]:
                </label>
                <Input
                  className="col-span-2"
                  type="number"
                  value={draft.actual?.uplift || 0}
                  onChange={(e) => upd("uplift", +e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Delay code:
                </label>
                <Input
                  className="col-span-2"
                  value={draft.actual?.delayCode || ""}
                  onChange={(e) => upd("delayCode", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Night time [min]:
                </label>
                <Input
                  className="col-span-2"
                  type="number"
                  value={draft.actual?.night || 0}
                  onChange={(e) => upd("night", +e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ═══ STATUS ═══ */}
          <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <Field label="Flight Status">
              <Select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="BOARDING">BOARDING</option>
                <option value="DEPARTED">DEPARTED</option>
                <option value="ARRIVED">ARRIVED ✓</option>
                <option value="DELAYED">DELAYED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </Field>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex justify-end gap-2 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "SAVE JL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompleteFlightModal;
