import React, { useState, useEffect } from "react";
import { Filter, CheckCircle2, FileSpreadsheet, Download, RefreshCw, Smartphone, AlertCircle, Copy } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function NumberFilterView() {
  const { language } = useLanguage();
  const [rawInput, setRawInput] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [results, setResults] = useState<{ phone: string; checked: boolean; exists: boolean }[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleCopyValid = () => {
    const validNumbers = results.filter(r => r.exists).map(r => r.phone).join("\n");
    if (!validNumbers) return;
    navigator.clipboard.writeText(validNumbers);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetch("/api/devices")
      .then(r => r.json())
      .then(data => {
        const connected = data.filter((d: any) => d.status === "connected");
        setDevices(connected);
        if (connected.length > 0) setSelectedDevice(connected[0].id);
      })
      .catch(console.error);
  }, []);

  const handleFilter = async () => {
    if (!rawInput.trim()) return;
    if (!selectedDevice) {
      alert(language === "ar" ? "يرجى توصيل جهاز واتساب أولاً في علامة تبويب الأجهزة." : "Please connect a WhatsApp device first in the Devices tab.");
      return;
    }
    
    setIsFiltering(true);
    
    // Extract phones (preventing \s from crossing newlines by using [ \t])
    const phoneRegex = /\+?[0-9][0-9 \t-]{6,}[0-9]/g;
    const matches = rawInput.match(phoneRegex) || [];
    
    // Clean and unique
    const uniquePhones = Array.from(new Set(matches.map(m => m.replace(/[^\d+]/g, "")))) as string[];
    
    if (uniquePhones.length === 0) {
      alert(language === "ar" ? "لم يتم العثور على أرقام هواتف صالحة للتصفية." : "No valid phone numbers found to filter.");
      setIsFiltering(false);
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice, numbers: uniquePhones })
      });
      const data = await res.json();
      if (res.ok && data.results) {
        setResults(data.results.map((r: any) => ({ ...r, checked: true })));
      } else {
        alert(data.error || (language === "ar" ? "فشل التحقق من الأرقام." : "Failed to check numbers."));
      }
    } catch(e) {
      alert(language === "ar" ? "خطأ في التحقق من الأرقام." : "Error checking numbers.");
    } finally {
      setIsFiltering(false);
    }
  };

  const downloadCSV = (data: {phone: string}[], filename: string) => {
    if (data.length === 0) return;
    const headers = "Phone\n";
    const rows = data.map(r => `"${r.phone}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Filter className="w-7 h-7 text-emerald-600" />
            {language === "ar" ? "منظف أرقام الهواتف" : "Phone Number Cleaner"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{language === "ar" ? "استخراج وتنسيق وإزالة تكرار أرقام الهواتف قبل استيرادها." : "Extract, normalize, and de-duplicate phone numbers before importing them."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                {language === "ar" ? "الأرقام الخام" : "Raw Numbers"}
              </h2>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "مرسل التحقق من واتساب" : "WhatsApp Verification Sender"}</label>
              <select 
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
              >
                <option value="">{language === "ar" ? "-- حدد الجهاز المتصل --" : "-- Select connected device --"}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.phone || (language === "ar" ? 'متصل' : 'Connected')})</option>
                ))}
              </select>
            </div>
            
            <textarea
              className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-mono whitespace-pre-wrap"
              placeholder={language === "ar" ? "الصق الأرقام هنا (أي صيغة، نص، CSV)...\nمثال\n+1234567890\n+44987654321\nجون دو - 555-0199" : "Paste numbers here (any format, text, CSV)...\ne.g.\n+1234567890\n+44987654321\nJohn Doe - 555-0199"}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              disabled={isFiltering}
            />
            
            <button
              onClick={handleFilter}
              disabled={isFiltering || !rawInput.trim()}
              className="mt-4 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFiltering ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                   {language === "ar" ? "جاري تنظيف الأرقام..." : "Cleaning Numbers..."}
                </>
              ) : (
                <>
                  <Filter className="w-5 h-5" />
                   {language === "ar" ? "تنظيف الأرقام" : "Clean Numbers"}
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">{language === "ar" ? "يتم التحقق من الأرقام عبر خوادم واتساب النشطة." : "Numbers are verified against active WhatsApp servers."}</p>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
               {language === "ar" ? "الأرقام المنظفة" : "Cleaned Numbers"}
            </h2>

            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                <Filter className="w-12 h-12 mb-3 opacity-20" />
                <p>{language === "ar" ? "قم بتشغيل الفلتر لرؤية النتائج هنا" : "Run the filter to see results here"}</p>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-6">
                
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-emerald-600">{results.length}</span>
                  <span className="text-xs text-emerald-800 font-medium">{language === "ar" ? "أرقام فريدة ومنسقة" : "Unique, normalized numbers"}</span>
                </div>

                {/* Lists Preview */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-mono text-gray-700">{r.phone}</span>
                      {r.exists ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {language === "ar" ? "موجود" : "Exists"}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {language === "ar" ? "غير صالح" : "Invalid"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Export Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleCopyValid}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? (language === "ar" ? "تم النسخ!" : "Copied!") : (language === "ar" ? "نسخ الصالحة" : "Copy Valid")}
                  </button>
                  <button
                    onClick={() => downloadCSV(results.filter(r => r.exists), "Valid_WhatsApp_Numbers.csv")}
                    className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {language === "ar" ? "تصدير الصالحة (CSV)" : "Export Valid (CSV)"}
                  </button>
                  <button
                    onClick={() => downloadCSV(results, "All_Filtered_Numbers.csv")}
                    className="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                    {language === "ar" ? "تصدير الكل" : "Export All"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
