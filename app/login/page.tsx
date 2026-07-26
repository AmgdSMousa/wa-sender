"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gap-2 text-green-600 mb-2">WA Sender</h1>
            <p className="text-gray-500">سجل الدخول كمسؤول للمتابعة</p>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded text-right">
              <p>تسجيل الدخول لأول مرة؟</p>
              <p>استخدم اسم المستخدم <strong>admin</strong> وضع أية كلمة مرور لتصبح هي كلمتك الرئيسية.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
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
    </div>
  );
}
