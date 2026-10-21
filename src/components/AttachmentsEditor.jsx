/* ═══════════════════════════════════════════════════════════
 * ATTACHMENTS EDITOR Component
 * Upload + manage documents with expiry tracking
 * v2.0 — Edit + days remaining + visual warnings
 * ═══════════════════════════════════════════════════════════ */
import React, { useRef, useState } from "react";
import {
  Eye,
  Download,
  Trash2,
  Upload,
  Plus,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Edit,
  Save,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { uploadFile } from "../api";
import { useT } from "../contexts";
import { Badge } from "./ui/Badge";
import { Input } from "./ui/Input";
import {
  uid,
  docStatus,
  formatFileSize,
  canPreviewFile,
  fileTypeIcon,
  safeArray,
} from "../utils/helpers";

/* ⭐ حساب الأيام المتبقية */
function daysUntil(expiry) {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

export function AttachmentsEditor({ value, onChange }) {
  const t = useT();
  const ref = useRef();

  const safeValue = safeArray(value);

  const [pendingName, setPendingName] = useState("");
  const [pendingExpiry, setPendingExpiry] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ⭐ حالة التعديل */
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

  /* ⭐ اختيار ملف */
  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!pendingName) setPendingName(f.name);
    setBusy(true);
    try {
      const r = await uploadFile(f, "documents");
      setPendingFile({
        fileName: r.fileName,
        url: r.fileUrl,
        path: r.filePath,
        mime: r.mimeType,
        size: r.size || f.size,
      });
    } catch (err) {
      alert("فشل الرفع: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  /* ⭐ إضافة مستند */
  const add = () => {
    if (!pendingName) return;
    onChange([
      ...safeValue,
      {
        id: uid("DOC"),
        name: pendingName,
        expiry: pendingExpiry || null,
        fileName: pendingFile?.fileName,
        url: pendingFile?.url,
        path: pendingFile?.path,
        mime: pendingFile?.mime,
        size: pendingFile?.size,
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setPendingName("");
    setPendingExpiry("");
    setPendingFile(null);
  };

  /* ⭐ حذف */
  const remove = (id) => {
    if (confirm("حذف هذا المستند؟")) {
      onChange(safeValue.filter((x) => x.id !== id));
    }
  };

  /* ⭐ بدء التعديل */
  const startEdit = (doc) => {
    setEditingId(doc.id);
    setEditName(doc.name || "");
    setEditExpiry(doc.expiry || "");
  };

  /* ⭐ حفظ التعديل */
  const saveEdit = () => {
    onChange(
      safeValue.map((d) =>
        d.id === editingId
          ? { ...d, name: editName, expiry: editExpiry || null }
          : d
      )
    );
    setEditingId(null);
    setEditName("");
    setEditExpiry("");
  };

  /* ⭐ إلغاء التعديل */
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditExpiry("");
  };

  /* ⭐ أيقونة حسب النوع */
  const renderIcon = (fileName, mime) => {
    const type = fileTypeIcon(fileName, mime);
    if (type === "image")
      return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    if (type === "pdf") return <FileText className="w-5 h-5 text-rose-600" />;
    if (type === "word") return <FileText className="w-5 h-5 text-blue-600" />;
    if (type === "excel")
      return <FileText className="w-5 h-5 text-green-600" />;
    return <Paperclip className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="space-y-3">
      {/* ⭐ المستندات المرفقة */}
      {safeValue.length > 0 && (
        <div className="space-y-2">
          {safeValue.map((a) => {
            const st = docStatus(a.expiry);
            const days = daysUntil(a.expiry);
            const preview = canPreviewFile(a.fileName, a.mime);
            const isEditing = editingId === a.id;

            /* 🔵 وضع التعديل */
            if (isEditing) {
              return (
                <div
                  key={a.id}
                  className="p-3 bg-purple-50 dark:bg-purple-950 border-2 border-purple-400 dark:border-purple-700 rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                    <Edit className="w-3.5 h-3.5" /> تعديل المستند
                  </div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="اسم المستند"
                  />
                  <Input
                    type="date"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> حفظ
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> إلغاء
                    </button>
                  </div>
                </div>
              );
            }

            /* 🔵 وضع العرض */
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${
                  st === "expired"
                    ? "bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800"
                    : st === "critical"
                    ? "bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800"
                    : st === "expiring"
                    ? "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex-shrink-0">
                  {renderIcon(a.fileName, a.mime)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-100">
                    {a.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {a.fileName && (
                      <span className="truncate">{a.fileName}</span>
                    )}
                    {a.size && <span> • {formatFileSize(a.size)}</span>}
                  </div>
                  {/* ⭐ الأيام المتبقية */}
                  {a.expiry && days !== null && (
                    <div
                      className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        days < 0
                          ? "bg-rose-200 text-rose-800"
                          : days < 7
                          ? "bg-orange-200 text-orange-800"
                          : days < 30
                          ? "bg-amber-200 text-amber-800"
                          : "bg-emerald-200 text-emerald-800"
                      }`}
                    >
                      <Calendar className="w-2.5 h-2.5" />
                      {days < 0
                        ? `منتهي منذ ${Math.abs(days)} يوم`
                        : days === 0
                        ? "ينتهي اليوم"
                        : `${days} يوم متبقٍ`}
                    </div>
                  )}
                </div>

                {a.expiry && <Badge kind={st}>{t[st] || st}</Badge>}

                <div className="flex gap-1">
                  {preview && a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {/* ⭐ زر التعديل */}
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="p-2 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⭐ إضافة مستند جديد */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-5">
            <Input
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="اسم المستند"
            />
          </div>
          <div className="col-span-3">
            <Input
              type="date"
              value={pendingExpiry}
              onChange={(e) => setPendingExpiry(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => ref.current.click()}
              disabled={busy}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                pendingFile
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-400"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{busy ? "..." : pendingFile ? "تم الرفع ✓" : "اختر ملف"}</span>
            </button>
            <input
              ref={ref}
              type="file"
              onChange={pickFile}
              className="hidden"
            />
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={add}
              disabled={!pendingName || !pendingFile || busy}
              className="w-full px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة
            </button>
          </div>
        </div>

        {pendingFile && (
          <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 flex-wrap gap-2">
            <span className="truncate flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>جاهز للإضافة: {pendingFile.fileName} ({formatFileSize(pendingFile.size)})</span>
            </span>
            <button
              type="button"
              onClick={add}
              disabled={!pendingName}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> اضغط لإدراج المستند في القائمة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttachmentsEditor;
