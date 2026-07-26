"use client";

import { useEffect, useState } from "react";
import ContactImporter from "@/components/ContactImporter";
import { useToast } from "@/components/Toast";
import {
  PaperAirplaneIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EyeIcon,
  RectangleStackIcon,
  CalendarDaysIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

interface Campaign {
  id: number;
  name: string;
  message: string;
  status: string;
  mediaUrl?: string;
  createdAt: string;
  _count: { contacts: number };
}

export default function Campaigns() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<number, any>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [activeSessions, setActiveSessions] = useState<{sessionId: string}[]>([]);
  const [templates, setTemplates] = useState<{id:number;name:string;body:string;mediaUrl:string|null}[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [campaignType, setCampaignType] = useState<'instant'|'drip'>('instant');
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
    contacts: [] as { phone: string; name?: string }[],
    scheduledAt: "",
    minDelay: 3,
    maxDelay: 10,
    batchSize: 20,
    batchDelay: 5,
    mediaUrl: "",
    sessionId: "default",
    isDrip: false,
    sequenceSteps: [] as {message: string; delayDays: number}[]
  });
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [loadingCampaignId, setLoadingCampaignId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleTestSend = async () => {
    if (!testPhone) return toast.warning("يرجى إدخال رقم الهاتف التجريبي");
    const msg = newCampaign.isDrip ? newCampaign.sequenceSteps?.[0]?.message : newCampaign.message;
    if (!msg) return toast.warning("يرجى كتابة نص الرسالة أولاً");

    setTestSending(true);
    try {
      const res = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message: msg,
          mediaUrl: newCampaign.mediaUrl,
          sessionId: newCampaign.sessionId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "تم إرسال الرسالة التجريبية بنجاح 🚀");
        setShowTestModal(false);
      } else {
        toast.error("فشل الإرسال التجريبي: " + (data.error || "خطأ غير معروف"));
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الإرسال التجريبي");
    } finally {
      setTestSending(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetch('/api/wa/sessions').then(res=>res.json()).then(data => {
        if(Array.isArray(data)) {
          const connected = data.filter((s: any) => s.status === 'connected');
          setActiveSessions(connected);
          if (connected.length > 0) {
            setNewCampaign(prev => ({ ...prev, sessionId: connected[0].sessionId }));
          }
        }
    }).catch(()=>{});
    fetch('/api/templates').then(res=>res.json()).then(data => {
        if(Array.isArray(data)) setTemplates(data);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (campaigns.some(c => c.status === 'running')) {
        fetchCampaigns();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [campaigns.map(c => c.status).join(',')]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCampaign.contacts.length === 0) return toast.warning("يرجى استيراد أرقام أولاً");
    
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewCampaign({ name: "", message: "", contacts: [], scheduledAt: "", minDelay: 3, maxDelay: 10, batchSize: 20, batchDelay: 5, mediaUrl: "", sessionId: "default", isDrip: false, sequenceSteps: [] });
        setCampaignType('instant');
        fetchCampaigns();
        toast.success("تم إنشاء الحملة بنجاح! ✅");
      } else {
        toast.error("فشل إنشاء الحملة");
      }
    } catch (err) {
      toast.error("فشل إنشاء الحملة");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: number) => {
    setLoadingCampaignId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.retrying > 0) {
        toast.success(`تم إعادة إرسال ${data.retrying} رسالة فاشلة 🔄`);
        fetchCampaigns();
      } else {
        toast.info(data.message || 'لا توجد رسائل فاشلة');
      }
    } catch (err) {
      toast.error('فشل إعادة الإرسال');
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const fetchCampaignStats = async (id: number) => {
    const res = await fetch(`/api/campaigns/${id}/stats`);
    if (res.ok) {
      const data = await res.json();
      setCampaignStats(prev => ({ ...prev, [id]: data }));
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
        setNewCampaign({ ...newCampaign, mediaUrl: data.url });
        toast.success('تم رفع الملف بنجاح');
      } else {
        toast.error("فشل رفع الملف: " + data.error);
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  const handleStart = async (id: number) => {
    setLoadingCampaignId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
      if (res.ok) {
        fetchCampaigns();
        toast.info('تم تقديم طلب البدء. يرجى مسح رمز الـ QR والاتصال بالواتساب أولاً من شاشة الإعدادات إذا لم تكن متصلاً! 📲');
      } else {
        toast.error('فشل بدء الحملة');
      }
    } catch (err) {
      toast.error('فشل بدء الحملة');
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;
    setLoadingCampaignId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCampaigns();
        toast.success('تم حذف الحملة');
      } else {
        toast.error("فشل حذف الحملة");
      }
    } catch (err) {
      toast.error("فشل حذف الحملة");
    } finally {
      setLoadingCampaignId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">إدارة الحملات</h2>
          <p className="text-gray-500 mt-1">أنشئ وتابع حملاتك التسويقية</p>
        </div>
        {!showCreate && (
          <button 
            onClick={() => setShowCreate(true)} 
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>حملة جديدة</span>
          </button>
        )}
      </header>

      {showCreate ? (
        <div className="card max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-xl font-bold">إنشاء حملة تسويقية</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-red-500">
              <PlusIcon className="h-6 w-6 rotate-45" />
            </button>
          </div>
          
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">اسم الحملة</label>
              <input 
                required
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                placeholder="مثال: عرض رمضان 2025"
                className="input"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">الرقم المرسل (الجلسة)</label>
              <select 
                value={newCampaign.sessionId}
                onChange={(e) => setNewCampaign({...newCampaign, sessionId: e.target.value})}
                className="input form-select font-bold text-green-700"
              >
                <option value="default">الافتراضي (default)</option>
                {activeSessions.filter(s => s.sessionId !== 'default').map(s => (
                    <option key={s.sessionId} value={s.sessionId}>{s.sessionId}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">يجب أن يكون الرقم متصلاً بالإنترنت وحالته (متصل بمعرف واتساب).</p>
            </div>

            {/* Campaign Type Toggle */}
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setCampaignType('instant'); setNewCampaign({...newCampaign, isDrip: false}); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  campaignType === 'instant' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <BoltIcon className="h-5 w-5" />
                حملة فورية / مجدولة
              </button>
              <button type="button"
                onClick={() => { setCampaignType('drip'); setNewCampaign({...newCampaign, isDrip: true, sequenceSteps: [{message: '', delayDays: 1}]}); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  campaignType === 'drip' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <CalendarDaysIcon className="h-5 w-5" />
                متسلسلة (Drip)
              </button>
            </div>

            {campaignType === 'instant' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">رسالة الواتساب</label>
                  {templates.length > 0 && (
                    <button type="button" onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      <RectangleStackIcon className="h-4 w-4" />
                      اختر من القوالب
                    </button>
                  )}
                </div>
                {showTemplatePicker && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1.5">
                    {templates.map(t => (
                      <button key={t.id} type="button"
                        onClick={() => { setNewCampaign({...newCampaign, message: t.body, mediaUrl: t.mediaUrl || ''}); setShowTemplatePicker(false); }}
                        className="w-full text-right p-2.5 bg-white hover:bg-indigo-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-all text-sm">
                        <p className="font-semibold text-gray-700">{t.name}</p>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{t.body}</p>
                      </button>
                    ))}
                  </div>
                )}
                <textarea 
                  required
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                  placeholder="اكتب رسالتك هنا..."
                  className="input min-h-[120px]"
                />
                <p className="text-xs text-gray-400">
                  استخدم <code className="bg-gray-100 px-1 rounded text-blue-600">{`{name}`}</code> لاستبداله بـ اسم العميل تلقائياً.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">خطوات الحملة المتسلسلة</label>
                  <button type="button"
                    onClick={() => setNewCampaign({...newCampaign, sequenceSteps: [...(newCampaign.sequenceSteps||[]), {message:'', delayDays: (newCampaign.sequenceSteps?.length || 0) + 1}]})}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium border border-purple-200 px-2 py-1 rounded-lg">
                    <PlusIcon className="h-3.5 w-3.5" /> إضافة خطوة
                  </button>
                </div>
                <div className="space-y-3">
                  {(newCampaign.sequenceSteps||[]).map((step, idx) => (
                    <div key={idx} className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-purple-700">خطوة {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">بعد</label>
                          <input type="number" min={0} value={step.delayDays}
                            onChange={e => { const s=[...(newCampaign.sequenceSteps||[])]; s[idx]={...s[idx],delayDays:+e.target.value}; setNewCampaign({...newCampaign,sequenceSteps:s}); }}
                            className="w-16 input py-1 text-center text-sm" />
                          <label className="text-xs text-gray-500">يوم</label>
                          {idx > 0 && (
                            <button type="button" onClick={() => { const s=(newCampaign.sequenceSteps||[]).filter((_,i)=>i!==idx); setNewCampaign({...newCampaign,sequenceSteps:s}); }}
                              className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                      <textarea value={step.message}
                        onChange={e => { const s=[...(newCampaign.sequenceSteps||[])]; s[idx]={...s[idx],message:e.target.value}; setNewCampaign({...newCampaign,sequenceSteps:s}); }}
                        placeholder={`نص الرسالة رقم ${idx+1}...`}
                        rows={3} className="input text-sm" required />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
                  💡 مثال: خطوة 1 فور الإرسال، خطوة 2 بعد 3 أيام، خطوة 3 بعد 7 أيام — يتم الإرسال تلقائياً بواسطة المجدول.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">إرفاق وسائط (اختياري)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="media-upload"
                />
                <label 
                  htmlFor="media-upload"
                  className="btn btn-secondary flex items-center gap-2 cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
                  <span>{uploading ? "جاري الرفع..." : "اختر صورة أو فيديو"}</span>
                </label>
                {newCampaign.mediaUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckIcon className="h-4 w-4" />
                    <span>تم تجهيز الملف</span>
                    <button 
                      onClick={() => setNewCampaign({...newCampaign, mediaUrl: ""})}
                      className="text-red-400 hover:text-red-600 ml-2"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span>🛡️ إعدادات الحماية والأمان من الحظر (Anti-Ban Settings)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">🕰️ أقل تأخير عشوائي (ثواني)</label>
                  <input 
                    type="number"
                    min="1"
                    value={newCampaign.minDelay}
                    onChange={(e) => setNewCampaign({...newCampaign, minDelay: Number(e.target.value)})}
                    className="input text-center border-green-200 focus:border-green-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">🚀 أقصى تأخير عشوائي (ثواني)</label>
                  <input 
                    type="number"
                    min={newCampaign.minDelay + 1}
                    value={newCampaign.maxDelay}
                    onChange={(e) => setNewCampaign({...newCampaign, maxDelay: Number(e.target.value)})}
                    className="input text-center border-green-200 focus:border-green-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200/60">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">📦 حجم الدفعة (عدد الرسائل)</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="مثال: 20 رسالة"
                    value={newCampaign.batchSize}
                    onChange={(e) => setNewCampaign({...newCampaign, batchSize: Number(e.target.value)})}
                    className="input text-center border-blue-200 focus:border-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">☕ زمن التوقف بين الدفعات (دقائق)</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="مثال: 5 دقائق"
                    value={newCampaign.batchDelay}
                    onChange={(e) => setNewCampaign({...newCampaign, batchDelay: Number(e.target.value)})}
                    className="input text-center border-blue-200 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>✍️ محاكاة الكتابة الحية (sendStateTyping):</span>
                </p>
                <p>
                  سيظهر الحساب كـ <strong>"جاري الكتابة..."</strong> لمدة 2 إلى 4 ثوانٍ قبل إرسال كل رسالة تلقائياً محاكاةً للعنصر البشري، مع توقف ذكي قدره <strong>{newCampaign.batchDelay} دقائق</strong> بعد كل <strong>{newCampaign.batchSize} رسالة</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">الجهات المستهدفة للحملة</label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/contacts');
                      const data = await res.json();
                      if (Array.isArray(data) && data.length > 0) {
                        const formatted = data.map((c: any) => ({ phone: c.phone, name: c.name || undefined }));
                        setNewCampaign({ ...newCampaign, contacts: formatted });
                        toast.success(`تم اختيار جميع عملاء CRM المسجلين (${formatted.length} عميل)`);
                      } else {
                        toast.info("لا يوجد عملاء مسجلين في CRM حالياً");
                      }
                    } catch (e) {
                      toast.error("فشل جلب العملاء");
                    }
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  👥 استخدام جميع عملاء CRM المسجلين
                </button>
              </div>
              <ContactImporter onImport={(contacts: any) => setNewCampaign({...newCampaign, contacts})} />
              {newCampaign.contacts.length > 0 && (
                <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 mt-2 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span>تم تحديد <strong>{newCampaign.contacts.length}</strong> جهة اتصال جاهزة للإرسال</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewCampaign({ ...newCampaign, contacts: [] })}
                    className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                  >
                    تفريق القائمة
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button 
                type="submit" 
                disabled={loading || newCampaign.contacts.length === 0}
                className="btn btn-primary flex-1 py-3"
              >
                {loading ? "جاري الحفظ..." : "حفظ الحملة والبدء"}
              </button>
              <button 
                type="button"
                onClick={() => setShowTestModal(true)}
                className="btn btn-secondary flex items-center justify-center gap-2 py-3 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
              >
                <PaperAirplaneIcon className="h-4 w-4 rotate-90" />
                <span>إرسال تجريبي (Test)</span>
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary py-3 px-6"
              >
                إلغاء
              </button>
            </div>
          </form>

          {/* Test Send Modal */}
          {showTestModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <PaperAirplaneIcon className="h-5 w-5 text-amber-600 rotate-90" />
                  <span>إرسال تجريبي لاختبار الرسالة</span>
                </h3>
                <p className="text-sm text-gray-500">
                  أدخل رقم هاتفك لتلقي تجربة سريعة للرسالة والوسائط قبل إطلاق الحملة على قائمة العملاء.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف التجريبي</label>
                  <input
                    type="text"
                    placeholder="مثال: 966500000000"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="input font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testSending}
                    className="btn bg-amber-600 hover:bg-amber-700 text-white flex-1 flex items-center justify-center gap-2 py-2.5"
                  >
                    {testSending ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaperAirplaneIcon className="h-4 w-4 rotate-90" />}
                    <span>إرسال الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="btn btn-secondary py-2.5 px-4"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.length === 0 ? (
            <div className="card text-center py-20 bg-gray-50 border-dashed">
              <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400">لا يوجد حملات حالياً</h3>
              <p className="text-gray-400 mt-2">ابدأ بإنشاء أول حملة تسويقية لك الآن</p>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const stats = campaignStats[campaign.id];
              return (
              <div key={campaign.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      campaign.status === 'done' || campaign.status === 'completed' ? 'bg-green-100 text-green-600' :
                      campaign.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      <PaperAirplaneIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        {campaign.name}
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                          الجلسة: {(campaign as any).sessionId || 'default'}
                        </span>
                        {(campaign as any).isDrip && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CalendarDaysIcon className="h-3 w-3" /> Drip
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {campaign._count.contacts} مستلم • {new Date(campaign.createdAt).toLocaleDateString('ar-EG')}
                        {stats && (
                          <span className="mr-2 text-xs text-indigo-500">
                            • وصل {stats.delivered} | قُرئ {stats.read}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      campaign.status === 'done' || campaign.status === 'completed' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {campaign.status === 'done' || campaign.status === 'completed' ? 'مكتملة' :
                       campaign.status === 'running' ? 'جاري الإرسال' :
                       campaign.status === 'draft' ? 'مسودة' : campaign.status}
                    </span>
                    
                    {campaign.status === 'draft' && (
                      <button 
                        onClick={() => handleStart(campaign.id)}
                        disabled={loadingCampaignId === campaign.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="بدء الحملة"
                      >
                        {loadingCampaignId === campaign.id ? (
                          <div className="h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}

                    {/* Retry failed button */}
                    {(campaign.status === 'done' || campaign.status === 'completed') && (
                      <button
                        onClick={() => handleRetry(campaign.id)}
                        disabled={loadingCampaignId === campaign.id}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg disabled:opacity-50"
                        title="إعادة إرسال الفاشلة"
                      >
                        {loadingCampaignId === campaign.id ? (
                          <div className="h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ArrowPathIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}

                    {/* Stats button */}
                    <button
                      onClick={() => fetchCampaignStats(campaign.id)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="عرض الإحصائيات"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    
                    <a 
                      href={`/api/campaigns/${campaign.id}/export`}
                      target="_blank"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="تصدير النتائج"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </a>

                    <button 
                      onClick={() => handleDelete(campaign.id)}
                      disabled={loadingCampaignId === campaign.id}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="حذف الحملة"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                {stats && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-4 gap-3">
                    {[
                      { label: 'المجموع', value: stats.total, color: 'text-gray-600' },
                      { label: 'أُرسلت', value: stats.sent, color: 'text-green-600' },
                      { label: 'وصلت', value: stats.delivered, color: 'text-blue-600' },
                      { label: 'قُرئت', value: stats.read, color: 'text-indigo-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })

          )}
        </div>
      )}
    </div>
  );
}
