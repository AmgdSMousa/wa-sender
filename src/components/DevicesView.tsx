import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Trash2, RefreshCw, Smartphone, QrCode } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function DevicesView() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [currentDevice, setCurrentDevice] = useState<any>(null);
  const { t, language } = useLanguage();

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000); // Poll for QR/Status updates
    return () => clearInterval(interval);
  }, []);

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeviceName }),
      });
      const data = await res.json();
      setCurrentDevice(data);
      setNewDeviceName("");
      setShowQRModal(true);
      fetchDevices();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("devices.delete_confirm") as string)) return;
    try {
      await fetch(`/api/devices/${id}`, { method: "DELETE" });
      fetchDevices();
    } catch (e) {}
  };

  const getStatusBadge = (status: string) => {
    if (status === "connected") return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">{t("devices.status.connected")}</span>;
    if (status === "qr_ready") return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold">{t("devices.status.qr_ready")}</span>;
    return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">{t("devices.status.disconnected")}</span>;
  };

  // Find the live device state for the modal
  const liveDevice = currentDevice ? devices.find(d => d.id === currentDevice.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="text-emerald-500 w-6 h-6" />
            {t("devices.title")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("devices.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex gap-2 mb-6 max-w-md">
          <input 
            type="text" 
            placeholder={t("devices.placeholder") as string} 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={newDeviceName}
            onChange={e => setNewDeviceName(e.target.value)}
          />
          <button 
            onClick={handleAddDevice}
            disabled={!newDeviceName.trim() || loading}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> {t("devices.add_btn")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className={`py-3 px-4 ${language === "ar" ? "rounded-tr-xl text-right" : "rounded-tl-xl text-left"}`}>{t("devices.table.name")}</th>
                <th className={`py-3 px-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t("devices.table.phone")}</th>
                <th className={`py-3 px-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t("devices.table.status")}</th>
                <th className={`py-3 px-4 ${language === "ar" ? "rounded-tl-xl text-right" : "rounded-tr-xl text-left"}`}>{t("devices.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">{language === "ar" ? "لا يوجد أي أرقام مربوطة بعد" : "No devices connected yet"}</td></tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className={`py-3 px-4 font-medium text-gray-900 ${language === "ar" ? "text-right" : "text-left"}`}>{device.name}</td>
                    <td className={`py-3 px-4 text-gray-600 ${language === "ar" ? "text-right" : "text-left"}`} dir="ltr">{device.phone ? `+${device.phone}` : "---"}</td>
                    <td className={`py-3 px-4 ${language === "ar" ? "text-right" : "text-left"}`}>{getStatusBadge(device.status)}</td>
                    <td className={`py-3 px-4 ${language === "ar" ? "text-right" : "text-left"}`}>
                      <div className={`flex items-center gap-2 ${language === "ar" ? "justify-end" : "justify-start"}`}>
                        {device.status === "qr_ready" && (
                          <button onClick={() => { setCurrentDevice(device); setShowQRModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(device.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showQRModal && liveDevice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-500" />
                {t("devices.modal.title")}: {liveDevice.name}
              </h3>
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-center">
              {liveDevice.status === "connected" ? (
                <div className="text-emerald-600 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold">{t("devices.modal.success")}</h4>
                  <p className="text-sm text-gray-600">{liveDevice.phone}</p>
                </div>
              ) : liveDevice.qr ? (
                <>
                  <div className="bg-white p-3 border-2 border-gray-100 rounded-xl shadow-sm mb-4 inline-block">
                    <QRCodeSVG value={liveDevice.qr} size={220} level="M" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">{t("devices.modal.desc")}</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-sm text-gray-500">{t("devices.modal.waiting")}</p>
                </div>
              )}
            </div>
            <div className={`p-4 border-t border-gray-100 bg-gray-50 flex ${language === "ar" ? "justify-end" : "justify-start"}`}>
              <button 
                onClick={() => setShowQRModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
              >
                {t("devices.modal.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
