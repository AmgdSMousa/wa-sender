"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon, XCircleIcon, PaperAirplaneIcon,
  UserGroupIcon, ChatBubbleLeftRightIcon, ChartBarIcon, SparklesIcon,
  HandThumbUpIcon, EyeIcon, RocketLaunchIcon, PhoneIcon,
  BellAlertIcon, ChatBubbleLeftEllipsisIcon, RectangleStackIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, BoltIcon,
  CalendarDaysIcon, UserCircleIcon, InboxIcon,
  ClockIcon, SignalIcon, NoSymbolIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
} from 'recharts';

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  connected:    { label: 'واتساب متصل',         dot: 'bg-green-500',  badge: 'bg-green-50 border-green-200 text-green-700'  },
  qr:           { label: 'في انتظار المسح',      dot: 'bg-yellow-400', badge: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  connecting:   { label: 'جاري الاتصال...',      dot: 'bg-blue-400 animate-bounce',   badge: 'bg-blue-50 border-blue-200 text-blue-700'     },
  disconnected: { label: 'غير متصل',             dot: 'bg-red-500',    badge: 'bg-red-50 border-red-200 text-red-700'         },
  loading:      { label: 'جاري التحقق...',       dot: 'bg-gray-400 animate-pulse',    badge: 'bg-gray-50 border-gray-200 text-gray-500'      },
};

const CAMPAIGN_STATUS: Record<string, string> = {
  running:   'text-blue-600 bg-blue-50',
  draft:     'text-gray-600 bg-gray-100',
  completed: 'text-green-600 bg-green-50',
  done:      'text-green-600 bg-green-50',
  paused:    'text-yellow-600 bg-yellow-50',
  failed:    'text-red-600 bg-red-50',
};
const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  running: 'يعمل', draft: 'مسودة', completed: 'مكتمل', done: 'منتهي', paused: 'متوقف', failed: 'فشل'
};

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [waStatus, setWaStatus] = useState<string>("loading");
  const [stats, setStats] = useState<any>({
    sent: 0, failed: 0, botReplied: 0, aiReplied: 0, delivered: 0, read: 0,
    deliveryRate: 0, readRate: 0, failRate: 0,
    totalContacts: 0, blacklisted: 0, totalCampaigns: 0,
    runningCampaigns: 0, draftCampaigns: 0, completedCampaigns: 0,
    totalTemplates: 0, unreadMessages: 0, humanModeChats: 0,
  });
  const [history, setHistory] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [recentInbox, setRecentInbox] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setIsClient(true);
    const tick = setInterval(() => setNow(new Date()), 60000);

    const eventSource = new EventSource("/api/wa/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWaStatus(data.waStatus || "disconnected");
        setStats(data.stats || {});
        setHistory(data.history || []);
        if (Array.isArray(data.keywords)) setKeywords(data.keywords);
        if (Array.isArray(data.recentCampaigns)) setRecentCampaigns(data.recentCampaigns);
        if (Array.isArray(data.recentInbox)) setRecentInbox(data.recentInbox);
      } catch (err) {}
    };
    eventSource.onerror = () => {};
    return () => { eventSource.close(); clearInterval(tick); };
  }, []);

  const statusCfg = STATUS_CONFIG[waStatus] || STATUS_CONFIG.disconnected;

  const kpiCards = [
    {
      title: "إرسال اليوم",
      value: stats.sent,
      sub: `${stats.deliveryRate}% وصل`,
      icon: PaperAirplaneIcon,
      color: "text-green-600", bg: "bg-green-50",
      trend: stats.sent > 0 ? 'up' : null,
      link: '/campaigns',
    },
    {
      title: "جهات الاتصال",
      value: stats.totalContacts.toLocaleString('ar-EG'),
      sub: `${stats.blacklisted} في القائمة السوداء`,
      icon: PhoneIcon,
      color: "text-purple-600", bg: "bg-purple-50",
      link: '/contacts',
    },
    {
      title: "صندوق الوارد",
      value: stats.unreadMessages,
      sub: stats.unreadMessages > 0 ? "رسائل جديدة بانتظارك" : "لا يوجد رسائل جديدة",
      icon: InboxIcon,
      color: "text-sky-600", bg: "bg-sky-50",
      alert: stats.unreadMessages > 0,
      link: '/chats',
    },
    {
      title: "الحملات",
      value: stats.totalCampaigns,
      sub: stats.runningCampaigns > 0 ? `🔵 ${stats.runningCampaigns} تعمل الآن` : `${stats.completedCampaigns} مكتملة`,
      icon: RocketLaunchIcon,
      color: "text-orange-600", bg: "bg-orange-50",
      link: '/campaigns',
    },
    {
      title: "ردود البوت",
      value: stats.botReplied,
      sub: "رد ثابت اليوم",
      icon: ChatBubbleLeftEllipsisIcon,
      color: "text-blue-600", bg: "bg-blue-50",
      link: '/bot',
    },
    {
      title: "ردود الذكاء",
      value: stats.aiReplied,
      sub: "ذكاء اصطناعي اليوم",
      icon: SparklesIcon,
      color: "text-indigo-600", bg: "bg-indigo-50",
      link: '/bot/ai-settings',
    },
    {
      title: "تم القراءة",
      value: stats.read,
      sub: `${stats.readRate}% من الواصل`,
      icon: EyeIcon,
      color: "text-teal-600", bg: "bg-teal-50",
    },
    {
      title: "القوالب",
      value: stats.totalTemplates,
      sub: "قالب محفوظ",
      icon: RectangleStackIcon,
      color: "text-pink-600", bg: "bg-pink-50",
      link: '/templates',
    },
  ];

  const funnelData = [
    { name: 'مُرسلة', value: stats.sent, fill: '#10b981' },
    { name: 'وصلت', value: stats.delivered, fill: '#3b82f6' },
    { name: 'قُرئت', value: stats.read, fill: '#6366f1' },
  ];

  const distributionData = [
    { name: 'إرسال', value: stats.sent, color: '#10b981' },
    { name: 'AI', value: stats.aiReplied, color: '#6366f1' },
    { name: 'البوت', value: stats.botReplied, color: '#3b82f6' },
    { name: 'فشل', value: stats.failed, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const greetHour = now.getHours();
  const greeting = greetHour < 12 ? "صباح الخير" : greetHour < 17 ? "مساء الخير" : "مساء النور";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{greeting}! 👋</h2>
          <p className="text-gray-400 mt-1 text-sm">
            {now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Unread badge */}
          {stats.unreadMessages > 0 && (
            <Link href="/chats" className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors animate-pulse">
              <BellAlertIcon className="h-4 w-4" />
              {stats.unreadMessages} رسالة جديدة
            </Link>
          )}
          {/* WA Status */}
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium ${statusCfg.badge}`}>
            <div className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
            {waStatus !== 'connected' && (
              <Link href="/settings" className="text-xs underline hover:no-underline mr-1">ربط الآن</Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpiCards.map((card) => {
          const Wrapper = card.link ? Link : 'div';
          return (
            // @ts-ignore
            <Wrapper
              key={card.title}
              href={card.link || '#'}
              className={`card p-4 flex flex-col gap-2 group transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
                card.alert ? 'ring-2 ring-red-300 ring-offset-1' : ''
              }`}
            >
              {card.alert && (
                <div className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-ping" />
              )}
              <div className={`p-2 rounded-xl w-fit ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <div className="flex items-end gap-1">
                  <h3 className="text-xl font-bold text-gray-900">{card.value}</h3>
                  {card.trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mb-0.5" />}
                  {card.trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mb-0.5" />}
                </div>
                <p className="text-[11px] font-semibold text-gray-500 leading-tight mt-0.5">{card.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.sub}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* ─── Charts Row ─────────────────────────────────────────────────────── */}
      {!isClient ? (
        <div className="h-[280px] w-full bg-gray-50 animate-pulse rounded-2xl" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Area chart */}
          <div className="card lg:col-span-2">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-gray-800">
              <ChartBarIcon className="w-5 h-5 text-indigo-500" />
              نشاط الإرسال — آخر 7 أيام
            </h3>
            <div className="h-[230px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="sent" name="إرسال" stroke="#10b981" strokeWidth={2.5} fill="url(#gSent)" dot={false} />
                  <Area type="monotone" dataKey="read" name="قراءة" stroke="#6366f1" strokeWidth={2} fill="url(#gRead)" dot={false} />
                  <Area type="monotone" dataKey="failed" name="فشل" stroke="#ef4444" strokeWidth={1.5} fill="url(#gFailed)" dot={false} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut distribution */}
          <div className="card flex flex-col">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-gray-800">
              <HandThumbUpIcon className="w-5 h-5 text-indigo-500" />
              توزيع اليوم
            </h3>
            <div className="flex-1 flex items-center justify-center">
              {distributionData.length === 0 ? (
                <div className="text-center text-gray-300">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">لا يوجد نشاط اليوم</p>
                </div>
              ) : (
                <div className="w-full h-[210px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={78}
                        paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 11 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Delivery Funnel */}
        <div className="card">
          <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-gray-800">
            <BoltIcon className="w-5 h-5 text-green-500" />
            مسار التوصيل اليوم
          </h3>
          {stats.sent === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-300">
              <PaperAirplaneIcon className="h-10 w-10 mb-2" />
              <p className="text-sm">لا يوجد إرسال اليوم</p>
              <Link href="/campaigns" className="mt-3 text-xs text-green-600 hover:underline">ابدأ حملة جديدة</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {funnelData.map((item) => {
                const pct = stats.sent > 0 ? Math.round((item.value / stats.sent) * 100) : 0;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-600">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: item.fill }}>{item.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                {[
                  { label: 'وصول', value: `${stats.deliveryRate}%`, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'قراءة', value: `${stats.readRate}%`, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  { label: 'فشل', value: `${stats.failRate}%`, color: 'text-red-700', bg: 'bg-red-50' },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} rounded-xl p-2.5 text-center`}>
                    <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
                    <div className={`text-[10px] ${m.color} opacity-70`}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="card">
          <h3 className="text-base font-bold mb-4 flex items-center justify-between text-gray-800">
            <span className="flex items-center gap-2"><RocketLaunchIcon className="w-5 h-5 text-orange-500" />أحدث الحملات</span>
            <Link href="/campaigns" className="text-xs text-indigo-600 hover:underline font-normal">الكل</Link>
          </h3>
          {recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-300">
              <RocketLaunchIcon className="h-10 w-10 mb-2" />
              <p className="text-sm">لا توجد حملات بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCampaigns.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`p-1.5 rounded-lg ${c.status === 'running' ? 'bg-blue-50' : c.status === 'completed' || c.status === 'done' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {c.isDrip
                      ? <CalendarDaysIcon className="h-4 w-4 text-purple-500" />
                      : <PaperAirplaneIcon className={`h-4 w-4 ${c.status === 'running' ? 'text-blue-500' : 'text-gray-400'}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c._count.contacts} مستلم • {new Date(c.createdAt).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS[c.status] || 'bg-gray-100 text-gray-500'}`}>
                    {CAMPAIGN_STATUS_LABEL[c.status] || c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Inbox preview */}
        <div className="card">
          <h3 className="text-base font-bold mb-4 flex items-center justify-between text-gray-800">
            <span className="flex items-center gap-2">
              <InboxIcon className="w-5 h-5 text-sky-500" />
              آخر الرسائل الواردة
              {stats.unreadMessages > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{stats.unreadMessages}</span>
              )}
            </span>
            <Link href="/chats" className="text-xs text-indigo-600 hover:underline font-normal">الكل</Link>
          </h3>
          {recentInbox.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-300">
              <InboxIcon className="h-10 w-10 mb-2" />
              <p className="text-sm">لا توجد رسائل واردة بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentInbox.map((msg: any) => (
                <Link key={msg.id} href={`/chats?phone=${msg.phone}`}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="p-1.5 bg-gray-100 rounded-full flex-shrink-0">
                    <UserCircleIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-700">
                        {msg.contact?.name || msg.phone}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{msg.body}</p>
                  </div>
                  {!msg.isRead && (
                    <div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </Link>
              ))}
            </div>
          )}
          {stats.humanModeChats > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-orange-600 font-medium flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                {stats.humanModeChats} محادثة في وضع البشري (البوت متوقف)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Keywords Chart ──────────────────────────────────────────────────── */}
      {isClient && keywords.filter(k => k.hitCount > 0).length > 0 && (
        <div className="card">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-gray-800">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500" />
            أكثر كلمات البوت تشغيلاً
          </h3>
          <div className="h-[180px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={keywords.filter(k => k.hitCount > 0).slice(0, 8)} layout="vertical" margin={{ left: 10, right: 25, top: 0, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="keyword" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} width={85} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 11 }} />
                <Bar dataKey="hitCount" name="عدد الاستخدام" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'حملة جديدة', href: '/campaigns', icon: RocketLaunchIcon, color: 'text-green-600 bg-green-50 hover:bg-green-100' },
          { label: 'القوالب', href: '/templates', icon: RectangleStackIcon, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
          { label: 'صندوق الوارد', href: '/chats', icon: InboxIcon, color: 'text-sky-600 bg-sky-50 hover:bg-sky-100' },
          { label: 'ربط API', href: '/webhooks', icon: SignalIcon, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
        ].map(action => (
          <Link key={action.label} href={action.href}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-medium text-sm transition-all ${action.color}`}>
            <action.icon className="h-5 w-5" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
