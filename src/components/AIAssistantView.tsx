import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, RefreshCw, HelpCircle, FileText } from "lucide-react";
import { ChatMessage } from "../types";
import { useLanguage } from "../LanguageContext";

export default function SmartAssistantView() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "assistant",
      text: language === "ar" ? "مرحبًا! أنا مساعدك الذكي في التخطيط وكتابة نصوص حملات واتساب. 👋\n\nيمكنني مساعدتك في:\n1. كتابة نصوص تسويقية عالية التحويل مصممة لواتساب.\n2. العصف الذهني لحملات إطلاق المنتجات.\n3. صياغة قوالب ردود لوكلاء الدعم.\n\nما الذي تخطط لإرساله اليوم؟" : "Hello! I am your Smart WhatsApp Campaign Strategist and Copywriter co-pilot. 👋\n\nI can help you:\n1. Write high-conversion marketing copy designed for WhatsApp.\n2. Brainstorm product launch campaigns.\n3. Formulate response templates for support agents.\n\nWhat are you planning to send today?",
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Map conversation history safely
      const mappedHistory = messages.concat(userMsg).map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const fullPrompt = mappedHistory.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: fullPrompt }],
          systemInstruction: "You are a highly skilled copywriter and AI strategist specializing in writing compelling, high-conversion WhatsApp marketing messages. Always respond directly with the requested ad copy or variations. Keep formatting clean using markdown (bolding, italics, emojis where appropriate). Do not break character.",
          model: "gemini-3.6-flash"
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, {
          id: `reply_${Date.now()}`,
          sender: "assistant",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `reply_error_${Date.now()}`,
          sender: "assistant",
          text: language === "ar" ? "⚠️ لم يتمكن المساعد الذكي من الرد. يرجى التأكد من صحة مفتاح API الخاص بك في الإعدادات." : "⚠️ Smart Assistant API was unable to respond. Please make sure your API key in Settings is valid.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `reply_err_${Date.now()}`,
        sender: "assistant",
        text: language === "ar" ? "🔌 فشل الاتصال. يرجى التأكد من عمل الخادم الخاص بك." : "🔌 Connection failed. Please ensure your backend is up and running.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "init",
        sender: "assistant",
        text: language === "ar" ? "مرحبًا مجددًا! دعنا نصيغ نص حملة آخر يركز على التحويل أو قالب رد." : "Hello again! Let's draft another conversion-focused campaign text or reply template.",
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs max-w-4xl mx-auto flex flex-col h-[650px]" id="ai-assistant-pane">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {language === "ar" ? "خبير التسويق الذكي" : "Smart Marketing Strategist"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">{language === "ar" ? "قم بصياغة نصوص واتساب عالية التحويل على الفور باستخدام المساعد الذكي" : "Draft high-conversion WhatsApp copy instantly using the Smart Assistant"}</p>
        </div>
        
        <button 
          onClick={handleClear}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {language === "ar" ? "مسح المحادثة" : "Clear Thread"}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 rounded-2xl p-4 space-y-4 scrollbar-thin border border-gray-100 text-xs">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "self-end ml-auto flex-row-reverse" : "self-start"}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${msg.sender === "user" ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"}`}>
              {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`rounded-2xl p-4 shadow-2xs relative ${msg.sender === "user" ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none border border-gray-100"}`}>
              <p className="whitespace-pre-wrap leading-relaxed text-xs font-sans font-medium">{msg.text}</p>
              <span className="text-[9px] text-gray-400 text-right block mt-1.5">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%] self-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-2xs border border-gray-100 text-xs text-gray-500 italic flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              {language === "ar" ? "المساعد يكتب أفكار القوالب..." : "Assistant is writing template ideas..."}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Prompt suggestions row */}
      <div className="flex flex-wrap gap-2 py-3">
        {(language === "ar" ? [
          "اكتب نص ترويجي لتخفيضات الصيف",
          "صغ قالب تأكيد طلب",
          "أنشئ نص تذكير ودود للتخلي عن سلة التسوق"
        ] : [
          "Write a summer clearance promotional copy",
          "Draft an order confirmation template",
          "Create a warm cart abandonment reminder copy"
        ]).map((promptText, idx) => (
          <button 
            key={idx}
            onClick={() => setInput(promptText)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-100 hover:border-emerald-300 text-gray-600 rounded-lg text-[10px] font-semibold text-left transition-all"
          >
            💡 {promptText}
          </button>
        ))}
      </div>

      {/* Send composer */}
      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={language === "ar" ? "اطلب من الخبير الذكي كتابة، تحسين أو مراجعة قوالبك..." : "Ask Smart Strategist to write, refine, or review your templates..."}
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
