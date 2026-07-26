"use client";

import { useEffect, useState } from "react";
import { 
  UsersIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  TagIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import ContactImporter from "@/components/ContactImporter";
import * as XLSX from "xlsx";

interface Contact {
  id: number;
  name: string;
  phone: string;
  tags?: string;
  source?: string;
  metadata?: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (contacts.length === 0) return alert("لا توجد جهات اتصال لتصديرها");
    const exportData = contacts.map((c) => ({
      "الاسم": c.name || "",
      "رقم الهاتف": c.phone,
      "الوسوم (Tags)": c.tags || "",
      "المصدر": c.source === "group" ? "سحب المجموعات" : "استيراد ملف",
      "بيانات إضافية": c.metadata || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "جهة اتصال");
    XLSX.writeFile(workbook, `contacts_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleBulkImport = async (newContacts: any[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: newContacts })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`تمت معالجة ${newContacts.length} جهة اتصال. تم إضافة لـ ${data.count} جهة جديدة (تم تجاهل المكرر).`);
        setShowAdd(false);
        fetchContacts();
      } else {
        alert("فشل الحفظ: " + data.error);
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف جهة الاتصال هذه؟")) return;
    try {
      const res = await fetch("/api/contacts", {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchContacts();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  const filteredContacts = contacts.filter(c => 
    (c.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.tags?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">إدارة العملاء (CRM)</h2>
          <p className="text-gray-500 mt-1">العملاء المحفوظين في قاعدة البيانات من Excel أو المجموعات</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportExcel} 
            className="btn btn-secondary flex items-center gap-2 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            title="تصدير القائمة إلى ملف Excel"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            className={`btn ${showAdd ? "btn-secondary" : "btn-primary"} flex items-center gap-2`}
          >
            <UsersIcon className="h-5 w-5" />
            <span>{showAdd ? "إغلاق القائمة" : "إضافة جهات اتصال"}</span>
          </button>
          <button 
            onClick={fetchContacts} 
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {showAdd && (
        <div className="card border-2 border-indigo-100 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold text-gray-800">إضافة عملاء جدد</h3>
             <p className="text-sm text-gray-400 font-medium italic">سيتم تجاهل أي أرقام مسجلة مسبقاً تلقائياً لعدم تكرار البيانات.</p>
          </div>
          <ContactImporter onImport={handleBulkImport} />
          {saving && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
              <div className="flex flex-col items-center gap-3">
                <ArrowPathIcon className="h-10 w-10 text-indigo-600 animate-spin" />
                <p className="font-bold text-indigo-600">جاري حفظ البيانات...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بـ الاسم، الرقم، أو الوسم (Tag)..."
            className="input pr-10"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          إجمالي المسجلين: <span className="text-indigo-600 font-bold">{contacts.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card h-32 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="card text-center py-20 bg-gray-50 border-dashed">
          <UsersIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400">لا يوجد عملاء مطابقين</h3>
          <p className="text-gray-400 mt-2">ابدأ بإضافة عملاء من خلال قسم الحملات أو سحب المجموعات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="card group hover:border-indigo-200 transition-all hover:shadow-md relative overflow-hidden">
               {/* Metadata visual cue */}
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <button 
                  onClick={() => handleDelete(contact.id)}
                  className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="حذف العميل"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              
              <h4 className="font-bold text-gray-800 truncate mb-1" title={contact.name}>{contact.name || contact.phone}</h4>
              <p className="text-xs text-gray-400 mb-4">{contact.phone}</p>
              
              {contact.tags && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {contact.tags.split(',').map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full flex items-center gap-1 font-medium"
                    >
                      <TagIcon className="h-3 w-3" />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              
              {contact.source && (
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  المصدر: {contact.source === 'group' ? 'سحب المجموعات' : 'استيراد ملف'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
