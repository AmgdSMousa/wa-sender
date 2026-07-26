"use client";

import { useEffect, useState } from "react";
import { 
  UserGroupIcon, 
  ArrowDownTrayIcon, 
  PaperAirplaneIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

interface Group {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: number;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wa/groups");
      const data = await res.json();
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleExtract = async (groupId: string, groupName: string) => {
    setExtractingId(groupId);
    try {
      const res = await fetch(`/api/wa/groups/${groupId}/members`);
      const data = await res.json();
      
      if (data.participants) {
        // Create CSV
        const csvRows = [
          ["Phone", "Name"].join(","),
          ...data.participants.map((p: any) => [p.phone, ""].join(","))
        ];
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${groupName}_members.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("فشل استخراج الأعضاء");
    } finally {
      setExtractingId(null);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">إدارة المجموعات</h2>
          <p className="text-gray-500 mt-1">استخرج الأرقام من مجموعاتك المشترك بها</p>
        </div>
        <button 
          onClick={fetchGroups} 
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </header>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" />
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث عن اسم المجموعة..."
          className="input pr-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card h-32 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="card text-center py-20 bg-gray-50 border-dashed">
          <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400">لا توجد مجموعات</h3>
          <p className="text-gray-400 mt-2">تأكد من أنك مشترك في مجموعات واتساب وأنك متصل حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="card group hover:border-green-200 transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-xl text-green-600">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(group.timestamp * 1000).toLocaleDateString('ar-EG')}
                </div>
              </div>
              
              <h4 className="font-bold text-gray-800 truncate mb-1" title={group.name}>{group.name}</h4>
              <p className="text-xs text-gray-500 mb-6">مجموعة واتساب</p>
               
              <button 
                onClick={() => handleExtract(group.id, group.name)}
                disabled={extractingId === group.id}
                className="btn btn-primary w-full text-xs py-2 flex items-center justify-center gap-1"
              >
                {extractingId === group.id ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-4 w-4" />
                )}
                <span>استخراج الأعضاء كملف Excel</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
