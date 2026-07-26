"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    
    if (res?.error) {
      setError("بيانات الدخول غير صحيحة");
    } else {
      router.push("/");
      router.refresh(); 
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage(data.message || 'تم إعادة تعيين كلمة المرور بنجاح!');
        setPassword(newPassword);
        setTimeout(() => {
          setShowResetModal(false);
        }, 2000);
      } else {
        setResetMessage(data.error || 'حدث خطأ أثناء التحديث');
      }
    } catch (err: any) {
      setResetMessage('تعذر الاتصال بالخادم');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gap-2 text-green-600 mb-2">WA Sender</h1>
            <p className="text-gray-500">سجل الدخول كمسؤول للمتابعة</p>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded text-right">
              <p>تسجيل الدخول لأول مرة؟</p>
              <p>اسم المستخدم الافتراضي: <strong>admin</strong></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-left"
                dir="ltr"
              />
            </div>
            
            <div className="text-right">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs text-green-600 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              دخول
            </button>
          </form>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">تصفير كلمة المرور للمسؤول (admin)</h2>
            <p className="text-xs text-gray-500 mb-4">أدخل كلمة المرور الجديدة التي تريد استخدامها للدخول:</p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetMessage && (
                <div className={`p-3 rounded text-xs text-center ${resetMessage.includes('بنجاح') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resetMessage}
                </div>
              )}
              <div>
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none text-left"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg text-sm"
                >
                  {resetLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
