import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { MapPin, Search, Download, Database, Map, Loader2, Store, Phone, Link2 } from "lucide-react";

export default function MapsExtractorView() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<{ name: string; phone: string; address: string; website: string }[]>([]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;

    setIsExtracting(true);
    setResults([]);

    try {
      const response = await fetch('/api/maps/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || (language === "ar" ? "فشل في استخراج بيانات الخريطة" : "Failed to extract map data"));
      }

      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        alert(language === "ar" ? "لا توجد نتائج لهذا الاستعلام/الموقع." : "No results found for this query/location.");
      }
    } catch (err: any) {
      alert((language === "ar" ? "خطأ: " : "Error: ") + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    const headers = "Name,Phone,Address,Website\n";
    const rows = results.map(r => `"${r.name}","${r.phone}","${r.address}","${r.website}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Maps_Extraction_${query.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-7 h-7 text-emerald-600" />
            {language === "ar" ? "مستخرج خرائط جوجل" : "Google Maps Extractor"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{language === "ar" ? "استخراج بيانات الاتصال بالشركات والمتاجر مباشرة من الخرائط." : "Extract company and store contact data directly from Maps."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Search Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "استعلام الاستخراج" : "Extraction Query"}
            </h2>
            
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{language === "ar" ? "فئة العمل / الكلمة الرئيسية" : "Business Category / Keyword"}</label>
                <div className="relative">
                  <Store className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={language === "ar" ? "مثال: العقارات، المطاعم..." : "e.g. Real Estate, Restaurants..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    disabled={isExtracting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{language === "ar" ? "الموقع / المدينة" : "Location / City"}</label>
                <div className="relative">
                  <Map className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={language === "ar" ? "مثال: دبي، نيويورك..." : "e.g. Dubai, New York..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                    disabled={isExtracting}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isExtracting || !query.trim() || !location.trim()}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {language === "ar" ? "جاري استخراج البيانات..." : "Scraping Data..."}
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      {language === "ar" ? "بدء الاستخراج" : "Start Extraction"}
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <h3 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {language === "ar" ? "كيف تعمل" : "How it works"}
              </h3>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                {language === "ar" ? "يستعلم المستخرج من أدلة خرائط جوجل عن الأنشطة التجارية التي تطابق كلمتك الرئيسية في الموقع المحدد، ويحلل أرقام الهواتف العامة وتفاصيلها لحملات التواصل." : "The extractor queries Google Maps directories for businesses matching your keyword in the specified location, parsing their public phone numbers and details for outreach campaigns."}
              </p>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                {language === "ar" ? "البيانات المستخرجة" : "Extracted Data"}
                {results.length > 0 && (
                  <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    {results.length} {language === "ar" ? "نتائج" : "results"}
                  </span>
                )}
              </h2>

              {results.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="py-1.5 px-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {language === "ar" ? "تصدير CSV" : "Export CSV"}
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                {isExtracting ? (
                  <Loader2 className="w-10 h-10 mb-3 text-emerald-500 animate-spin" />
                ) : (
                  <MapPin className="w-12 h-12 mb-3 opacity-20" />
                )}
                <p>{isExtracting ? (language === "ar" ? "الاتصال بخوادم الخرائط..." : "Connecting to map servers...") : (language === "ar" ? "ستظهر النتائج هنا" : "Results will appear here")}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">{language === "ar" ? "اسم العمل" : "Business Name"}</th>
                      <th className="px-4 py-3 font-medium">{language === "ar" ? "رقم الهاتف" : "Phone Number"}</th>
                      <th className="px-4 py-3 font-medium">{language === "ar" ? "العنوان" : "Address"}</th>
                      <th className="px-4 py-3 font-medium">{language === "ar" ? "الموقع الإلكتروني" : "Website"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            {r.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">{r.address}</td>
                        <td className="px-4 py-3 text-gray-500">
                          <a href={`https://${r.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-600">
                            <Link2 className="w-3.5 h-3.5" />
                            {r.website}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
