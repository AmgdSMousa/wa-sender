import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { 
  Users, 
  UserMinus, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  FileDown, 
  Clipboard, 
  Sparkles, 
  UserX,
  FileSpreadsheet
} from "lucide-react";

interface SubscribersViewProps {
  unsubscribedList: string[];
  onAddUnsubscribed: (phone: string) => void;
  onRemoveUnsubscribed: (phone: string) => void;
  onImportNumbersToCampaign: (numbers: { phone: string; name?: string }[]) => void;
}

export default function SubscribersView({ 
  unsubscribedList, 
  onAddUnsubscribed, 
  onRemoveUnsubscribed,
  onImportNumbersToCampaign
}: SubscribersViewProps) {
  const { language } = useLanguage();
  // Unsubscriber search & add
  const [newUnsubPhone, setNewUnsubPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [extractionMode, setExtractionMode] = useState<
    "chatLog" |
    "groupLink" |
    "groupName" |
    "correspondent" |
    "archived" |
    "contacts" |
    "socialMedia"
  >("chatLog");

  // Group scraper / contact extractor state
  const [groupInput, setGroupInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [extractedContacts, setExtractedContacts] = useState<{ phone: string; name: string }[]>([]);

  // Trigger group contacts extraction
  const handleExtractGroupContacts = () => {
    if (extractionMode !== "chatLog") {
      if (!targetInput.trim()) return;
      alert(language === "ar" ? "ميزة الاستخراج عبر الروابط/الأسماء تتطلب ربط البوت الخادم، وهي قيد التطوير حالياً. يرجى استخدام (تحليل سجل تصدير الدردشة) الآن." : "Extraction via links/names requires server bot integration and is currently under development. Please use 'Parse Chat Export Log' for now.");
      return;
    }

    if (!groupInput.trim()) return;

    // Matches phone number formats like +15550211, +1-555-0211, etc.
    const phoneRegex = /\+?[1-9]\d{1,14}(?:\s*\d+)*(-?\d+)+/g;
    const matches = groupInput.match(phoneRegex) || [];
    
    // Parse chat log lines to extract name mappings if any
    const lines = groupInput.split("\n");
    const contactsMap = new Map<string, string>();

    lines.forEach(line => {
      // Look for sender pattern: [Time] Name: message or Date Name: message
      const parts = line.split("]");
      if (parts.length > 1) {
        const body = parts[1].trim();
        const colonIdx = body.indexOf(":");
        if (colonIdx !== -1) {
          const sender = body.substring(0, colonIdx).trim();
          // Check if sender is a phone number or name
          const cleanPhone = sender.replace(/[^\d+]/g, "");
          if (cleanPhone && cleanPhone.length > 6) {
            contactsMap.set(cleanPhone, sender);
          } else if (sender.length > 0 && sender.length < 25) {
            // Find phone inside that line and map name
            const phoneMatch = body.match(phoneRegex);
            if (phoneMatch && phoneMatch[0]) {
              contactsMap.set(phoneMatch[0].replace(/[^\d+]/g, ""), sender);
            }
          }
        }
      }
    });

    // Make unique list
    const uniquePhones = Array.from(new Set(matches.map(m => m.replace(/[^\d+]/g, "")))) as string[];
    const finalContacts = uniquePhones.map(phone => {
      return {
        phone: phone.startsWith("+") ? phone : `+${phone}`,
        name: contactsMap.get(phone) || `Group Participant (${phone.substring(phone.length - 4)})`
      };
    });

    setExtractedContacts(finalContacts);
  };

  // Export extracted contacts to active campaign input
  const handleImportToCampaign = () => {
    if (extractedContacts.length === 0) return;
    onImportNumbersToCampaign(extractedContacts);
    alert(language === "ar" ? `تم استيراد ${extractedContacts.length} جهات اتصال مستخرجة من المجموعة مباشرة إلى حملتك!` : `Imported ${extractedContacts.length} extracted group contacts directly into your campaign!`);
  };

  // Save extracted list to file
  const handleDownloadExtractedCSV = () => {
    if (extractedContacts.length === 0) return;
    const headers = "Phone,Name\n";
    const rows = extractedContacts.map(c => `"${c.phone}","${c.name}"`).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Extracted_WhatsApp_Group_Contacts.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add phone number to blacklist
  const handleAddUnsubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnsubPhone.trim()) return;
    
    // Clean phone input
    const cleanPhone = newUnsubPhone.trim().replace(/[^\d+]/g, "");
    if (cleanPhone.length < 7) {
      alert(language === "ar" ? "يرجى تقديم رقم هاتف صالح مع رمز البلد." : "Please provide a valid phone number with country code.");
      return;
    }

    onAddUnsubscribed(cleanPhone);
    setNewUnsubPhone("");
  };

  // Filter blacklisted unsubscribers
  const filteredUnsubscribers = unsubscribedList.filter(phone => 
    phone.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="compliance-workspace">
      
      {/* Blacklist compliance - 6 columns */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              {language === "ar" ? `قائمة إلغاء الاشتراك (${unsubscribedList.length})` : `Opt-Out / Unsubscribe List (${unsubscribedList.length})`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "يتم استبعاد جهات الاتصال في هذه القائمة تلقائيًا من جميع الحملات الصادرة" : "Contacts in this list are automatically excluded from all outgoing campaigns"}</p>
          </div>

          <form onSubmit={handleAddUnsubscribe} className="mt-6 flex gap-2 text-xs">
            <input 
              type="text" 
              required
              value={newUnsubPhone}
              onChange={(e) => setNewUnsubPhone(e.target.value)}
              placeholder={language === "ar" ? "مثال: +15550299" : "e.g. +15550299"}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button 
              type="submit"
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" /> {language === "ar" ? "إضافة حظر" : "Add Block"}
            </button>
          </form>

          {/* Search blacklist */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === "ar" ? "البحث في الأرقام المحظورة..." : "Search blacklisted numbers..."}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100 focus:outline-hidden text-xs"
            />
          </div>

          {filteredUnsubscribers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border border-dashed border-gray-100 rounded-xl mt-4">
              <UserMinus className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <span className="text-xs">{language === "ar" ? "لا توجد جهات اتصال مطابقة ملغاة الاشتراك." : "No matching unsubscribed contacts."}</span>
            </div>
          ) : (
            <div className="mt-4 border border-gray-100 rounded-xl max-h-60 overflow-y-auto">
              <div className="divide-y divide-gray-50 text-xs">
                {filteredUnsubscribers.map(phone => (
                  <div key={phone} className="p-3.5 flex justify-between items-center hover:bg-gray-50/50">
                    <span className="font-mono font-bold text-gray-900">{phone}</span>
                    <button 
                      onClick={() => onRemoveUnsubscribed(phone)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {language === "ar" ? "إزالة الحظر" : "Remove block"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* WhatsApp Group Contact Extractor - 6 columns */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "مستخرج جهات اتصال مجموعات واتساب" : "WhatsApp Group Contacts Extractor"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "قم بلصق سجل تصدير دردشة مجموعة واتساب لتحليل واستخراج واستهداف جهات اتصال المجموعة غير المحفوظة" : "Paste a WhatsApp Group chat export log to parse, extract, and target non-saved group contacts"}</p>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "طريقة الاستخراج" : "Extraction Method"}</label>
              <select
                value={extractionMode}
                onChange={(e) => setExtractionMode(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 mb-3"
              >
                <option value="chatLog">{language === "ar" ? "تحليل سجل تصدير الدردشة" : "Parse Chat Export Log"}</option>
                <option value="groupLink">{language === "ar" ? "الاستخراج عبر رابط دعوة المجموعة" : "Extract via Group Invite Link"}</option>
                <option value="groupName">{language === "ar" ? "الاستخراج عبر اسم المجموعة" : "Extract via Group Name"}</option>
                <option value="correspondent">{language === "ar" ? "استخراج جميع العملاء المراسلين" : "Extract All Correspondent Clients"}</option>
                <option value="archived">{language === "ar" ? "استخراج جميع الدردشات المؤرشفة" : "Extract All Archived Chats"}</option>
                <option value="contacts">{language === "ar" ? "استخراج جميع جهات اتصال واتساب" : "Extract All WhatsApp Contacts"}</option>
                <option value="socialMedia">{language === "ar" ? "استخراج المجموعات من وسائل التواصل الاجتماعي" : "Extract Groups from Social Media"}</option>
              </select>
            </div>

            {extractionMode === "chatLog" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "لصق نص سجل دردشة المجموعة" : "Paste Group Chat Log Text"}</label>
                <textarea 
                  rows={5}
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder={language === "ar" ? "قم بلصق محتوى دردشة المجموعة المنسوخ هنا..." : "Paste copied group chat content here..."}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden font-mono text-[11px] leading-relaxed"
                />
              </div>
            )}

            {extractionMode !== "chatLog" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "المدخل المستهدف" : "Target Input"}</label>
                <input 
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder={language === "ar" ? "أدخل الرابط أو الاسم أو الكلمة الرئيسية..." : "Enter link, name, or keyword..."}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>
            )}

            <button 
              onClick={handleExtractGroupContacts}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Sparkles className="w-4 h-4" /> {language === "ar" ? "استخراج جهات الاتصال" : "Extract Contacts"}
            </button>
          </div>

          {/* Extracted results table */}
          {extractedContacts.length > 0 && (
            <div className="mt-5 space-y-3 animate-slide-down">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">{language === "ar" ? `تم تحليل ${extractedContacts.length} جهات اتصال` : `Parsed ${extractedContacts.length} Contacts`}</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={handleDownloadExtractedCSV}
                    className="p-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-xs flex items-center gap-1 transition-all font-semibold"
                    title={language === "ar" ? "تصدير إلى ملف CSV" : "Export to CSV file"}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> {language === "ar" ? "ملف CSV" : "CSV File"}
                  </button>
                  <button 
                    onClick={handleImportToCampaign}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 transition-all font-semibold shadow-xs"
                    title={language === "ar" ? "تصدير مباشر لشاشة الإنشاء" : "Direct export to compose screen"}
                  >
                    <Users className="w-3.5 h-3.5" /> {language === "ar" ? "إرسال حملة" : "Send campaign"}
                  </button>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                      <th className="p-2.5">{language === "ar" ? "الهاتف المستخرج" : "Extracted Phone"}</th>
                      <th className="p-2.5">{language === "ar" ? "الاسم المحاكى" : "Simulated Name"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {extractedContacts.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-mono text-gray-900 font-bold">{c.phone}</td>
                        <td className="p-2.5 text-gray-600">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
