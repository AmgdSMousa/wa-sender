"use client";

import { useEffect, useState } from "react";
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  TrashIcon, 
  HandThumbUpIcon,
  TagIcon
} from "@heroicons/react/24/outline";

interface Rule {
  id: number;
  keyword: string;
  reply: string;
  matchType: string;
  mediaUrl?: string;
  isActive: boolean;
}

export default function Bot() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState({ keyword: "", reply: "", matchType: "exact", mediaUrl: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/bot/rules");
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/bot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        setNewRule({ keyword: "", reply: "", matchType: "exact", mediaUrl: "" });
        fetchRules();
      }
    } catch (err) {
      alert("فشل إضافة القاعدة");
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setNewRule({ ...newRule, mediaUrl: data.url });
      }
    } catch (err) {
      alert("فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
    try {
      await fetch("/api/bot/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchRules();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">الشات بوت الذكي</h2>
        <p className="text-gray-500 mt-1">قم بإعداد ردود تلقائية بناءً على الكلمات المفتاحية</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Add Rule Form */}
        <div className="md:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PlusIcon className="h-5 w-5 text-green-600" />
              <span>إضافة قاعدة جديدة</span>
            </h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكلمة المفتاحية</label>
                <div className="relative">
                  <TagIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
                  <input 
                    required
                    value={newRule.keyword}
                    onChange={(e) => setNewRule({...newRule, keyword: e.target.value})}
                    placeholder="مثال: سعر، سلام، تفاصيل"
                    className="input pr-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع المطابقة</label>
                <select 
                  value={newRule.matchType}
                  onChange={(e) => setNewRule({...newRule, matchType: e.target.value})}
                  className="input"
                >
                  <option value="exact">تطابق تام (Exact)</option>
                  <option value="contains">يحتوي على (Contains)</option>
                  <option value="starts_with">يبدأ بـ (Starts With)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرد التلقائي</label>
                <textarea 
                  required
                  value={newRule.reply}
                  onChange={(e) => setNewRule({...newRule, reply: e.target.value})}
                  placeholder="اكتب الرد الذي سيصل للعميل..."
                  className="input min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إرفاق وسائط (اختياري)</label>
                <input 
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="bot-media-upload"
                />
                <label 
                  htmlFor="bot-media-upload"
                  className="btn btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>{uploading ? "جاري الرفع..." : "اختر صورة أو فيديو"}</span>
                </label>
                {newRule.mediaUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <HandThumbUpIcon className="h-3 w-3" />
                    تم تجهيز الملف
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary w-full py-3"
              >
                {loading ? "جاري الحفظ..." : "حفظ القاعدة"}
              </button>
            </form>
          </div>
        </div>

        {/* Rules List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700">القواعد الحالية ({rules.length})</h3>
          </div>

          {rules.length === 0 ? (
            <div className="card text-center py-20 bg-gray-50 border-dashed">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400">لا توجد قواعد بعد</h3>
              <p className="text-gray-400 mt-2">ابدأ بإضافة أول قاعدة رد تلقائي الآن</p>
            </div>
          ) : (
            rules.map((rule: any) => (
              <div key={rule.id} className="card relative group hover:border-green-200 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">كلمة: {rule.keyword}</span>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                        {rule.matchType === 'exact' ? 'مطابقة تامة' : 
                         rule.matchType === 'contains' ? 'يحتوي على' : 'يبدأ بـ'}
                      </span>
                      {rule.mediaUrl && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">مرفق وسائط 🖼️</span>}
                      {!rule.isActive && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">معطلة</span>}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{rule.reply}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <TrashIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
