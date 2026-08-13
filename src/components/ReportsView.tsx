import { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Trash2, 
  Download,
  Terminal,
  Activity,
  Award,
  Pause,
  Play,
  Check,
  CheckCheck
} from "lucide-react";
import { Campaign } from "../types";

interface ReportsViewProps {
  campaigns: Campaign[];
  onDeleteCampaign: (id: string) => void;
  onToggleCampaignStatus?: (id: string, action: "pause" | "resume") => void;
}

export default function ReportsView({ campaigns, onDeleteCampaign, onToggleCampaignStatus }: ReportsViewProps) {
  const { language } = useLanguage();
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "detailed">("summary");

  // Calculate high level stats
  const totalCampaignsCount = campaigns.length;
  const completedCampaigns = campaigns.filter(c => c.status === "completed");
  
  let totalSent = 0;
  let totalFailed = 0;
  
  campaigns.forEach(c => {
    totalSent += c.sentCount || 0;
    totalFailed += c.failCount || 0;
  });

  const totalAttempted = totalSent + totalFailed;
  const deliveryRate = totalAttempted > 0 ? Math.round((totalSent / totalAttempted) * 100) : 100;

  // Prepare chart data for Recharts Bar Chart: Campaign comparison
  const campaignComparisonData = campaigns.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
    delivered: c.sentCount,
    failed: c.failCount
  }));

  // Prepare chart data for Recharts Pie Chart: Success vs Fail
  const pieData = [
    { name: "Delivered", value: totalSent, color: "#10b981" },
    { name: "Spam Blocked / Failed", value: totalFailed, color: "#ef4444" }
  ].filter(d => d.value > 0);

  // Fallback pie data if empty
  const activePieData = pieData.length > 0 ? pieData : [
    { name: language === "ar" ? "لم يتم إرسال أي حملة بعد" : "No Campaign Sent Yet", value: 1, color: "#cbd5e1" }
  ];

  const toggleExpandCampaign = (id: string) => {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(id);
    }
  };

  // Convert campaign list to a mock CSV download
  const handleExportCSV = (camp: Campaign) => {
    const headers = "Phone,Name,Email,OrderNumber,Status,Error\n";
    const rows = camp.recipients.map(r => 
      `"${r.phone}","${r.name || ""}","${r.email || ""}","${r.orderNumber || ""}","${r.status || "pending"}","${r.errorMessage || ""}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Campaign_Report_${camp.name.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6" id="reports-workspace">
      
      {/* Visual Analytics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 block">{language === "ar" ? "إجمالي الحملات" : "Total Campaigns"}</span>
            <span className="text-2xl font-bold text-gray-900 block">{totalCampaignsCount}</span>
            <span className="text-[10px] text-gray-400 font-medium">{language === "ar" ? "يتضمن المسودات والمجدولة" : "Drafts + Scheduled included"}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 block">{language === "ar" ? "إجمالي الرسائل المرسلة" : "Total Messages Sent"}</span>
            <span className="text-2xl font-bold text-gray-900 block">{totalSent}</span>
            <span className="text-[10px] text-emerald-600 font-bold">{language === "ar" ? "تمت معالجتها فوراً" : "Instantly processed"}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 block">{language === "ar" ? "محظور / فاشل" : "Blocked / Failed"}</span>
            <span className="text-2xl font-bold text-gray-900 block">{totalFailed}</span>
            <span className="text-[10px] text-gray-400 font-medium">{language === "ar" ? "تمت التصفية بأمان" : "Filtered out safely"}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 block">{language === "ar" ? "دقة التسليم" : "Delivery Accuracy"}</span>
            <span className="text-2xl font-bold text-gray-900 block">{deliveryRate}%</span>
            <span className="text-[10px] text-blue-600 font-semibold">{language === "ar" ? "حماية نشطة ضد الحظر" : "Anti-Ban active protection"}</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics charts */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bar Chart comparing campaigns */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {language === "ar" ? "إحصائيات أداء الحملة" : "Campaign Performance Statistics"}
            </h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  <Bar dataKey="delivered" name={language === "ar" ? "تم التسليم بنجاح" : "Delivered Successfully"} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name={language === "ar" ? "فشل / مستبعد" : "Failed / Excluded"} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart comparing successes */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              {language === "ar" ? "تفصيل التسليم الإجمالي" : "Aggregate Delivery Breakdown"}
            </h3>
            <div className="h-48 w-full flex items-center justify-center text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-gray-50 text-[11px] font-medium text-gray-500">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {language === "ar" ? "الرسائل المسلمة" : "Delivered Messages"}
                </span>
                <span className="font-bold text-gray-800">{totalSent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {language === "ar" ? "مستبعد / محظور" : "Excluded / Blocked"}
                </span>
                <span className="font-bold text-gray-800">{totalFailed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns list and detailed logs breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          {language === "ar" ? "سجل إرسال الحملات الجماعية" : "Bulk Campaigns Dispatch Log"}
        </h2>

        {campaigns.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">{language === "ar" ? "لم يتم تشغيل أي حملات بعد." : "No campaigns run yet."}</p>
            <p className="text-xs mt-1">{language === "ar" ? "انتقل إلى علامة التبويب 'الحملات' وأرسل بعض الرسائل لتشغيل التقارير!" : "Go to the Campaigns tab and fire some messages to trigger reports!"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(camp => (
              <div 
                key={camp.id} 
                className="border border-gray-100 rounded-xl overflow-hidden transition-all hover:border-gray-200"
              >
                {/* Header Summary Row */}
                <div 
                  className={`p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer select-none transition-all ${expandedCampaignId === camp.id ? "bg-emerald-50/20" : "bg-white hover:bg-gray-50/50"}`}
                  onClick={() => toggleExpandCampaign(camp.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{camp.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        camp.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        camp.status === "scheduled" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        "bg-yellow-50 text-yellow-700 border border-yellow-100"
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-1">
                      <span>{language === "ar" ? "تم الإطلاق:" : "Launched:"} {camp.createdAt}</span>
                      {camp.scheduledAt && <span className="font-semibold text-blue-700">{language === "ar" ? "مجدول:" : "Scheduled:"} {new Date(camp.scheduledAt).toLocaleString()}</span>}
                      <span>{language === "ar" ? "المستلمون:" : "Recipients:"} {camp.recipients.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="flex gap-2 text-xs font-semibold font-mono">
                      <span className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200" title={language === "ar" ? "مرسل (مُرسل)" : "Sent (Dispatched)"}>
                        <Check className="w-3 h-3" /> {camp.sentCount}
                      </span>
                      {(camp.deliveredCount || 0) > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100" title={language === "ar" ? "تم التسليم" : "Delivered"}>
                          <CheckCheck className="w-3 h-3" /> {camp.deliveredCount}
                        </span>
                      )}
                      {(camp.readCount || 0) > 0 && (
                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100" title={language === "ar" ? "مقروء" : "Read"}>
                          <CheckCheck className="w-3 h-3" /> {camp.readCount}
                        </span>
                      )}
                      {camp.failCount > 0 && (
                        <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100/50" title={language === "ar" ? "فشل" : "Failed"}>
                          <XCircle className="w-3 h-3" /> {camp.failCount}
                        </span>
                      )}
                    </div>
                    
                    {(camp.status === "sending" || camp.status === "pending" || camp.status === "queued") && onToggleCampaignStatus && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCampaignStatus(camp.id, "pause"); }}
                        className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        title={language === "ar" ? "إيقاف الحملة مؤقتًا" : "Pause Campaign"}
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    
                    {camp.status === "paused" && onToggleCampaignStatus && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCampaignStatus(camp.id, "resume"); }}
                        className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        title={language === "ar" ? "استئناف الحملة" : "Resume Campaign"}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteCampaign(camp.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title={language === "ar" ? "حذف الحملة" : "Delete Campaign"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {expandedCampaignId === camp.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details block */}
                {expandedCampaignId === camp.id && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4 text-xs animate-slide-down">
                    
                    {/* Message body preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-gray-400 block mb-1.5 uppercase">{language === "ar" ? "نص الرسالة المرسلة" : "MESSAGE TEXT SENT"}</span>
                        <p className="text-gray-700 font-sans leading-relaxed whitespace-pre-wrap">{camp.messageTemplate}</p>
                        {camp.attachmentUrl && (
                          <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 font-semibold rounded-md text-[10px] border border-emerald-100">
                            {language === "ar" ? `مرفق ${camp.attachmentType}: ${camp.attachmentCaption || "بدون تعليق"}` : `Attached ${camp.attachmentType}: ${camp.attachmentCaption || "No Caption"}`}
                          </div>
                        )}
                      </div>

                      {/* Sending setup specs */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs space-y-2 text-gray-600 font-medium leading-relaxed">
                        <span className="text-[10px] font-semibold text-gray-400 block uppercase">{language === "ar" ? "معلمات الحملة" : "CAMPAIGN PARAMETERS"}</span>
                        <div>🚀 {language === "ar" ? "تأخيرات عشوائية آمنة:" : "Safe Random Delays:"} <span className="font-bold text-gray-800">{camp.delayMin} {language === "ar" ? "إلى" : "to"} {camp.delayMax} {language === "ar" ? "ثانية" : "seconds"}</span></div>
                        <div>📦 {language === "ar" ? "تقييد الدفعة:" : "Batch Throttle:"} <span className="font-bold text-gray-800">{language === "ar" ? `إرسال ${camp.batchSize} لكل ${camp.batchDelay} دقيقة` : `Send ${camp.batchSize} per ${camp.batchDelay} min`}</span></div>
                        <div>🛡️ {language === "ar" ? "حماية معرف الرسالة الفريد:" : "Unique Message ID Protection:"} <span className="font-bold text-gray-800">{camp.useAntiSpamId ? (language === "ar" ? "مُمكّن" : "ENABLED") : (language === "ar" ? "مُعطّل" : "DISABLED")}</span></div>
                        
                        <div className="pt-2 flex gap-2">
                          <button 
                            onClick={() => handleExportCSV(camp)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {language === "ar" ? "تحميل تقرير CSV" : "Download CSV Report"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Recipient status logs table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs">
                      <span className="text-[10px] font-semibold text-gray-400 block px-4 pt-3 uppercase">{language === "ar" ? "حالة تسليم المستلم" : "RECIPIENT DELIVERY STATUS"}</span>
                      <div className="max-h-56 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs mt-2">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                              <th className="p-3">{language === "ar" ? "الهاتف" : "Phone"}</th>
                              <th className="p-3">{language === "ar" ? "العميل" : "Customer"}</th>
                              <th className="p-3">{language === "ar" ? "المتغيرات المدمجة" : "Variables Merged"}</th>
                              <th className="p-3">{language === "ar" ? "الحالة" : "Status"}</th>
                              <th className="p-3">{language === "ar" ? "التفاصيل / الأخطاء" : "Details / Errors"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-gray-700">
                            {camp.recipients.map((rec, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="p-3 font-mono font-medium text-gray-900">{rec.phone}</td>
                                <td className="p-3">{rec.name || <span className="text-gray-300">-</span>}</td>
                                <td className="p-3 font-mono text-[10px] text-gray-500">
                                  {rec.orderNumber && `${language === "ar" ? "الطلب:" : "Order:"} ${rec.orderNumber}`} {rec.email && `| ${language === "ar" ? "البريد:" : "Mail:"} ${rec.email}`}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    rec.status === "sent" ? "bg-emerald-50 text-emerald-700" :
                                    rec.status === "failed" ? "bg-red-50 text-red-700" :
                                    "bg-yellow-50 text-yellow-700"
                                  }`}>
                                    {rec.status === "sent" ? (language === "ar" ? "تم التسليم" : "Delivered") : rec.status === "failed" ? (language === "ar" ? "محظور/فاشل" : "Blocked/Failed") : (language === "ar" ? "قيد الانتظار" : "Pending")}
                                  </span>
                                </td>
                                <td className="p-3 text-red-500 italic text-[10px]">{rec.errorMessage || <span className="text-gray-300">-</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sending logs console output */}
                    {camp.logs && camp.logs.length > 0 && (
                      <div className="bg-neutral-900 text-neutral-300 rounded-xl p-4 border border-neutral-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-neutral-400 font-semibold font-mono border-b border-neutral-800 pb-2">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === "ar" ? "تتبعات إرسال البوابة المحاكية" : "SIMULATED GATEWAY DISPATCH TRACES"}</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin text-[10px] font-mono leading-tight">
                          {camp.logs.map((log, idx) => (
                            <div key={idx} className={log.includes("Successfully") ? "text-emerald-400" : log.includes("Failed") ? "text-red-400" : "text-neutral-400"}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
