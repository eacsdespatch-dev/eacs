/* ═══════════════════════════════════════════════════════════
 * LOGIN Component
 * v2.1 — Removed Operator Code
 * ═══════════════════════════════════════════════════════════ */
import React, { useState } from "react";
import {
  Plane,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useT } from "../contexts";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { logLoginSafe, logSafe } from "../utils/audit";

/* ⭐ Drive logo URL helper */
function logoToDisplayUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const match = url.match(/[?&]id=([^&]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  const pathMatch = url.match(/\/d\/([^/]+)/);
  if (pathMatch) return `https://lh3.googleusercontent.com/d/${pathMatch[1]}`;
  return url;
}

export function Login({ users, onLogin, settings, loading }) {
  const t = useT();
  const [u, setU] = useState("admin");
  const [p, setP] = useState("admin123");
  const [showP, setShowP] = useState(false);
  const [err, setErr] = useState("");

  const logoUrl = settings?.logo ? logoToDisplayUrl(settings.logo) : "";
  const companyNameEn = settings?.companyName || "AeroOps";
  const companyNameAr = settings?.companyNameAr || "إيرو أوبس";

  const submit = (e) => {
    e.preventDefault();

    const found = users.find(
      (x) =>
        String(x.username).trim() === u.trim() &&
        x.password === p &&
        (x.active === true || x.active === "true")
    );

    if (!found) {
      setErr(t.invalidLogin);
      logLoginSafe(
        { id: "unknown", fullName: u, username: u, role: "unknown" },
        "LOGIN_FAILED",
        false,
        "Invalid credentials"
      );
      return;
    }

    setErr("");
    logLoginSafe(found, "LOGIN", true);
    logSafe(found, "LOGIN", "Auth", found.id, found.fullName, {
      username: found.username,
      role: found.role,
    });

    onLogin(found);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-900 to-slate-800 p-4">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          {/* الشعار */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center">
                <Plane className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* ⭐ اسم الشركة فقط — بدون Operator Code */}
          <div className="space-y-1">
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              {companyNameEn}
            </h1>
            <p
              className="text-sm text-slate-500 dark:text-slate-400 font-sans"
              dir="rtl"
            >
              {companyNameAr}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mb-4 p-3 rounded-lg bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t.loadingData}
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {err}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          <Field label={t.username}>
            <div className="relative">
              <User className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
              <Input
                value={u}
                onChange={(e) => setU(e.target.value)}
                className="ps-9"
                autoComplete="username"
              />
            </div>
          </Field>

          <Field label={t.password}>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
              <Input
                type={showP ? "text" : "password"}
                value={p}
                onChange={(e) => setP(e.target.value)}
                className="ps-9 pe-9"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowP((s) => !s)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
              >
                {showP ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </Field>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || users.length === 0}
          className="w-full mt-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium transition"
        >
          {t.signIn}
        </button>

        <p className="text-xs text-slate-400 mt-4 text-center">{t.demoHint}</p>
      </form>
    </div>
  );
}

export default Login;
