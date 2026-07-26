"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useToast } from "./Toast";
import { 
  DocumentPlusIcon, 
  ClipboardDocumentIcon,
  XMarkIcon,
  CheckIcon,
  UsersIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

interface Contact {
  id?: number;
  phone: string;
  name?: string;
  metadata?: string;
  tags?: string;
}

interface Props {
  onImport: (contacts: Contact[]) => void;
}

export default function ContactImporter({ onImport }: Props) {
  const toast = useToast();
  const [importMode, setImportMode] = useState<"file" | "paste" | "manual" | "crm">("file");
  const [manualContact, setManualContact] = useState<Contact>({ phone: "", name: "", tags: "" });
  const [pasteValue, setPasteValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [crmContacts, setCrmContacts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [crmSearch, setCrmSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [defaultCC, setDefaultCC] = useState("20"); // Default Egypt

  // Fetch CRM contacts when in CRM mode
  useEffect(() => {
    if (importMode === "crm") {
      setLoading(true);
      fetch("/api/contacts")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCrmContacts(data);
        })
        .finally(() => setLoading(false));
    }
  }, [importMode]);

  const uniqueTags = Array.from(new Set(crmContacts.flatMap(c => (c.tags || "").split(",").filter(Boolean).map((t: string) => t.trim()))));

  const cleanPhone = (phone: string, countryCode: string) => {
    let cleaned = phone.replace(/\D/g, "");
    
    // Handle international format (+ or 00)
    if (phone.startsWith("+") || phone.startsWith("00")) {
       if (phone.startsWith("00")) cleaned = cleaned.substring(2);
       return cleaned.length >= 7 ? cleaned : null;
    }

    // Smart Normalization based on country code
    // If starts with 0 (e.g. 011), replace 0 with countryCode
    if (cleaned.startsWith("0")) {
      cleaned = countryCode + cleaned.substring(1);
    } 
    // If it's a short local number (e.g. 11...), prepend countryCode
    else if (cleaned.length <= 10 && !cleaned.startsWith(countryCode)) {
      cleaned = countryCode + cleaned;
    }

    return cleaned.length >= 7 ? cleaned : null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedContacts: Contact[] = (data
          .map((row) => {
            const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('رقم') || k.toLowerCase().includes('هاتف'));
            const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('اسم'));
            const rawPhone = phoneKey ? String(row[phoneKey]) : String(Object.values(row)[0]);
            const cleaned = cleanPhone(rawPhone, defaultCC);
            if (cleaned) {
              const nameValue = nameKey ? String(row[nameKey]) : undefined;
              const metadataObj = { ...row };
              if (phoneKey) delete metadataObj[phoneKey];
              if (nameKey) delete metadataObj[nameKey];
              return { phone: cleaned, name: nameValue, metadata: JSON.stringify(metadataObj) };
            }
            return null;
          })
          .filter((c) => c !== null) as Contact[]);

        onImport(importedContacts);
        e.target.value = "";
      } catch (err) {
        toast.error("فشل قراءة الملف.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePasteImport = () => {
    const lines = pasteValue.split("\n");
    const importedContacts: Contact[] = lines
      .map((line) => {
        const cleaned = cleanPhone(line, defaultCC);
        return cleaned ? { phone: cleaned } : null;
      })
      .filter((c): c is Contact => c !== null);

    onImport(importedContacts);
    setPasteValue("");
    toast.success(`تم استيراد ${importedContacts.length} رقم بنجاح ✅`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setImportMode("file")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${importMode === "file" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
          >
            رفع ملف Excel
          </button>
          <button
            onClick={() => setImportMode("paste")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${importMode === "paste" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
          >
            نسخ ولصق أرقام
          </button>
          <button
            onClick={() => setImportMode("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${importMode === "manual" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
          >
            إضافة يدوية
          </button>
          <button
            onClick={() => setImportMode("crm")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${importMode === "crm" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
          >
            من قاعدة البيانات
          </button>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
           <GlobeAltIcon className="h-4 w-4 text-indigo-600" />
           <span className="text-xs font-bold text-indigo-600">كود الدولة:</span>
           <input 
             type="text" 
             value={defaultCC} 
             onChange={(e) => setDefaultCC(e.target.value.replace(/\D/g, ""))}
             className="w-12 bg-transparent border-b border-indigo-200 outline-none text-center text-sm font-bold text-indigo-700 h-6"
             placeholder="20"
           />
        </div>
      </div>

      {importMode === "file" && (
        <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-400 transition-colors group">
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="space-y-2">
            <DocumentPlusIcon className="h-10 w-10 text-gray-400 mx-auto group-hover:text-green-500 transition-colors" />
            <p className="text-sm font-medium text-gray-700">اضغط هنا أو اسحب ملف Excel</p>
            <p className="text-xs text-gray-400 font-medium">سيتم تطبيق كود الدولة (+{defaultCC}) تلقائياً للأرقام المحلية</p>
          </div>
        </div>
      )}

      {importMode === "paste" && (
        <div className="space-y-4">
          <textarea value={pasteValue} onChange={(e) => setPasteValue(e.target.value)} placeholder="ضع الأرقام هنا، رقم في كل سطر..." className="input min-h-[150px] font-mono text-sm" />
          <button onClick={handlePasteImport} disabled={!pasteValue.trim()} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <ClipboardDocumentIcon className="h-5 w-5" />
            <span>استيراد الأرقام المنسوقة لـ (+{defaultCC})</span>
          </button>
        </div>
      )}

      {importMode === "manual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">رقم الهاتف (بدون كود الدولة لو محلي)</label>
              <input type="text" value={manualContact.phone} onChange={(e) => setManualContact({...manualContact, phone: e.target.value})} placeholder="011..." className="input" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">الاسم (اختياري)</label>
              <input type="text" value={manualContact.name} onChange={(e) => setManualContact({...manualContact, name: e.target.value})} placeholder="اسم العميل" className="input" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">الوسوم (اختياري - مفصلة بفاصلة)</label>
            <input type="text" value={manualContact.tags} onChange={(e) => setManualContact({...manualContact, tags: e.target.value})} placeholder="VIP, Lead, 2025" className="input" />
          </div>
          <button onClick={() => {
              const cleaned = cleanPhone(manualContact.phone, defaultCC);
              if (!cleaned) return alert("يرجى إدخال رقم هاتف صحيح");
              onImport([{ ...manualContact, phone: cleaned }]);
              setManualContact({ phone: "", name: "", tags: "" });
            }} disabled={!manualContact.phone} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <CheckIcon className="h-5 w-5" />
            <span>حفظ بنظام (+{defaultCC})</span>
          </button>
        </div>
      )}

      {importMode === "crm" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
             <input type="text" placeholder="ابحث بالاسم أو الرقم في CRM..." className="input flex-1" value={crmSearch} onChange={(e) => setCrmSearch(e.target.value)} />
             <select className="input flex-1 md:max-w-[200px]" value={selectedTag || ""} onChange={(e) => setSelectedTag(e.target.value || null)}>
               <option value="">جميع الوسوم</option>
               {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
             </select>
          </div>

          <div className="max-h-[300px] overflow-y-auto border rounded-xl divide-y bg-gray-50/30">
            {loading ? (
              <div className="p-8 text-center text-gray-400">جاري تحميل جهات الاتصال...</div>
            ) : crmContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">لا يوجد جهات اتصال محفوظة في CRM</div>
            ) : (
              crmContacts
                .filter(c => {
                  const matchesSearch = (c.name || "").toLowerCase().includes(crmSearch.toLowerCase()) || c.phone.includes(crmSearch);
                  const matchesTag = !selectedTag || (c.tags || "").includes(selectedTag);
                  return matchesSearch && matchesTag;
                })
                .map(contact => (
                <label key={contact.id} className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors">
                  <input type="checkbox" className="checkbox" checked={selectedIds.has(contact.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedIds);
                      if (e.target.checked) newSelected.add(contact.id);
                      else newSelected.delete(contact.id);
                      setSelectedIds(newSelected);
                    }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{contact.name || contact.phone}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{contact.phone}</p>
                  </div>
                  {contact.tags && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{contact.tags}</span>}
                </label>
              ))
            )}
          </div>

          <div className="flex gap-3">
             <button onClick={() => {
                const visibleIds = crmContacts.filter(c => {
                  const matchesSearch = (c.name || "").toLowerCase().includes(crmSearch.toLowerCase()) || c.phone.includes(crmSearch);
                  const matchesTag = !selectedTag || (c.tags || "").includes(selectedTag);
                  return matchesSearch && matchesTag;
                }).map(c => c.id);
                setSelectedIds(new Set(visibleIds));
              }} className="btn btn-secondary text-xs flex-1">تحديد كل المصفى</button>
             <button onClick={() => setSelectedIds(new Set())} className="btn btn-secondary text-xs flex-1">إلغاء التحديد</button>
             <button disabled={selectedIds.size === 0} onClick={() => {
                const selected = crmContacts.filter(c => selectedIds.has(c.id));
                onImport(selected);
              }} className="btn btn-primary text-xs flex-[2] flex justify-center items-center gap-2">
               <CheckIcon className="h-4 w-4" />
               <span>استيراد المختار ({selectedIds.size})</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
