/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, Suspense, lazy } from "react";
import {
  Menu, X, Send, FolderPlus, Bot, Users, LayoutDashboard, Database, 
  MapPin, Globe, Headphones, Sparkles, Filter, CreditCard, ChevronRight,
  Smartphone, LogOut, ShieldCheck, FileText, Info, Settings, AlertCircle, CheckCircle2
} from "lucide-react";
import { Campaign, Template, ChatbotRule, Recipient } from "./types";
import { useLanguage } from "./LanguageContext";

const CampaignsView = lazy(() => import("./components/CampaignsView"));
const TemplatesView = lazy(() => import("./components/TemplatesView"));
const ChatbotView = lazy(() => import("./components/ChatbotView"));
const ReportsView = lazy(() => import("./components/ReportsView"));
const SubscribersView = lazy(() => import("./components/SubscribersView"));
const AIAssistantView = lazy(() => import("./components/AIAssistantView"));
const SupportView = lazy(() => import("./components/SupportView"));
const DevicesView = lazy(() => import("./components/DevicesView"));
const AdminDashboardView = lazy(() => import("./components/AdminDashboardView"));
const NumberFilterView = lazy(() => import("./components/NumberFilterView"));
const MapsExtractorView = lazy(() => import("./components/MapsExtractorView"));

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : { name: "Guest", role: "user" };
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<
    "campaigns" | "templates" | "chatbot" | "subscribers" | "reports" | "assistant" | "support" | "filter" | "maps" | "devices" | "admin"
  >("devices");
  
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Core global state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [chatbotRules, setChatbotRules] = useState<ChatbotRule[]>([]);
  const [unsubscribedList, setUnsubscribedList] = useState<string[]>([]);
  
  // Checking backend API configured status
  const [aiStatus, setAiStatus] = useState<{ configured: boolean | null }>({ configured: null });

  // Load data from DB
  useEffect(() => {
    fetch("/api/campaigns").then(res => res.json()).then(data => setCampaigns(data));
    fetch("/api/templates").then(res => res.json()).then(data => setTemplates(data));
    fetch("/api/rules").then(res => res.json()).then(data => setChatbotRules(data));
    fetch("/api/blocked").then(res => res.json()).then(data => setUnsubscribedList(data));

    // Check Gemini API Configuration Status
    fetch("/api/ai-status")
      .then(res => res.json())
      .then(data => setAiStatus({ configured: data.configured }))
      .catch(() => setAiStatus({ configured: false }));
  }, []);

  // Keep reports in sync with the database-backed delivery worker.
  useEffect(() => {
    const refreshCampaigns = async () => {
      try {
        const response = await fetch("/api/campaigns");
        if (response.ok) setCampaigns(await response.json());
      } catch {
        // Keep the last displayed report while the server is temporarily unavailable.
      }
    };
    const timer = window.setInterval(refreshCampaigns, 5_000);
    return () => window.clearInterval(timer);
  }, []);

  // Save and queue a campaign. Delivery then continues in the server worker.
  const handleSaveCampaign = async (camp: Campaign) => {
    const res = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(camp) });
    if (!res.ok) throw new Error("Unable to save campaign.");
    const saved = await res.json();
    setCampaigns(prev => [saved, ...prev]);
    const dispatch = await fetch(`/api/campaigns/${saved.id}/dispatch`, { method: "POST" });
    if (!dispatch.ok) {
      const error = await dispatch.json().catch(() => ({}));
      throw new Error(error.error || "Unable to queue campaign.");
    }
    const queueInfo = await dispatch.json();
    setCampaigns(prev => prev.map(item => item.id === saved.id ? { ...item, status: queueInfo.status } : item));
    // Redirect to reports to show progress/history instantly
    setActiveTab("reports");
  };
  const handleToggleCampaignStatus = async (id: string, action: "pause" | "resume") => {
    try {
      const res = await fetch(`/api/campaigns/${id}/toggle-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const { status } = await res.json();
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      }
    } catch (error) {
      console.error("Error toggling campaign status:", error);
    }
  };


  // Add template
  const handleAddTemplate = async (temp: Template) => {
    const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(temp) });
    const saved = await res.json();
    setTemplates(prev => {
      const filtered = prev.filter(t => t.id !== saved.id);
      return [saved, ...filtered];
    });
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // Link preloading of template into Campaign Composer tab
  const [sharedComposerTemplate, setSharedComposerTemplate] = useState<Template | null>(null);

  const handleApplyTemplateToComposer = (temp: Template) => {
    setSharedComposerTemplate(temp);
    setActiveTab("campaigns");
  };

  // Link group scrap contact lists straight into campaigns draft
  const [sharedImportedRecipients, setSharedImportedRecipients] = useState<Recipient[] | null>(null);

  const handleImportNumbersToCampaign = (numbers: { phone: string; name?: string }[]) => {
    const formatted: Recipient[] = numbers.map(num => ({
      phone: num.phone,
      name: num.name || ""
    }));
    setSharedImportedRecipients(formatted);
    setActiveTab("campaigns");
  };

  // Add Chatbot keyword rule
  const handleAddRule = async (rule: ChatbotRule) => {
    const res = await fetch("/api/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rule) });
    const saved = await res.json();
    setChatbotRules(prev => [saved, ...prev]);
  };

  // Delete Chatbot keyword rule
  const handleDeleteRule = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    setChatbotRules(prev => prev.filter(r => r.id !== id));
  };

  // Toggle Chatbot keyword rule active status
  const handleToggleRule = async (id: string) => {
    const rule = chatbotRules.find(item => item.id === id);
    if (!rule) return;
    const res = await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (!res.ok) return;
    setChatbotRules(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
  };

  // Add to unsubscribed list
  const handleAddUnsubscribed = async (phone: string) => {
    if (!unsubscribedList.includes(phone)) {
      await fetch("/api/blocked", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      setUnsubscribedList(prev => [...prev, phone]);
    }
  };

  // Remove from unsubscribed list
  const handleRemoveUnsubscribed = async (phone: string) => {
    await fetch(`/api/blocked/${encodeURIComponent(phone)}`, { method: "DELETE" });
    setUnsubscribedList(prev => prev.filter(p => p !== phone));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex font-sans" id="app-viewport">
      
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-slate-900 text-white w-64 fixed inset-y-0 left-0 transform transition-transform duration-300 z-30 flex flex-col justify-between ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        id="app-sidebar"
      >
        <div className="p-5 flex flex-col h-full justify-between">
          <div>
            {/* Title / Brand */}
            <div className="flex items-center gap-3 pb-6 border-b border-slate-800 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-black text-white text-lg">
                P
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight leading-tight">Pro Sender Studio</h1>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">WhatsApp Bulk v4.2</span>
              </div>
            </div>



            {/* Nav Menu items */}
            <nav className="space-y-1.5" id="nav-group">
              {[
                ...(isAdmin ? [{ id: "admin", label: t("app.sidebar.admin"), icon: ShieldCheck, desc: "" }] : []),
                { id: "devices", label: t("app.sidebar.devices"), icon: Smartphone, desc: "" },
                { id: "campaigns", label: t("app.sidebar.campaigns"), icon: Send, desc: "" },
                { id: "templates", label: t("app.sidebar.templates"), icon: FolderPlus, desc: "" },
                { id: "chatbot", label: t("app.sidebar.chatbot"), icon: Bot, desc: "" },
                { id: "subscribers", label: t("app.sidebar.subscribers"), icon: Users, desc: "" },
                { id: "maps", label: t("app.sidebar.maps"), icon: MapPin, desc: "" },
                { id: "reports", label: t("app.sidebar.reports"), icon: FileText, desc: "" },
                { id: "assistant", label: t("app.sidebar.assistant"), icon: Sparkles, desc: "" },
                { id: "support", label: t("app.sidebar.support"), icon: Headphones, desc: "" },
                { id: "filter", label: t("app.sidebar.filter"), icon: Filter, desc: "" }
              ].map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      // Close sidebar on mobile
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left transition-all group cursor-pointer ${active ? "bg-slate-800 text-emerald-400 border-r-4 border-emerald-500 font-bold shadow-xs" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"}`}
                  >
                    <Icon className={`w-5 h-5 ${active ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400"}`} />
                    <div>
                      <span className="text-xs block leading-tight">{item.label}</span>
                      <span className={`text-[9px] block font-medium ${active ? "text-emerald-500/90" : "text-slate-500"}`}>{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick instructions and active status in side footer */}
          <div className="border-t border-slate-800/60 pt-4 mt-6 space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-400">System Active</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Anti-Ban Protection Live</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 text-xs">
              <span className="font-bold text-slate-300 block mb-1">{t("app.pro_tips.title")}</span>
              <p className="text-slate-400 text-[10px]">{t("app.pro_tips.desc")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : ""}`} id="app-main-pane">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Toggle mobile sidebar */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-500 lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-base font-bold text-gray-900">
                {activeTab === "admin" && t("app.sidebar.admin")}
                {activeTab === "devices" && t("app.sidebar.devices")}
                {activeTab === "campaigns" && t("app.sidebar.campaigns")}
                {activeTab === "templates" && t("app.sidebar.templates")}
                {activeTab === "chatbot" && t("app.sidebar.chatbot")}
                {activeTab === "subscribers" && t("app.sidebar.subscribers")}
                {activeTab === "reports" && t("app.sidebar.reports")}
                {activeTab === "assistant" && t("app.sidebar.assistant")}
                {activeTab === "support" && t("app.sidebar.support")}
                {activeTab === "filter" && t("app.sidebar.filter")}
                {activeTab === "maps" && t("app.sidebar.maps")}
              </h2>
            </div>
          </div>

          {/* Core API configuration notification status block */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-gray-200"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden md:inline">{language === "ar" ? "English" : "العربية"}</span>
            </button>
            {aiStatus.configured === true ? (
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">{t("app.status.connected")}</span>
                <span className="inline md:hidden">{t("app.status.connected")}</span>
              </div>
            ) : aiStatus.configured === false ? (
              <div className="px-3.5 py-1.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-semibold shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="hidden md:inline">{t("app.status.inactive")}</span>
                <span className="inline md:hidden">{t("app.status.inactive")}</span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                {t("app.status.checking")}
              </div>
            )}
            
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.reload();
              }}
              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg flex items-center gap-1 transition-colors text-xs font-semibold border border-transparent hover:border-red-100"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </header>

        {/* Content viewport area */}
        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[50vh] text-emerald-600">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="font-bold">جاري تحميل الصفحة...</span>
            </div>
          }>
            {activeTab === "admin" && isAdmin && (
              <AdminDashboardView />
            )}

            {activeTab === "devices" && (
              <DevicesView />
            )}

            {activeTab === "campaigns" && (
              <CampaignsView 
                onSaveCampaign={handleSaveCampaign} 
                templates={templates}
                unsubscribedList={unsubscribedList}
                // Direct state passing if coming from templates apply or contact extractor
                key={`${sharedComposerTemplate?.id || ""}_${sharedImportedRecipients?.length || 0}`}
                {...(sharedComposerTemplate ? {
                  initialMessage: sharedComposerTemplate.message,
                  initialAttachmentType: sharedComposerTemplate.attachmentType,
                  initialAttachmentUrl: sharedComposerTemplate.attachmentUrl,
                  initialAttachmentCaption: sharedComposerTemplate.attachmentCaption
                } as any : {})}
                {...(sharedImportedRecipients ? {
                  initialRecipients: sharedImportedRecipients
                } as any : {})}
              />
            )}

            {activeTab === "templates" && (
              <TemplatesView 
                templates={templates} 
                onAddTemplate={handleAddTemplate} 
                onDeleteTemplate={handleDeleteTemplate}
                onApplyTemplateToComposer={handleApplyTemplateToComposer}
              />
            )}

            {activeTab === "chatbot" && (
              <ChatbotView rules={chatbotRules} onAddRule={handleAddRule} onDeleteRule={handleDeleteRule} onToggleRule={handleToggleRule} />
            )}

            {activeTab === "subscribers" && (
              <SubscribersView 
                unsubscribedList={unsubscribedList} 
                onAddUnsubscribed={handleAddUnsubscribed} 
                onRemoveUnsubscribed={handleRemoveUnsubscribed}
                onImportNumbersToCampaign={handleImportNumbersToCampaign}
              />
            )}

            {activeTab === "reports" && (
              <ReportsView 
                campaigns={campaigns} 
                onDeleteCampaign={handleDeleteCampaign} 
                onToggleCampaignStatus={handleToggleCampaignStatus}
              />
            )}

            {activeTab === "assistant" && (
              <AIAssistantView />
            )}

            {activeTab === "support" && (
              <SupportView />
            )}

            {activeTab === "filter" && (
              <NumberFilterView />
            )}

            {activeTab === "maps" && (
              <MapsExtractorView />
            )}
          </Suspense>
        </main>
      </div>

    </div>
  );
}
