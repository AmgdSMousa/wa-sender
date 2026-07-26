"use client";

import { useEffect, useState } from "react";
import { 
  NoSymbolIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  UserIcon
} from "@heroicons/react/24/outline";

interface Contact {
  id: number;
  name?: string;
  phone: string;
  source?: string;
  createdAt?: string;
}

export default function BlacklistPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/blacklist");
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return alert("يرجى إدخال رقم الهاتف");
    setAdding(true);
    try {
      const res = await fetch("/api/contacts/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, name: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewPhone("");
        setNewName("");
        fetchBlacklist();
      } else {
        alert("فشل الإضافة: " + (data.error || "خطأ غير معروف"));
      }
    } catch (err) {
      alert("حدث خطأ أثناء الإضافة");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("هل أنت متأكد من فك الحظر وإعادة الرقم للقائمة النشطة؟")) return;
    try {
      const res = await fetch("/api/contacts/blacklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchBlacklist();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.phone.includes(searchTerm) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <NoSymbolIcon className="h-8 w-8 text-red-500" />
            <span>إدارة القائمة السوداء (Blacklist)</span>
          </h2>
          <p className="text-gray-500 mt-1">
            الأرقام الموقوفة عن استلام الرسائل تلقائياً (عبر كلمة إيقاف) أو المحظورة يدوياً.
          </p>
        </div>
        <button
          onClick={fetchBlacklist}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2 self-start md:self-auto"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </button>
      </header>

      {/* Add manually card */}
      <div className="card border-2 border-red-100 bg-red-50/20">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PlusIcon className="h-5 w-5 text-red-600" />
          <span>حظر رقم يدوياً</span>
        </h3>
        <form onSubmit={handleAddBlacklist} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <PhoneIcon className="h-5 w-5 text-gray-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="رقم الهاتف (مثال: 966500000000)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="input pr-10"
              required
            />
          </div>
          <div className="relative">
            <UserIcon className="h-5 w-5 text-gray-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="الاسم (اختياري)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input pr-10"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            {adding ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <NoSymbolIcon className="h-5 w-5" />}
            <span>إضافة للقائمة السوداء</span>
          </button>
        </form>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالرقم أو الاسم..."
              className="input pr-10"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            إجمالي الأرقام الموقوفة: <span className="text-red-600 font-bold">{contacts.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="card h-40 bg-gray-50 animate-pulse flex items-center justify-center">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 bg-gray-50 border-dashed">
            <NoSymbolIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-400">لا توجد أرقام في القائمة السوداء</h3>
            <p className="text-xs text-gray-400 mt-1">الأرقام التي تحظر الإرسال ستظهر هنا تلقائياً</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden border border-gray-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                  <tr>
                    <th className="p-4">الرقم</th>
                    <th className="p-4">الاسم</th>
                    <th className="p-4">مصدر الحظر</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-800">{c.phone}</td>
                      <td className="p-4 text-gray-600">{c.name || "بدون اسم"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.source === 'bot_optout' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {c.source === 'bot_optout' ? 'طلب إلغاء الاشتراك (إيقاف)' : 'حظر يدوي'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleRemove(c.id)}
                          className="btn btn-secondary text-xs text-green-600 hover:bg-green-50 border-green-200 inline-flex items-center gap-1"
                          title="إعادة الرقم للخدمة"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>فك الحظر</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
