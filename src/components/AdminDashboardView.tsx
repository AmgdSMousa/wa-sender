import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../LanguageContext";
import { Users, Send, Smartphone, ShieldCheck, Trash2, Key, Ban, CheckCircle, MessageSquare, RefreshCw, X, User as UserIcon } from "lucide-react";

export default function AdminDashboardView() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<any>({ users: 0, campaigns: 0, devices: 0, messages: 0, onlineUsers: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"users" | "support">("users");
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [selectedSupportUser, setSelectedSupportUser] = useState<any | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchUsers = () => fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } }).then(res => res.json()).then(setUsers);

  const fetchSupportUsers = async () => {
    try {
      const res = await fetch("/api/admin/support", { headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } });
      if (res.ok) setSupportUsers(await res.json());
    } catch (e) {}
  };

  const fetchSupportMessages = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/support/${userId}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } });
      if (res.ok) {
        setSupportMessages(await res.json());
        fetchSupportUsers(); // Refresh unread badges
      }
    } catch (e) {}
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } }).then(res => res.json()),
      fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } }).then(res => res.json())
    ]).then(([statsData, usersData]) => {
      setStats(statsData);
      setUsers(usersData);
      setLoading(false);
    });
    fetchSupportUsers();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === "support") {
      fetchSupportUsers();
      if (selectedSupportUser) {
        interval = setInterval(() => fetchSupportMessages(selectedSupportUser.id), 3000);
      } else {
        interval = setInterval(fetchSupportUsers, 5000);
      }
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedSupportUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages]);

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    if (!confirm(currentStatus ? (language === "ar" ? "هل أنت متأكد من إيقاف هذا الحساب؟" : "Are you sure you want to deactivate this account?") : (language === "ar" ? "هل أنت متأكد من تفعيل هذا الحساب؟" : "Are you sure you want to activate this account?"))) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, { method: "PATCH", headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } });
      if (res.ok) fetchUsers();
      else alert(language === "ar" ? "حدث خطأ أثناء التحديث." : "An error occurred during update.");
    } catch (e) {}
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm(language === "ar" ? "تحذير: سيتم حذف هذا المستخدم نهائياً مع كل حملاته وأجهزته! هل أنت متأكد؟" : "Warning: This user will be permanently deleted along with all their campaigns and devices! Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` } });
      if (res.ok) fetchUsers();
      else alert(language === "ar" ? "حدث خطأ أثناء الحذف." : "An error occurred during deletion.");
    } catch (e) {}
  };

  const handleResetPassword = async (id: number) => {
    const newPassword = prompt(language === "ar" ? "أدخل كلمة المرور الجديدة لهذا المستخدم (6 أحرف على الأقل):" : "Enter new password for this user (at least 6 characters):");
    if (!newPassword) return;
    if (newPassword.length < 6) return alert(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل." : "Password must be at least 6 characters.");
    
    try {
      const res = await fetch(`/api/admin/users/${id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) alert(language === "ar" ? "تم تغيير كلمة المرور بنجاح. يرجى إعطاء الباسورد الجديد للمستخدم." : "Password changed successfully. Please give the new password to the user.");
      else alert(language === "ar" ? "حدث خطأ أثناء التغيير." : "An error occurred during password change.");
    } catch (e) {}
  };

  const handleSendSupport = async () => {
    if (!supportInput.trim() || !selectedSupportUser || sendingSupport) return;
    const text = supportInput.trim();
    setSupportInput("");
    setSendingSupport(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedSupportUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("whatsapp_token")}` },
        body: JSON.stringify({ text })
      });
      if (res.ok) await fetchSupportMessages(selectedSupportUser.id);
      else setSupportInput(text);
    } catch (e) {
      setSupportInput(text);
    } finally {
      setSendingSupport(false);
    }
  };

  if (loading) return <div className="p-8 text-center">{language === "ar" ? "جاري تحميل إحصائيات الإدارة..." : "Loading admin statistics..."}</div>;

  const totalUnreadSupport = supportUsers.reduce((sum, u) => sum + (u._count?.supportMessages || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header and Tabs */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-500 w-6 h-6" />
              {language === "ar" ? "لوحة تحكم الإدارة" : "Admin Dashboard"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{language === "ar" ? "نظرة عامة على نشاط المنصة وإدارة المستخدمين." : "Overview of platform activity and user management."}</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-gray-100 pb-1">
          <button 
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-2 font-semibold text-sm transition-colors relative ${activeTab === "users" ? "text-emerald-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            {language === "ar" ? "إدارة المستخدمين" : "User Management"}
            {activeTab === "users" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab("support")}
            className={`pb-3 px-2 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeTab === "support" ? "text-emerald-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            {language === "ar" ? "رسائل الدعم الفني" : "Support Messages"}
            {totalUnreadSupport > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{totalUnreadSupport}</span>
            )}
            {activeTab === "support" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-blue-50 p-4 rounded-xl"><Users className="w-8 h-8 text-blue-500" /></div>
              <div><p className="text-sm text-gray-500 font-medium">{language === "ar" ? "إجمالي المستخدمين" : "Total Users"}</p><p className="text-2xl font-bold text-gray-900">{stats.users}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl relative">
                <span className="absolute top-3 right-3 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <div><p className="text-sm text-gray-500 font-medium">{language === "ar" ? "أونلاين الآن" : "Online Now"}</p><p className="text-2xl font-bold text-gray-900">{stats.onlineUsers || 0}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-teal-50 p-4 rounded-xl"><Send className="w-8 h-8 text-teal-500" /></div>
              <div><p className="text-sm text-gray-500 font-medium">{language === "ar" ? "إجمالي الحملات" : "Total Campaigns"}</p><p className="text-2xl font-bold text-gray-900">{stats.campaigns}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-purple-50 p-4 rounded-xl"><Smartphone className="w-8 h-8 text-purple-500" /></div>
              <div><p className="text-sm text-gray-500 font-medium">{language === "ar" ? "الأجهزة المتصلة" : "Connected Devices"}</p><p className="text-2xl font-bold text-gray-900">{stats.devices}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-orange-50 p-4 rounded-xl"><Send className="w-8 h-8 text-orange-500" /></div>
              <div><p className="text-sm text-gray-500 font-medium">{language === "ar" ? "الرسائل المرسلة" : "Messages Sent"}</p><p className="text-2xl font-bold text-gray-900">{stats.messages}</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{language === "ar" ? "قائمة المستخدمين المسجلين" : "Registered Users List"}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 rounded-tr-lg">{language === "ar" ? "الاسم" : "Name"}</th>
                    <th className="p-3">{language === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                    <th className="p-3">{language === "ar" ? "الدور" : "Role"}</th>
                    <th className="p-3">{language === "ar" ? "الاتصال" : "Status"}</th>
                    <th className="p-3">{language === "ar" ? "الحالة" : "Account Status"}</th>
                    <th className="p-3">{language === "ar" ? "تاريخ التسجيل" : "Register Date"}</th>
                    <th className="p-3 rounded-tl-lg">{language === "ar" ? "الإجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900">{u.name}</td>
                      <td className="p-3 text-gray-500">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {u.role === 'admin' ? (language === "ar" ? 'مدير' : 'Admin') : (language === "ar" ? 'مستخدم' : 'User')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center w-max gap-1 ${u.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {u.isOnline ? (language === "ar" ? 'متصل الآن' : 'Online Now') : (language === "ar" ? 'غير متصل' : 'Offline')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? (language === "ar" ? 'نشط' : 'Active') : (language === "ar" ? 'موقوف' : 'Suspended')}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500" dir="ltr">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="p-3 flex items-center gap-2 justify-end">
                        <button onClick={() => handleToggleStatus(u.id, u.isActive)} className={`p-1.5 rounded-lg ${u.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={u.isActive ? (language === "ar" ? "إيقاف الحساب" : "Deactivate Account") : (language === "ar" ? "تفعيل الحساب" : "Activate Account")}>
                          {u.isActive ? <Ban className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </button>
                        <button onClick={() => handleResetPassword(u.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title={language === "ar" ? "تغيير كلمة المرور" : "Change Password"}>
                          <Key className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title={language === "ar" ? "حذف نهائي" : "Delete Permanently"}>
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex h-[600px]">
          
          {/* Left Panel: Users List */}
          <div className={`w-full md:w-1/3 border-l border-gray-100 flex flex-col ${selectedSupportUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                {language === "ar" ? "المحادثات النشطة" : "Active Chats"}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {supportUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">{language === "ar" ? "لا توجد محادثات دعم فني حالياً." : "No support chats currently."}</div>
              ) : (
                supportUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => { setSelectedSupportUser(u); fetchSupportMessages(u.id); }}
                    className={`w-full text-right p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedSupportUser?.id === u.id ? 'bg-emerald-50/50' : ''}`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      {u.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-sm text-gray-900 truncate">{u.name}</span>
                        {u._count?.supportMessages > 0 && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{u._count.supportMessages}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Chat Area */}
          <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedSupportUser ? 'hidden md:flex' : 'flex'}`}>
            {selectedSupportUser ? (
              <>
                <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg" onClick={() => setSelectedSupportUser(null)}>
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {selectedSupportUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 leading-tight">{selectedSupportUser.name}</h3>
                      <p className="text-[10px] text-emerald-600">{selectedSupportUser.isOnline ? (language === "ar" ? 'متصل الآن' : 'Online') : (language === "ar" ? 'غير متصل' : 'Offline')}</p>
                    </div>
                  </div>
                  <button onClick={() => fetchSupportMessages(selectedSupportUser.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {supportMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 max-w-[80%] ${msg.isAdmin ? "mr-auto flex-row-reverse" : "ml-auto"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.isAdmin ? "bg-emerald-600 text-white" : "bg-neutral-800 text-white"}`}>
                        {msg.isAdmin ? (language === "ar" ? "إ" : "A") : <UserIcon className="w-4 h-4" />}
                      </div>
                      <div className={`flex flex-col ${msg.isAdmin ? "items-end" : "items-start"}`}>
                        <div className={`px-4 py-2.5 shadow-sm relative text-sm ${msg.isAdmin ? "bg-emerald-100 text-emerald-900 rounded-2xl rounded-tr-sm" : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"}`}>
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

                <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={supportInput}
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendSupport()}
                      placeholder={language === "ar" ? `الرد على ${selectedSupportUser.name}...` : `Reply to ${selectedSupportUser.name}...`}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                      disabled={sendingSupport}
                    />
                    <button 
                      onClick={handleSendSupport}
                      disabled={!supportInput.trim() || sendingSupport}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-2"
                    >
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                      {language === "ar" ? "إرسال" : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
                <p className="font-bold text-gray-500">{language === "ar" ? "اختر محادثة للبدء في الرد" : "Select a chat to start responding"}</p>
                <p className="text-xs mt-1">{language === "ar" ? "طلبات الدعم الفني المباشرة من المستخدمين" : "Live technical support requests from users"}</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}