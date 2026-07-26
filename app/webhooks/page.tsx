"use client";
import { useEffect, useState } from "react";
import {
  LinkIcon,
  PlusIcon,
  TrashIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/components/Toast";

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string;
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export default function WebhooksPage() {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "" });

  const fetchWebhooks = async () => {
    setLoading(true);
    const res = await fetch("/api/webhooks");
    const data = await res.json();
    if (Array.isArray(data)) setWebhooks(data);
    setLoading(false);
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setNewSecret(data.secret);
      setForm({ name: "", url: "" });
      setShowForm(false);
      fetchWebhooks();
    } else {
      toast.error("فشل الإنشاء: " + data.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد؟ سيتم حذف مفتاح الـ API.")) return;
    await fetch("/api/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchWebhooks();
    toast.success("تم الحذف");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label} 📋`);
  };

  const apiHost = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <LinkIcon className="h-8 w-8 text-purple-600" />
            الـ API والربط الخارجي
          </h2>
          <p className="text-gray-500 mt-1">أنشئ مفاتيح API لربط منصتك بـ Shopify, WooCommerce, Zapier, n8n وغيرها</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          مفتاح API جديد
        </button>
      </header>

      {/* API Docs Card */}
      <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-xl">
            <CodeBracketIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">توثيق الـ API</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="bg-white rounded-xl p-4 border border-purple-100">
            <p className="text-gray-500 mb-2 font-medium">إرسال رسالة (POST)</p>
            <code className="text-purple-700 text-xs block">{apiHost}/api/v1/send</code>
          </div>
          <div className="bg-white rounded-xl p-4 border border-purple-100 overflow-x-auto">
            <p className="text-gray-500 mb-2 font-medium">مثال على الطلب (cURL):</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">{`curl -X POST ${apiHost}/api/v1/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"phone":"201012345678","message":"مرحبا من API!"}'`}</pre>
            <button onClick={() => copyToClipboard(`curl -X POST ${apiHost}/api/v1/send -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" -d '{"phone":"201012345678","message":"مرحبا من API!"}'`, "الكود")}
              className="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
              <ClipboardDocumentIcon className="h-3.5 w-3.5" /> نسخ
            </button>
          </div>
        </div>
      </div>

      {/* New secret alert */}
      {newSecret && (
        <div className="card border-2 border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-green-800 mb-1">✅ تم إنشاء مفتاح API الخاص بك!</h4>
              <p className="text-green-700 text-sm mb-3">⚠️ احفظ هذا المفتاح الآن - لن يظهر مرة أخرى:</p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-green-200">
                <KeyIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                <code className="text-green-700 font-mono text-sm flex-1 break-all">{newSecret}</code>
                <button onClick={() => copyToClipboard(newSecret, "المفتاح")}
                  className="btn btn-primary text-xs py-1 px-3 flex-shrink-0 flex items-center gap-1">
                  <ClipboardDocumentIcon className="h-4 w-4" /> نسخ
                </button>
              </div>
              <button onClick={() => setNewSecret(null)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">إخفاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card border-2 border-purple-100 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4">إنشاء مفتاح API جديد</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التكامل</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="مثال: Shopify Store" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رابط الاستقبال (اختياري)</label>
                <input value={form.url} onChange={e => setForm({...form, url: e.target.value})}
                  placeholder="https://..." className="input" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">إنشاء المفتاح</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Webhooks list */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card h-24 bg-gray-50 animate-pulse" />)}</div>
      ) : webhooks.length === 0 ? (
        <div className="card text-center py-20 bg-gray-50 border-dashed">
          <LinkIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400">لا توجد تكاملات مُعدّة</h3>
          <p className="text-gray-400 mt-2">أنشئ مفتاح API أول لتبدأ في ربط منصتك بالأنظمة الخارجية</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => (
            <div key={wh.id} className="card hover:shadow-md transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <KeyIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{wh.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">{wh.secret}</code>
                      <button onClick={() => copyToClipboard(wh.secret, "المفتاح")}
                        className="text-gray-300 hover:text-purple-600 transition-colors opacity-0 group-hover:opacity-100">
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {wh.url && <p className="text-xs text-gray-400 mt-1">{wh.url}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{new Date(wh.createdAt).toLocaleDateString("ar-EG")}</span>
                  <button onClick={() => handleDelete(wh.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
