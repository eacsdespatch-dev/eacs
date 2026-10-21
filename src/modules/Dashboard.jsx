/* ═══════════════════════════════════════════════════════════
 * DASHBOARD — Main overview screen
 * v2.1 — Uses ACTUAL permission names
 * ═══════════════════════════════════════════════════════════ */
import React from "react";
import {
  Calendar,
  Plane,
  Shield,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { LiveClock, Badge } from "../components/ui";
import { CrewTableIcon } from "../crewIcons";
import { AlertsSummary } from "./AlertsSummary";
import { todayISO } from "../utils/helpers";
import { can as checkPerm } from "../config/permissions";

export function Dashboard({
  flights,
  crew,
  fleet,
  users,
  roles,
  leave = [],
  roster = [],
  standby = [],
  training = [],
  setTab,
}) {
  const t = useT();
  const { user } = useAuth();

  const can = (perm) => checkPerm(user, perm);

  const today = todayISO();
  const todayFlights = flights.filter((f) => f.std?.startsWith(today));
  const activeFlights = flights.filter(
    (f) => f.status === "DEPARTED" || f.status === "IN_FLIGHT"
  );
  const activeCrew = crew.filter((c) => c.status === "active");
  const pendingLeave = leave.filter((l) => l.status === "pending");

  /* ⭐ البطاقات — مع أسماء الصلاحيات الصحيحة */
  const allStats = [
    {
      id: "schedule",
      icon: Calendar,
      label: t.scheduleBoard,
      value: flights.length,
      sub: `${todayFlights.length} ${t.today}`,
      color: "from-sky-500 to-sky-700",
      tab: "schedule",
      show: can("schedule.view"),
    },
    {
      id: "fleet",
      icon: Plane,
      label: t.fleet,
      value: fleet.length,
      sub: `${fleet.filter((a) => a.status === "AIRWORTHY").length} ${t.active}`,
      color: "from-indigo-500 to-indigo-700",
      tab: "fleet",
      show: can("fleet.view"),
    },
    {
      id: "crew",
      icon: CrewTableIcon,
      label: t.crew,
      value: activeCrew.length,
      sub: `${crew.length} ${t.showing}`,
      color: "from-emerald-500 to-emerald-700",
      tab: "crew",
      show: can("crew.view"),
    },
    {
      id: "users",
      icon: Shield,
      label: t.userMgmt,
      value: users.length,
      sub: `${roles.length} ${t.roles}`,
      color: "from-purple-500 to-purple-700",
      tab: "users",
      show: can("users.view"),
    },
  ];

  const stats = allStats.filter((s) => s.show);

  /* ⭐ إجراءات سريعة */
  const allQuickActions = [
    {
      id: "schedule",
      icon: Calendar,
      label: t.scheduleBoard,
      color: "sky",
      show: can("schedule.view"),
    },
    {
      id: "roster",
      icon: Users,
      label: t.roster,
      color: "indigo",
      show: can("roster.view"),
    },
    {
      id: "ftl",
      icon: Clock,
      label: t.ftl,
      color: "orange",
      show: can("ftl.view"),
    },
    {
      id: "reports",
      icon: TrendingUp,
      label: t.reports,
      color: "emerald",
      show: can("reports.view"),
    },
  ];

  const quickActions = allQuickActions.filter((qa) => qa.show);

  return (
    <div className="space-y-6">
      {/* ⭐ Welcome Banner */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{t.dashboard}</h2>
            <p className="text-sky-100 text-sm">
              {t.loggedInAs}: <b>{user?.fullName}</b> ·{" "}
              {t[user?.role] || user?.role}
            </p>
          </div>
          <div className="hidden md:block">
            <LiveClock />
          </div>
        </div>
      </div>

      {/* ⭐ Stats Grid */}
      {stats.length > 0 ? (
        <div
          className={`grid grid-cols-2 gap-4 ${
            stats.length === 1
              ? "md:grid-cols-1"
              : stats.length === 2
              ? "md:grid-cols-2"
              : stats.length === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-4"
          }`}
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.tab)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-start hover:shadow-lg transition group"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {s.value}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {s.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{s.sub}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-2" />
          <div className="text-amber-800 dark:text-amber-200 font-bold">
            لا توجد بطاقات متاحة — تحقق من صلاحياتك
          </div>
        </div>
      )}

      {/* ⭐ Active Flights + Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {can("schedule.view") && (
          <div
            className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 ${
              quickActions.length === 0 ? "md:col-span-3" : "md:col-span-2"
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                {t.recentFlights}
              </h3>
              <button
                onClick={() => setTab("schedule")}
                className="text-xs text-sky-600 hover:underline flex items-center gap-1"
              >
                {t.tableView || "TABLE"} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {activeFlights.length === 0 && todayFlights.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Plane className="w-10 h-10 mx-auto mb-2 opacity-30" />
                {t.noData}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {(activeFlights.length > 0 ? activeFlights : todayFlights)
                  .slice(0, 5)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center flex-shrink-0">
                        <Plane className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                          {f.flightNo}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {f.dep} → {f.arr} · {f.acft || "—"}
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge kind={f.status}>{f.status}</Badge>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {f.std?.slice(11, 16)} UTC
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {quickActions.length > 0 && (
          <div
            className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 ${
              !can("schedule.view") ? "md:col-span-3" : ""
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {t.quickActions}
              </h3>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {quickActions.map((qa) => {
                const Icon = qa.icon;
                const colorMap = {
                  sky: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300",
                  indigo:
                    "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
                  orange:
                    "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300",
                  emerald:
                    "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
                };
                return (
                  <button
                    key={qa.id}
                    onClick={() => setTab(qa.id)}
                    className={`p-3 rounded-lg ${colorMap[qa.color]} text-center hover:opacity-80 transition`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-[10px] font-bold truncate">
                      {qa.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Small stats */}
            {(can("leave.view") ||
              can("roster.view") ||
              can("standby.view") ||
              can("training.view")) && (
              <div className="px-3 pb-3 space-y-1.5">
                {can("leave.view") && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">
                      {t.pendingLeaveChart}:
                    </span>
                    <span className="font-bold text-amber-600">
                      {pendingLeave.length}
                    </span>
                  </div>
                )}
                {can("roster.view") && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t.rosterEntries}:</span>
                    <span className="font-bold text-indigo-600">
                      {roster.length}
                    </span>
                  </div>
                )}
                {can("standby.view") && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t.onStandby}:</span>
                    <span className="font-bold text-emerald-600">
                      {standby.length}
                    </span>
                  </div>
                )}
                {can("training.view") && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t.trainingTitle}:</span>
                    <span className="font-bold text-purple-600">
                      {training.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ⭐ Alerts */}
      {(can("crew.view") || can("fleet.view") || can("users.view")) && (
        <AlertsSummary crew={crew} users={users} fleet={fleet} />
      )}
    </div>
  );
}

export default Dashboard;