import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { 
  Sparkles, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  ToggleLeft, 
  ToggleRight, 
  HelpCircle, 
  Bot, 
  User, 
  RefreshCw, 
  Play, 
  BrainCircuit,
  Volume2
} from "lucide-react";
import { ChatbotRule, ChatMessage } from "../types";

interface ChatbotViewProps {
  rules: ChatbotRule[];
  onAddRule: (rule: ChatbotRule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}

export default function ChatbotView({ rules, onAddRule, onDeleteRule, onToggleRule }: ChatbotViewProps) {
  const { language } = useLanguage();
  // Keyword rule inputs
  const [trigger, setTrigger] = useState("");
  const [response, setResponse] = useState("");
  const [triggerType, setTriggerType] = useState<"equals" | "contains" | "starts_with">("contains");

  // Bot co-pilot configuration
  const [aiEnabled, setAiEnabled] = useState(true);
  const [systemRole, setSystemRole] = useState("You are a helpful customer support assistant for a business. Keep responses concise and friendly.");
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");

  // Chat simulator state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: "1", sender: "bot", text: language === "ar" ? "أهلاً! اكتب رسالة لاختبار القواعد التلقائية أو الردود الذكية." : "Welcome! Type a prompt to test my automated rules or smart replies.", timestamp: new Date().toLocaleTimeString() }
  ]);
  const [clientMessage, setClientMessage] = useState("");
  const [botIsThinking, setBotIsThinking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll simulator chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, botIsThinking]);

  // Handle adding custom rule
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trigger.trim() || !response.trim()) return;

    const newRule: ChatbotRule = {
      id: `rule_${Date.now()}`,
      trigger: trigger.trim().toLowerCase(),
      triggerType,
      response: response.trim(),
      active: true
    };

    onAddRule(newRule);
    setTrigger("");
    setResponse("");
  };

  // Find keyword match
  const checkKeywordRules = (text: string): string | null => {
    const cleanText = text.toLowerCase().trim();
    for (const rule of rules) {
      if (!rule.active) continue;
      
      if (rule.triggerType === "equals" && cleanText === rule.trigger) {
        return rule.response;
      }
      if (rule.triggerType === "contains" && cleanText.includes(rule.trigger)) {
        return rule.response;
      }
      if (rule.triggerType === "starts_with" && cleanText.startsWith(rule.trigger)) {
        return rule.response;
      }
    }
    return null;
  };

  // Handle simulated message from client
  const handleSendSimulatedMessage = async () => {
    if (!clientMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "client",
      text: clientMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setClientMessage("");
    setBotIsThinking(true);

    // Simulate delay for bot
    setTimeout(async () => {
      // 1. Check keyword rules first
      const ruleMatch = checkKeywordRules(userMsg.text);
      if (ruleMatch) {
        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}`,
          sender: "bot",
          text: ruleMatch,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, botMsg]);
        setBotIsThinking(false);
        return;
      }

      // 2. If no rule matches and AI is enabled, call Chat backend
      if (aiEnabled) {
        try {
          // Keep only the last 10 messages to save context token limits
          const relevantHistory = chatHistory
            .concat(userMsg)
            .map(msg => ({
              role: msg.sender === "client" ? "user" : "assistant",
              content: msg.text
            }));

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: relevantHistory,
              systemInstruction: systemRole,
              model: selectedModel
            })
          });

          const data = await res.json();
          if (data.reply) {
            const botMsg: ChatMessage = {
              id: `msg_bot_${Date.now()}`,
              sender: "bot",
              text: data.reply,
              timestamp: new Date().toLocaleTimeString()
            };
            setChatHistory(prev => [...prev, botMsg]);
          } else {
            const errorMsg: ChatMessage = {
              id: `msg_error_${Date.now()}`,
              sender: "bot",
              text: language === "ar" ? "⚠️ خطأ في المساعد: لم يتمكن من إنشاء رد. تأكد من تكوين مفتاح API بشكل صحيح." : "⚠️ Assistant Error: Could not generate a response. Ensure your API key is correctly configured.",
              timestamp: new Date().toLocaleTimeString()
            };
            setChatHistory(prev => [...prev, errorMsg]);
          }
        } catch (err) {
          console.error(err);
          const networkError: ChatMessage = {
            id: `msg_net_${Date.now()}`,
            sender: "bot",
            text: language === "ar" ? "🔌 مشكلة في اتصال الخادم. استخدام الرد الاحتياطي: 'عذراً، أنا غير متصل الآن!'" : "🔌 Server connection issue. Using fallback: 'Sorry, I am offline right now!'",
            timestamp: new Date().toLocaleTimeString()
          };
          setChatHistory(prev => [...prev, networkError]);
        }
      } else {
        // Fallback response if no keywords found and AI is off
        const defaultReply: ChatMessage = {
          id: `msg_def_${Date.now()}`,
          sender: "bot",
          text: language === "ar" ? "شكراً لرسالتك! وكلاؤنا غير متصلين حالياً. اترك بريدك الإلكتروني وسنرد عليك قريباً." : "Thanks for your message! Our agents are currently offline. Leave your email and we'll reply soon.",
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, defaultReply]);
      }
      setBotIsThinking(false);
    }, 1000);
  };

  const handleClearChatSimulator = () => {
    setChatHistory([
      { id: "1", sender: "bot", text: language === "ar" ? "مرحباً بعودتك! اكتب رسالة لاختبار القواعد التلقائية أو الردود الذكية." : "Welcome back! Type a prompt to test my automated rules or smart replies.", timestamp: new Date().toLocaleTimeString() }
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="chatbot-workspace">
      
      {/* Bot controls and Keyword triggers - 7 columns */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Core Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-emerald-600" />
                {language === "ar" ? "مساعد الدردشة الذكي" : "Chat Co-pilot"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "دع المساعد يجيب على الاستفسارات المخصصة عندما لا تتطابق الكلمات المفتاحية" : "Let the Assistant answer custom queries when keywords are not matched"}</p>
            </div>
            
            <button 
              onClick={() => setAiEnabled(!aiEnabled)}
              className="text-gray-600 transition-all cursor-pointer"
            >
              {aiEnabled ? (
                <ToggleRight className="w-10 h-10 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-400" />
              )}
            </button>
          </div>

          {aiEnabled && (
            <div className="space-y-4 pt-2 border-t border-gray-50 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{language === "ar" ? "اختيار النموذج" : "Model Selection"}</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-hidden font-medium text-gray-700"
                  >
                    <option value="gemini-3.6-flash">{language === "ar" ? "⚡ النموذج القياسي (سريع ومتوازن)" : "⚡ Standard Model (Fast & Balanced)"}</option>
                    <option value="gemini-3.6-pro">{language === "ar" ? "🧠 النموذج المتقدم (منطق معقد)" : "🧠 Advanced Model (Complex Logic)"}</option>
                    <option value="gemini-3.6-flash-lite">{language === "ar" ? "🏎️ نموذج يركز على السرعة" : "🏎️ Speed-focused Model"}</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[10px] leading-relaxed">
                    {language === "ar" ? "يحتفظ المساعد بسجل المحادثة الكامل للحصول على ردود غنية بالسياق ومتعددة الأدوار!" : "The Assistant maintains full conversation history for context-rich, multi-turn replies!"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{language === "ar" ? "تعليمات مخصصة للوكيل (دور النظام)" : "Agent Custom Instructions (System Role)"}</label>
                <textarea 
                  rows={4}
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed font-sans"
                  placeholder={language === "ar" ? "حدد شخصية الروبوت، القواعد، تفاصيل الأسعار، العنوان، وإرشادات الرد..." : "Define your chatbot's persona, rules, pricing details, address, and response guidelines..."}
                />
              </div>

            </div>
          )}
        </div>

        {/* Keyword Rule builder */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "قواعد الرد التلقائي بالكلمات المفتاحية" : "Auto-Reply Keyword Rules"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "حدد الكلمات المفتاحية أو العبارات المطابقة قبل التحقق من المساعد الذكي" : "Define trigger keywords or phrases to match before checking the Smart Assistant"}</p>
          </div>

          <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            <div className="md:col-span-3">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">{language === "ar" ? "نمط المطابقة" : "Match Pattern"}</label>
              <select 
                value={triggerType}
                onChange={(e: any) => setTriggerType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-hidden font-semibold"
              >
                <option value="contains">{language === "ar" ? "يحتوي على" : "Contains"}</option>
                <option value="equals">{language === "ar" ? "يساوي" : "Equals"}</option>
                <option value="starts_with">{language === "ar" ? "يبدأ بـ" : "Starts With"}</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">{language === "ar" ? "الكلمات المفتاحية" : "Trigger Keyword(s)"}</label>
              <input 
                type="text" 
                required
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder={language === "ar" ? "مثال: السعر، الكتالوج" : "e.g. price, catalog"}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">{language === "ar" ? "رسالة الرد" : "Reply Message"}</label>
              <input 
                type="text" 
                required
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={language === "ar" ? "كتالوج أسعارنا هو..." : "Our pricing catalog is..."}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="col-span-12 pt-1">
              <button 
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" /> {language === "ar" ? "إضافة قاعدة رد" : "Add Reply Rule"}
              </button>
            </div>
          </form>

          {/* Active Rules List */}
          {rules.length > 0 ? (
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                    <th className="p-3">{language === "ar" ? "الكلمة المفتاحية" : "Trigger Keyword"}</th>
                    <th className="p-3">{language === "ar" ? "نوع المطابقة" : "Match Type"}</th>
                    <th className="p-3">{language === "ar" ? "الرد" : "Reply Response"}</th>
                    <th className="p-3 text-right">{language === "ar" ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-gray-900">"{rule.trigger}"</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[9px] uppercase font-bold text-gray-500">
                          {rule.triggerType}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate" title={rule.response}>{rule.response}</td>
                      <td className="p-3 text-right flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => onToggleRule(rule.id)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${rule.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                        >
                          {rule.active ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "معطل" : "Disabled")}
                        </button>
                        <button 
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 border border-dashed border-gray-100 rounded-xl">
              <span className="text-xs">{language === "ar" ? "لم تتم إضافة قواعد رد تلقائي بعد. الكلمات المفتاحية القياسية تستخدم الردود الافتراضية للروبوت." : "No auto-reply rules added yet. Standard keywords default to chatbot replies."}</span>
            </div>
          )}
        </div>

      </div>

      {/* Interactive Mobile Chat Simulator Sandbox - 5 columns */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col h-[600px]">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-emerald-600" />
                {language === "ar" ? "بيئة اختبار المطور للروبوت" : "Bot Developer Sandbox"}
              </h2>
              <p className="text-[10px] text-gray-500">{language === "ar" ? "محاكاة محادثة حية متعددة الأدوار" : "Live multi-turn conversation simulation"}</p>
            </div>
            
            <button 
              onClick={handleClearChatSimulator}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {language === "ar" ? "إعادة تعيين المحادثة" : "Reset Thread"}
            </button>
          </div>

          {/* Scrollable chat log viewport */}
          <div className="flex-1 overflow-y-auto bg-[#efeae2] p-4 rounded-xl space-y-4 scrollbar-thin flex flex-col justify-end text-xs">
            <div className="space-y-4 max-h-full overflow-y-auto pr-1">
              
              {chatHistory.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex gap-2 max-w-[85%] ${msg.sender === "client" ? "self-end ml-auto flex-row-reverse" : "self-start"}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs ${msg.sender === "client" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-emerald-400"}`}>
                    {msg.sender === "client" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  
                  <div className={`rounded-xl p-3 shadow-xs relative ${msg.sender === "client" ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans break-words">{msg.text}</p>
                    <span className="text-[8px] text-gray-400 text-right block mt-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {botIsThinking && (
                <div className="flex gap-2 max-w-[85%] self-start">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-xs text-[11px] text-gray-500 italic flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                    {language === "ar" ? "الروبوت يكتب رداً..." : "Chatbot is writing a response..."}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Send Input Area */}
          <div className="mt-4 pt-1 flex gap-2">
            <input 
              type="text" 
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendSimulatedMessage()}
              placeholder={language === "ar" ? "اكتب رسالة كعميل محاكى..." : "Type message as a simulated customer..."}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button 
              onClick={handleSendSimulatedMessage}
              disabled={botIsThinking || !clientMessage.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
