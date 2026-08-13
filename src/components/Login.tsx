import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, LogIn, Globe } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        setError(data.error || "خطأ في تسجيل الدخول");
      }
    } catch (e) {
      setError("حدث خطأ في الاتصال بالسيرفر");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-[Inter] relative">
      <button
        onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white shadow-sm hover:bg-slate-50 rounded-xl transition-colors border border-gray-100"
      >
        <Globe className="w-5 h-5" />
        {language === "ar" ? "English" : "العربية"}
      </button>

      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {t("auth.welcome_back")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("auth.login_subtitle")}{" "}
            <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
              {t("auth.create_one")}
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">{error}</div>}
          <div className="space-y-4">
            <div className="relative">
              <div className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pointer-events-none`}>
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email" required
                className={`appearance-none rounded-xl relative block w-full px-3 py-3 ${language === "ar" ? "pr-10" : "pl-10"} border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm`}
                placeholder={t("auth.email")}
                value={email} onChange={(e) => setEmail(e.target.value)}
                dir={language === "ar" ? "rtl" : "ltr"}
              />
            </div>
            <div className="relative">
              <div className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pointer-events-none`}>
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password" required
                className={`appearance-none rounded-xl relative block w-full px-3 py-3 ${language === "ar" ? "pr-10" : "pl-10"} border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm`}
                placeholder={t("auth.password")}
                value={password} onChange={(e) => setPassword(e.target.value)}
                dir={language === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70"
            >
              <span className={`absolute ${language === "ar" ? "left-0 pl-3" : "right-0 pr-3"} inset-y-0 flex items-center`}>
                <LogIn className="h-5 w-5 text-slate-700 group-hover:text-slate-600" aria-hidden="true" />
              </span>
              {loading ? t("common.loading") : t("auth.login_btn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
