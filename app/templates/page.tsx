"use client";
import { useEffect, useState } from "react";
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/components/Toast";

interface Template {
  id: number;
  name: string;
  body: string;
  mediaUrl: string | null;
  category: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "marketing", label: "تسويق", color: "bg-green-100 text-green-700" },
  { value: "support", label: "دعم عملاء", color: "bg-blue-100 text-blue-700" },
  { value: "reminder", label: "تذكير", color: "bg-yellow-100 text-yellow-700" },
  { value: "other", label: "أخرى", color: "bg-gray-100 text-gray-700" },
];

export default function TemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ name: "", body: "", mediaUrl: "", category: "marketing" });

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/templates");
    const data = await res.json();
    if (Array.isArray(data)) setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("تم حفظ القالب ✅");
      setForm({ name: "", body: "", mediaUrl: "", category: "marketing" });
      setShowForm(false);
      fetchTemplates();
    } else {
      toast.error("فشل الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    const res = await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { toast.success("تم الحذف"); fetchTemplates(); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ إلى الحافظة 📋");
  };

  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
            مكتبة القوالب
          </h2>
          <p className="text-gray-500 mt-1">احفظ رسائلك الجاهزة وأعد استخدامها في كل حملة بضغطة زر</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          قالب جديد
        </button>
      </header>

      {/* Create form */}
      {showForm && (
        <div className="card border-2 border-indigo-100 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4">إنشاء قالب جديد</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم القالب</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="مثال: رسالة ترحيب VIP" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نص الرسالة</label>
              <textarea required value={form.body} onChange={e => setForm({...form, body: e.target.value})}
                placeholder="اكتب نص الرسالة هنا... يمكن استخدام {{name}} و {{phone}} كمتغيرات"
                rows={4} className="input" />
              <p className="text-xs text-gray-400 mt-1">المتغيرات المتاحة: <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code> <code className="bg-gray-100 px-1 rounded">{"{{phone}}"}</code></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط الوسائط (اختياري)</label>
              <input value={form.mediaUrl} onChange={e => setForm({...form, mediaUrl: e.target.value})}
                placeholder="https://..." className="input" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">حفظ القالب</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCat === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          الكل ({templates.length})
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCat === c.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {c.label} ({templates.filter(t => t.category === c.value).length})
          </button>
        ))}
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="card h-40 bg-gray-50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-20 bg-gray-50 border-dashed">
          <DocumentTextIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400">لا توجد قوالب بعد</h3>
          <p className="text-gray-400 mt-2">أنشئ قالبك الأول واحفظ وقتك في الحملات القادمة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(template => {
            const cat = CATEGORIES.find(c => c.value === template.category);
            return (
              <div key={template.id} className="card group hover:border-indigo-200 hover:shadow-md transition-all relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{template.name}</h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${cat?.color}`}>
                      {cat?.label}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(template.body)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="نسخ النص">
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">{template.body}</p>
                {template.mediaUrl && (
                  <p className="text-xs text-indigo-600 mt-2 truncate">📎 {template.mediaUrl}</p>
                )}
                <p className="text-[10px] text-gray-300 mt-3">
                  {new Date(template.createdAt).toLocaleDateString("ar-EG")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
