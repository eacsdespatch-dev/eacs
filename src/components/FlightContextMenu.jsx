/* ═══════════════════════════════════════════════════════════
 * FLIGHT CONTEXT MENU
 * v3.4 — Added Manual Email + Expiry Alerts items
 *        (send_flight_email / send_expiry_alerts)
 * ═══════════════════════════════════════════════════════════ */
import React, { useEffect, useRef } from "react";
import {
  Edit,
  Trash2,
  CheckCircle2,
  Plane,
  MessageSquare,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useT, useAuth } from "../contexts";
import { can as checkPerm } from "../config/permissions";

export function FlightContextMenu({
  flight,
  x,
  y,
  user: userProp,
  onClose,
  onAction,
}) {
  const t = useT();
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  const menuRef = useRef(null);

  /* ⭐ Close on outside click / ESC */
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  /* ⭐ Adjust position to viewport */
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    if (x + rect.width > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (y + rect.height > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  }, [x, y]);

  const isBulk = flight?.bulk === true;

  /* ⭐ Permissions */
  const canEdit = checkPerm(user, "schedule.edit");
  const canDelete = checkPerm(user, "schedule.delete");

  /* ⭐ Single items */
  const singleItems = [
    {
      id: "edit",
      label: t.edit || "تعديل",
      icon: Edit,
      show: canEdit,
      color: "text-amber-700 dark:text-amber-300",
      hover: "hover:bg-amber-50 dark:hover:bg-amber-950",
      divider: false,
    },
    {
      id: "delete",
      label: t.delete || "حذف",
      icon: Trash2,
      show: canDelete,
      color: "text-rose-700 dark:text-rose-300",
      hover: "hover:bg-rose-50 dark:hover:bg-rose-950",
      divider: false,
    },
    {
      id: "complete_flight",
      label: t.completeJL || "إكمال الرحلة (JL)",
      icon: CheckCircle2,
      show: canEdit,
      color: "text-emerald-700 dark:text-emerald-300",
      hover: "hover:bg-emerald-50 dark:hover:bg-emerald-950",
      divider: true,
    },
    {
      id: "gendec",
      label: t.gendec || "General Declaration",
      icon: Plane,
      show: canEdit,
      color: "text-sky-700 dark:text-sky-300",
      hover: "hover:bg-sky-50 dark:hover:bg-sky-950",
      divider: true,
    },
    /* ⭐ إرسال تفاصيل الرحلة للطاقم (يدوي) */
    {
      id: "send_flight_email",
      label: t.sendFlightEmail || "📧 إرسال تفاصيل الرحلة للطاقم",
      icon: Send,
      show: canEdit,
      color: "text-blue-700 dark:text-blue-300",
      hover: "hover:bg-blue-50 dark:hover:bg-blue-950",
      divider: true,
    },
    /* ⭐ تنبيهات الوثائق (يدوي) */
    {
      id: "send_expiry_alerts",
      label: t.sendExpiryAlerts || "⚠️ تنبيهات الوثائق",
      icon: AlertTriangle,
      show: canEdit,
      color: "text-amber-700 dark:text-amber-300",
      hover: "hover:bg-amber-50 dark:hover:bg-amber-950",
      divider: true,
    },
    {
      id: "open_notes_modal",
      label: t.notes || "الملاحظات",
      icon: MessageSquare,
      show: canEdit,
      color: "text-purple-700 dark:text-purple-300",
      hover: "hover:bg-purple-50 dark:hover:bg-purple-950",
      divider: true,
    },
  ];

  /* ⭐ Bulk items */
  const bulkItems = [
    {
      id: "bulk_complete",
      label: t.completeJL || "إكمال الرحلات المحددة",
      icon: CheckCircle2,
      show: canEdit,
      color: "text-emerald-700 dark:text-emerald-300",
      hover: "hover:bg-emerald-50 dark:hover:bg-emerald-950",
      divider: false,
    },
    {
      id: "bulk_gendec",
      label: t.gendec || "General Declaration (متعدد)",
      icon: Plane,
      show: canEdit,
      color: "text-sky-700 dark:text-sky-300",
      hover: "hover:bg-sky-50 dark:hover:bg-sky-950",
      divider: false,
    },
    {
      id: "bulk_delete",
      label: t.delete || "حذف المحددة",
      icon: Trash2,
      show: canDelete,
      color: "text-rose-700 dark:text-rose-300",
      hover: "hover:bg-rose-50 dark:hover:bg-rose-950",
      divider: true,
    },
  ];

  const items = (isBulk ? bulkItems : singleItems).filter((it) => it.show);

  /* ⭐ If no items */
  if (items.length === 0) {
    onClose();
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl py-1 min-w-[220px]"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — Single flight */}
      {!isBulk && flight && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
            {flight.flightNo}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {flight.dep} → {flight.arr}
          </div>
        </div>
      )}

      {/* Header — Bulk */}
      {isBulk && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-sky-50 dark:bg-sky-950">
          <div className="font-bold text-sm text-sky-800 dark:text-sky-200">
            ⭐ {flight.ids?.length || 0} {t.selected || "محدد"}
          </div>
        </div>
      )}

      {/* Items */}
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.id}>
            {item.divider && idx > 0 && (
              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            )}
            <button
              onClick={() => {
                onAction(item.id, isBulk ? null : flight);
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start transition ${item.color} ${item.hover}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default FlightContextMenu;
