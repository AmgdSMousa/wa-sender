"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function KnowledgeBase() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !content) return;

    setAdding(true);
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content }),
      });
      setFileName("");
      setContent("");
      fetchFiles();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تأكد من حذف هذا الملف المعرفي؟')) return;
    
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <DocumentTextIcon className="w-8 h-8 text-indigo-600" />
          قاعدة المعرفة (AI Context RAG)
        </h2>
        <p className="text-gray-500">
          أضف هنا المعلومات التي ترغب أن يستعين بها الذكاء الاصطناعي للإجابة على استفسارات عملائك (مثل عروض الأسعار، تفاصيل المنتجات).
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card md:col-span-1">
          <h3 className="font-bold mb-4 text-emerald-800 bg-emerald-50 w-fit px-3 py-1 rounded-full text-sm">
            إضافة معلومات للذكاء الاصطناعي
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">اسم الملف / الموضوع</label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: أسعار الهواتف"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">المحتوى</label>
              <textarea
                className="input-field h-32"
                placeholder="تفاصيل العروض والأسعار هنا لتتغذى بها نماذج الذكاء الاصطناعي..."
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {adding ? 'جاري الإضافة...' : 'حفظ بالقاعدة المعرفية'}
            </button>
          </form>
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-bold mb-4 text-sky-800 bg-sky-50 w-fit px-3 py-1 rounded-full text-sm">
            البيانات المخزنة
          </h3>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">
              لا يوجد معلومات مضافة بعد.
            </p>
          ) : (
            <div className="space-y-4">
              {files.map(kb => (
                <div key={kb.id} className="border border-gray-100 p-4 rounded-xl flex items-start justify-between bg-white shadow-sm hover:shadow-md transition">
                  <div>
                    <h4 className="font-semibold text-gray-800">{kb.fileName}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {kb.content}
                    </p>
                    <span className="text-xs text-gray-400 mt-3 block">
                      {new Date(kb.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="حذف"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
