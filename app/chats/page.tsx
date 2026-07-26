"use client";
import { useEffect, useState, useRef } from "react";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  ArrowPathIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/components/Toast";

interface Message {
  id: number;
  phone: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
  isRead: boolean;
  botHandled: boolean;
  humanMode: boolean;
}

interface Conversation {
  id: number;
  phone: string;
  body: string;
  direction: "in" | "out";
  createdAt: string;
  humanMode: boolean;
  contact?: { name: string | null };
}

export default function ChatsPage() {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [humanMode, setHumanMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (e) {}
    setLoading(false);
  };

  const fetchMessages = async (phone: string) => {
    try {
      const res = await fetch(`/api/chats?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        setHumanMode(data.some((m: Message) => m.humanMode));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      const interval = setInterval(() => fetchMessages(selectedPhone), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedPhone]);

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone) return;
    setSending(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        fetchMessages(selectedPhone);
      } else {
        toast.error("فشل إرسال الرسالة");
      }
    } catch (e) {
      toast.error("خطأ في الإرسال");
    }
    setSending(false);
  };

  const toggleHumanMode = async () => {
    if (!selectedPhone) return;
    const newMode = !humanMode;
    await fetch("/api/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: selectedPhone, humanMode: newMode }),
    });
    setHumanMode(newMode);
    toast.success(newMode ? "🤚 تم تفعيل وضع الإنسان - البوت متوقف" : "🤖 تم تفعيل البوت مجدداً");
  };

  const unreadCount = conversations.filter((c) => c.direction === "in").length;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600" />
            صندوق الوارد المباشر
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
            )}
          </h2>
          <p className="text-gray-500 mt-1">تحدث مع عملائك مباشرة وأوقف البوت لأي محادثة</p>
        </div>
        <button onClick={fetchConversations} className="btn btn-secondary flex items-center gap-2">
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Conversations list */}
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-y-auto shadow-sm">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">لا توجد محادثات بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedPhone(conv.phone)}
                  className={`w-full text-right p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    selectedPhone === conv.phone ? "bg-green-50 border-r-2 border-green-500" : ""
                  }`}
                >
                  <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">
                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {conv.contact?.name || conv.phone}
                      </span>
                      {conv.humanMode && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 flex-shrink-0">بشري</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{conv.body}</p>
                    <p className="text-[10px] text-gray-300 mt-1">
                      {new Date(conv.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {!selectedPhone ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">اختر محادثة</h3>
              <p className="text-gray-300 text-sm mt-2">اضغط على محادثة من القائمة للبدء</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-full">
                    <UserCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-800">{selectedPhone}</span>
                    <p className="text-xs text-gray-400">{messages.length} رسالة</p>
                  </div>
                </div>
                <button
                  onClick={toggleHumanMode}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    humanMode
                      ? "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
                      : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                  }`}
                >
                  {humanMode ? (
                    <>
                      <PauseCircleIcon className="h-5 w-5" />
                      وضع البشري (البوت متوقف)
                    </>
                  ) : (
                    <>
                      <PlayCircleIcon className="h-5 w-5" />
                      البوت يرد تلقائياً
                    </>
                  )}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "url('/chat-bg.png') #f0f2f5" }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "out" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        msg.direction === "out"
                          ? "bg-white text-gray-800 rounded-tr-sm"
                          : "bg-green-600 text-white rounded-tl-sm"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.direction === "out" ? "text-gray-400 justify-start" : "text-green-100 justify-end"}`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.direction === "out" && (
                          <span className="text-[10px] opacity-60">{msg.botHandled ? "🤖" : "👤"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="p-4 border-t border-gray-100 flex items-end gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="اكتب ردك هنا... (Enter للإرسال)"
                  rows={2}
                  className="flex-1 input resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !replyText.trim()}
                  className="btn btn-primary p-3 h-12 w-12 flex items-center justify-center flex-shrink-0"
                >
                  <PaperAirplaneIcon className={`h-5 w-5 ${sending ? "animate-pulse" : ""}`} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
