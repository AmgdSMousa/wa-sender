"use client";

import { useState, useEffect } from "react";
import { SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function AISettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/ai").then(res => res.json()).then(data => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) setMessage("تم حفظ الإعدادات بنجاح!");
      else setMessage("حدث خطأ أثناء الحفظ.");
    } catch (err) {
      setMessage("حدث خطأ في الاتصال.");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  };

  const testKey = async (provider: "gemini" | "openai") => {
    const key = provider === "gemini" ? config?.apiKey : config?.openaiApiKey;
    if (!key) return alert("يرجى إدخال المفتاح أولاً");

    if (provider === "gemini") setTestingGemini(true);
    else setTestingOpenAI(true);

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, provider })
      });
      const data = await res.json();
      if (data.success && !data.warning) alert("✅ تم الاتصال بنجاح! المفتاح يعمل.");
      else if (data.success && data.warning) alert("✅ " + data.warning);
      else alert("❌ فشل: " + (data.error || "خطأ غير معروف"));
    } catch (e) {
      alert("❌ حدث خطأ أثناء الاتصال بالخادم.");
    }

    if (provider === "gemini") setTestingGemini(false);
    else setTestingOpenAI(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-3 border-b pb-6 border-gray-100">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <SparklesIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">الذكاء الاصطناعي</h2>
          <p className="text-gray-500 text-sm mt-1">اربط Gemini أو ChatGPT للرد التلقائي الذكي على عملائك.</p>
        </div>
      </header>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3 text-yellow-800 text-sm">
        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <p>البوت يبحث أولاً في <strong>القواعد الثابتة</strong>. لو مفيش رد مناسب، يتحول تلقائياً للذكاء الاصطناعي.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Enable / Provider */}
        <div className="card space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-3">⚙️ الإعدادات العامة</h3>

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <h4 className="font-bold text-gray-800">تفعيل البوت الذكي</h4>
              <p className="text-xs text-gray-500 mt-1">السماح للذكاء الاصطناعي بالرد التلقائي</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={config?.isEnabled || false}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Primary Provider */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">البروفايدر الأساسي</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => setConfig({ ...config, provider: "gemini" })}
                className={`p-4 rounded-xl border-2 text-center transition-all ${config?.provider === "gemini" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="text-2xl mb-1">🔵</div>
                <div className="font-bold text-gray-800">Google Gemini</div>
                <div className="text-xs text-gray-500 mt-1">مجاني • gemini-2.0-flash</div>
              </button>
              <button type="button"
                onClick={() => setConfig({ ...config, provider: "openai" })}
                className={`p-4 rounded-xl border-2 text-center transition-all ${config?.provider === "openai" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="text-2xl mb-1">🟢</div>
                <div className="font-bold text-gray-800">ChatGPT (OpenAI)</div>
                <div className="text-xs text-gray-500 mt-1">مدفوع • gpt-4o-mini</div>
              </button>
            </div>
          </div>

          {/* Fallback toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div>
              <h4 className="font-bold text-blue-800">🔄 التحويل التلقائي (Fallback)</h4>
              <p className="text-xs text-blue-600 mt-1">لو البروفايدر الأساسي فشل، يتحول تلقائياً للبديل</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={config?.fallbackEnabled ?? true}
                onChange={(e) => setConfig({ ...config, fallbackEnabled: e.target.checked })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Gemini API Key */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-3 flex items-center gap-2">
            <span className="text-xl">🔵</span> Google Gemini
            {config?.provider === "gemini" && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">أساسي</span>}
            {config?.provider === "openai" && config?.fallbackEnabled && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">احتياطي</span>}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مفتاح API</label>
            <div className="flex gap-2">
              <input type="password" value={config?.apiKey || ""}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="input flex-1" dir="ltr" placeholder="AIzaSyB-..." />
              <button type="button" onClick={() => testKey("gemini")} disabled={testingGemini || !config?.apiKey}
                className="btn btn-secondary whitespace-nowrap flex items-center gap-1 px-3">
                {testingGemini ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🧪</span>}
                <span>تجربة</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              احصل على مفتاح مجاني من <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline">Google AI Studio</a> - اختر "Create in new project"
            </p>
          </div>
        </div>

        {/* OpenAI API Key */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-3 flex items-center gap-2">
            <span className="text-xl">🟢</span> ChatGPT (OpenAI)
            {config?.provider === "openai" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">أساسي</span>}
            {config?.provider === "gemini" && config?.fallbackEnabled && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">احتياطي</span>}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مفتاح API</label>
            <div className="flex gap-2">
              <input type="password" value={config?.openaiApiKey || ""}
                onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                className="input flex-1" dir="ltr" placeholder="sk-proj-..." />
              <button type="button" onClick={() => testKey("openai")} disabled={testingOpenAI || !config?.openaiApiKey}
                className="btn btn-secondary whitespace-nowrap flex items-center gap-1 px-3">
                {testingOpenAI ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🧪</span>}
                <span>تجربة</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              احصل على مفتاح من <a href="https://platform.openai.com/api-keys" target="_blank" className="text-green-600 underline">OpenAI Platform</a> - يستخدم نموذج gpt-4o-mini (اقتصادي)
            </p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-3">🎭 شخصية البوت (System Prompt)</h3>
          <textarea rows={5} value={config?.systemPrompt || ""}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            className="input"
            placeholder="أنت مساعد مبيعات لشركة كذا. أجب بودية واختصار ومرح. اعرف الأسعار والمنتجات..." />
          <p className="text-xs text-gray-400">هذه التعليمات تحدد شخصية وأسلوب البوت. كلما كانت أكثر تفصيلاً، كانت الردود أدق وأفضل.</p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="btn btn-primary py-3 px-8 flex items-center gap-2">
            {saving ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
          {message && (
            <span className="flex items-center gap-2 text-green-600 text-sm font-bold animate-pulse">
              <CheckCircleIcon className="w-5 h-5" />
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
