import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, RefreshCw, User as UserIcon } from "lucide-react";
import { useLanguage } from "../LanguageContext";

interface SupportMessage {
  id: number;
  text: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function SupportView() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/support", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to fetch support messages", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Auto-refresh every 3s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || sending) return;
    
    const text = userInput.trim();
    setUserInput("");
    setSending(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}`
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        await fetchMessages();
      } else {
        setUserInput(text); // Restore on fail
        alert(language === "ar" ? "فشل إرسال الرسالة، يرجى المحاولة مرة أخرى." : "Failed to send message, please try again.");
      }
    } catch (e) {
      setUserInput(text);
      alert(language === "ar" ? "خطأ في الاتصال بالشبكة." : "Network connection error.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      
      {/* Header */}
      <div className="bg-emerald-600 p-4 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{language === "ar" ? "الدعم الفني المباشر" : "Live Tech Support"}</h2>
            <p className="text-emerald-100 text-xs">{language === "ar" ? "تحدث مع الإدارة لحل أي مشكلة تواجهك" : "Talk with administration to resolve any issue you face"}</p>
          </div>
        </div>
        <button 
          onClick={fetchMessages} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          title={language === "ar" ? "تحديث المحادثة" : "Refresh Conversation"}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
            <p className="font-medium text-sm">{language === "ar" ? "مرحباً بك في الدعم الفني!" : "Welcome to Technical Support!"}</p>
            <p className="text-xs mt-1">{language === "ar" ? "اكتب استفسارك بالأسفل وسيقوم أحد ممثلي الإدارة بالرد عليك في أسرع وقت." : "Write your inquiry below and an administration representative will reply as soon as possible."}</p>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 max-w-[85%] md:max-w-[70%] ${!msg.isAdmin ? (language === "ar" ? "mr-auto flex-row-reverse" : "ml-auto flex-row-reverse") : (language === "ar" ? "ml-auto" : "mr-auto")}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${!msg.isAdmin ? "bg-emerald-600 text-white" : "bg-neutral-800 text-white"}`}>
              {!msg.isAdmin ? <UserIcon className="w-4 h-4" /> : (language === "ar" ? "إ" : "A")}
            </div>
            <div className={`flex flex-col ${!msg.isAdmin ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-2.5 shadow-sm relative text-sm ${!msg.isAdmin ? "bg-emerald-100 text-emerald-900 rounded-2xl rounded-tr-sm" : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 mx-1" dir="ltr">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={language === "ar" ? "اكتب رسالتك للإدارة هنا..." : "Write your message to administration here..."}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            disabled={sending}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!userInput.trim() || sending}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer gap-2"
          >
            <Send className={`w-4 h-4 ${language === "ar" ? "rtl:-scale-x-100" : ""}`} />
            <span className="hidden sm:inline">{language === "ar" ? "إرسال" : "Send"}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
