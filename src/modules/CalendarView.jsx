/* ═══════════════════════════════════════════════════════════
 * CALENDAR VIEW
 * Monthly calendar with flights
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import { useT } from "../contexts";
import { MONTHS_EN, MONTHS_AR, DAYS_EN, DAYS_AR } from "../config/constants";
import { fmtTime, todayISO } from "../utils/helpers";

export function CalendarView({
  flights,
  selectedDate,
  setSelectedDate,
  timeMode = "UTC",
  isPast,
}) {
  const t = useT();
  const lang = document.documentElement.lang || "en";

  const [month, setMonth] = useState(() => {
    const d = new Date(selectedDate + "T00:00:00Z");
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  const daysInMonth = new Date(
    Date.UTC(month.year, month.month + 1, 0)
  ).getUTCDate();
  const firstDay = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();

  const monthNames = lang === "ar" ? MONTHS_AR : MONTHS_EN;
  const dayNames = lang === "ar" ? DAYS_AR : DAYS_EN;

  /* ⭐ تجميع الرحلات حسب اليوم */
  const flightsByDay = {};
  flights.forEach((f) => {
    if (!f.std) return;
    const d = new Date(f.std);
    if (d.getUTCFullYear() === month.year && d.getUTCMonth() === month.month) {
      const day = d.getUTCDate();
      if (!flightsByDay[day]) flightsByDay[day] = [];
      flightsByDay[day].push(f);
    }
  });

  /* ⭐ التنقل بين الشهور */
  const shiftMonth = (delta) => {
    let m = month.month + delta;
    let y = month.year;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setMonth({ year: y, month: m });
  };

  /* ⭐ بناء الخلايا */
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = todayISO();

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* ⭐ Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-b from-sky-50 dark:from-slate-900 to-white dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => shiftMonth(-1)}
          className="px-3 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"
        >
          ◀ {t.previous}
        </button>

        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
          {monthNames[month.month]} {month.year}
        </h3>

        <button
          onClick={() => shiftMonth(1)}
          className="px-3 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"
        >
          {t.next} ▶
        </button>
      </div>

      {/* ⭐ Day names */}
      <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        {dayNames.map((d) => (
          <div
            key={d}
            className="p-2 text-center text-xs font-bold text-slate-600 dark:text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ⭐ Days grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={i}
                className="min-h-[100px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
              />
            );
          }

          const dateStr = `${month.year}-${String(month.month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const dayFlights = flightsByDay[day] || [];

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(dateStr)}
              className={`min-h-[100px] p-1.5 border border-slate-200 dark:border-slate-700 text-start align-top transition hover:bg-sky-50 dark:hover:bg-slate-700 ${
                isSelected
                  ? "bg-sky-100 dark:bg-sky-950 ring-2 ring-sky-500 ring-inset"
                  : ""
              }`}
            >
              {/* Day number */}
              <div
                className={`text-xs font-bold mb-1 flex items-center gap-1 ${
                  isToday
                    ? "text-rose-600"
                    : isSelected
                    ? "text-sky-700 dark:text-sky-400"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {day}
                {isToday && (
                  <span className="text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1 rounded">
                    {t.today}
                  </span>
                )}
              </div>

              {/* Flights */}
              <div className="space-y-0.5">
                {dayFlights.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className={`text-[10px] px-1 py-0.5 rounded truncate ${
                      isPast(f)
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    }`}
                    title={`${f.flightNo} · ${fmtTime(f.std, timeMode)}`}
                  >
                    <b>{fmtTime(f.std, timeMode)}</b> {f.flightNo}
                  </div>
                ))}
                {dayFlights.length > 3 && (
                  <div className="text-[10px] text-slate-400 ps-1">
                    +{dayFlights.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarView;
