import { Link } from "react-router-dom";
import { Send, Users, Shield, Zap, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter] selection:bg-emerald-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2.5 rounded-xl">
                <Send className="text-white w-6 h-6" />
              </div>
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">ProSender</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                {language === "ar" ? "English" : "العربية"}
              </button>
              
              <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                {t("landing.login")}
              </Link>
              <Link to="/register" className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">
                {t("landing.start_free")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative overflow-hidden bg-white">
        <div className="absolute inset-y-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-8">
              {t("landing.title")}
              <span className="text-emerald-600 block mt-2">{t("landing.title_highlight")}</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              {t("landing.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2">
                {t("landing.create_account")} <Zap className="w-5 h-5" />
              </Link>
            </div>
            
            <div className="mt-14 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t("landing.no_cc")}</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t("landing.fast_setup")}</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t("landing.support")}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">{t("landing.features.title")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: t("landing.feat1.title"), desc: t("landing.feat1.desc") },
              { icon: Users, title: t("landing.feat2.title"), desc: t("landing.feat2.desc") },
              { icon: Zap, title: t("landing.feat3.title"), desc: t("landing.feat3.desc") }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                  <f.icon className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
