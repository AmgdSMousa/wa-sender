"use client";

import { useEffect, useState, useRef } from "react";
import { 
  QrCodeIcon, 
  CheckCircleIcon, 
  TrashIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { useToast } from "@/components/Toast";

interface SessionData {
  id: number;
  sessionId: string;
  status: string;
  updatedAt: string;
  qr?: string;
}

export default function Settings() {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const activeSessionsRef = useRef<string[]>([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/wa/sessions");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
        activeSessionsRef.current = data.map((d: any) => d.sessionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQRForSession = async (sId: string) => {
    try {
      const res = await fetch(`/api/wa/qr?sessionId=${sId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => prev.map(s => s.sessionId === sId ? { ...s, status: data.status, qr: data.qr } : s));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      activeSessionsRef.current.forEach(sId => fetchQRForSession(sId));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/wa/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newSessionId.trim() })
      });
      if (res.ok) {
        toast.success("تم إضافة الرقم بنجاح");
        setNewSessionId("");
        fetchSessions();
      }
    } catch (err) {
      toast.error("فشل إضافة الرقم");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف وتسجيل الخروج من الحساب [${sessionId}]؟`)) return;
    
    setLoading(true);
    try {
      await fetch(`/api/wa/sessions?sessionId=${sessionId}`, { method: "DELETE" });
      fetchSessions();
      toast.success("تم الحذف بنجاح");
    } catch (err) {
      toast.error("فشل حذف الحساب");
    } finally {
        setLoading(false);
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!confirm(`هل أنت متأكد من قطع اتصال الحساب [${sessionId}]؟`)) return;
    
    setLoading(true);
    try {
      await fetch("/api/wa/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      fetchQRForSession(sessionId);
      toast.success("تم فصل الاتصال");
    } catch (err) {
      toast.error("فشل فصل الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handleForceConnect = async (sessionId: string) => {
    toast.info("جاري طلب باركود جديد...");
    try {
      await fetch(`/api/wa/qr?sessionId=${sessionId}&force=true`);
      fetchQRForSession(sessionId);
    } catch(e) {}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">إدارة الأرقام (Multi-Session)</h2>
          <p className="text-gray-500 mt-1">أضف أرقام واتساب متعددة لتقسيم حملاتك التسويقية وتجنب الحظر.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Connection Status Card */}
        <div className="md:col-span-2 space-y-6">
          
          <form onSubmit={handleAddSession} className="card flex items-end gap-4 bg-green-50 border-green-100">
            <div className="flex-1">
              <label className="block text-sm font-bold text-green-800 mb-1">إضافة رقم مرسل جديد</label>
              <input
                type="text"
                required
                placeholder="اسم مميز للرقم (مثال: line-1 أو مبيعات-1)"
                value={newSessionId}
                onChange={e => setNewSessionId(e.target.value)}
                className="input-field border-green-200 focus:border-green-500"
              />
            </div>
            <button disabled={loading} className="btn btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              ربط رقم
            </button>
          </form>

          <div className="grid grid-cols-1 gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="card border-2 border-gray-100 p-0 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    📱 المعرف: <span className="text-indigo-600 px-2 py-1 bg-indigo-50 rounded">{session.sessionId}</span>
                  </h3>
                  <button onClick={() => handleDelete(session.sessionId)} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50" title="حذف الحساب من النظام">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                    {session.status === 'connected' ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <CheckCircleIcon className="h-12 w-12 text-green-500" />
                                <div>
                                    <h4 className="text-xl font-bold text-green-700">تم الاتصال بنجاح</h4>
                                    <p className="text-gray-500 text-sm">الجاهزية: يمكنك استخدامه لإرسال الحملات.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDisconnect(session.sessionId)}
                                disabled={loading}
                                className="btn btn-secondary text-red-600 border border-red-50 hover:bg-red-50 text-sm"
                            >
                                تسجيل خروج الهاتف
                            </button>
                        </div>
                    ) : session.status === 'qr' && session.qr ? (
                        <div className="flex items-center gap-8">
                            <div className="relative w-48 h-48 bg-white border-4 border-gray-100 rounded-xl overflow-hidden p-2">
                                <img src={session.qr} alt="WA QR Code" className="w-full h-full object-contain" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold text-gray-800">امسح رمز الاستجابة 📱</h4>
                                <p className="text-gray-500 text-sm">
                                    للربط، افتح واتساب في الهاتف التابع لهذا الرقم {"->"} الأجهزة المرتبطة {"->"} ربط جهاز.
                                </p>
                                <button onClick={() => handleForceConnect(session.sessionId)} className="text-sm text-blue-600 underline hover:text-blue-800 flex items-center gap-1">
                                    <ArrowPathIcon className="w-4 h-4" /> طلب باركود جديد
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-gray-50 rounded-full animate-pulse">
                                <QrCodeIcon className="h-10 w-10 text-gray-300" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-500">جاري الاتصال أو تجهيز الباركود ({session.status})...</h4>
                                <button onClick={() => handleForceConnect(session.sessionId)} className="text-sm text-blue-600 underline mt-2 relative z-10">إجبار تحديث الاتصال</button>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            ))}
            
            {sessions.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                لا توجد أرقام مضافة حالياً.
              </div>
            )}
          </div>
        </div>

        {/* Tips Card */}
        <div className="space-y-6">
          <div className="card bg-blue-50 border-blue-100">
            <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>نصائح الحسابات المتعددة</span>
            </h3>
            <ul className="space-y-3 text-sm text-blue-700">
              <li className="flex gap-2">
                <span>•</span>
                <span>لا تُضف أرقاماً كثيرة إذا لم تكن مواصفات الخادم الخاص بك (الرام) تتحمل ذلك.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>عند إرسال حملة، ستتمكن من اختيار الرقم المسؤول عن الإرسال بحيث يمكنك توزيع الضغط على أرقامك.</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>تأكد من بقاء هواتف هذه الأرقام متصلة بالإنترنت دائماً.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
