"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  PaperAirplaneIcon, 
  UserGroupIcon, 
  ChatBubbleLeftEllipsisIcon, 
  Cog6ToothIcon,
  UsersIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  RectangleStackIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

const menuItems = [
  { name: "لوحة التحكم", href: "/", icon: HomeIcon },
  { name: "الحملات", href: "/campaigns", icon: PaperAirplaneIcon },
  { name: "جهات الاتصال", href: "/contacts", icon: UsersIcon },
  { name: "القائمة السوداء", href: "/contacts/blacklist", icon: NoSymbolIcon },
  { name: "المجموعات", href: "/groups", icon: UserGroupIcon },
  { name: "صندوق الوارد", href: "/chats", icon: ChatBubbleLeftRightIcon, badge: "live" },
  { name: "الشات بوت", href: "/bot", icon: ChatBubbleLeftEllipsisIcon },
  { name: "القوالب", href: "/templates", icon: RectangleStackIcon },
  { name: "الذكاء الاصطناعي", href: "/bot/ai-settings", icon: SparklesIcon },
  { name: "قاعدة المعرفة", href: "/bot/knowledge", icon: DocumentTextIcon },
  { name: "ربط API", href: "/webhooks", icon: LinkIcon },
  { name: "الإعدادات", href: "/settings", icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/init").catch(err => console.error("Init Error:", err));
  }, []);

  if (pathname === '/login') return null;

  return (
    <aside suppressHydrationWarning className="w-64 bg-white border-l border-gray-100 flex flex-col h-full shadow-sm z-20">
      <div suppressHydrationWarning className="p-6">
        <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
           <span>{process.env.NEXT_PUBLIC_APP_NAME || "WA Sender"}</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">{process.env.NEXT_PUBLIC_APP_DESC || "نسخة المحترفين"}</p>
      </div>
      
      <nav suppressHydrationWarning className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? "bg-green-50 text-green-700" 
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-400 group-hover:text-green-500"}`} />
              <span className="font-medium flex-1">{item.name}</span>
              {(item as any).badge === 'live' && (
                <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full uppercase">LIVE</span>
              )}
            </Link>
          );
        })}
      </nav>
      
      <div suppressHydrationWarning className="p-4 border-t border-gray-50 text-center flex flex-col items-center">
        <button 
          onClick={() => {
            // Need to import signOut or just do window.location.href='/api/auth/signout' to avoid importing next-auth/react in sidebar if we don't wrap it in SessionProvider
            window.location.href = '/api/auth/signout';
          }} 
          className="text-sm text-red-500 hover:text-red-700 w-full mb-3 py-2 rounded border border-red-100 hover:bg-red-50 transition-colors"
        >
          تسجيل خروج
        </button>
        <p className="text-[10px] text-gray-300">حقوق الطبع والنشر © {process.env.NEXT_PUBLIC_COPYRIGHT || "2025"}</p>
      </div>
    </aside>
  );
}
