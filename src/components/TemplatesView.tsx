import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { FolderPlus, Trash2, Edit2, Check, Sparkles, HelpCircle } from "lucide-react";
import { Template } from "../types";

interface TemplatesViewProps {
  templates: Template[];
  onAddTemplate: (temp: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onApplyTemplateToComposer: (temp: Template) => void;
}

export default function TemplatesView({ 
  templates, 
  onAddTemplate, 
  onDeleteTemplate,
  onApplyTemplateToComposer
}: TemplatesViewProps) {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentType, setAttachmentType] = useState<"none" | "image" | "document">("none");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentCaption, setAttachmentCaption] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    if (isEditing) {
      onDeleteTemplate(isEditing);
    }

    const newTemp: Template = {
      id: isEditing || `temp_${Date.now()}`,
      name: name.trim(),
      message: message.trim(),
      attachmentType: attachmentType !== "none" ? attachmentType : undefined,
      attachmentUrl: attachmentType !== "none" ? attachmentUrl : undefined,
      attachmentCaption: attachmentType !== "none" ? attachmentCaption : undefined,
      createdAt: new Date().toLocaleDateString(),
    };

    onAddTemplate(newTemp);
    resetForm();
  };

  const handleEdit = (temp: Template) => {
    setIsEditing(temp.id);
    setName(temp.name);
    setMessage(temp.message);
    setAttachmentType((temp.attachmentType as any) || "none");
    setAttachmentUrl(temp.attachmentUrl || "");
    setAttachmentCaption(temp.attachmentCaption || "");
  };

  const resetForm = () => {
    setIsEditing(null);
    setName("");
    setMessage("");
    setAttachmentType("none");
    setAttachmentUrl("");
    setAttachmentCaption("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="templates-workspace">
      
      {/* List column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "قوالب الرسائل المحفوظة" : "Saved Message Templates"} ({templates.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "استخدم القوالب المعتمدة بسرعة لتسريع إنشاء الحملة" : "Quickly reuse approved templates to speed up campaign creation"}</p>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FolderPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">{language === "ar" ? "لم يتم حفظ أي قوالب بعد." : "No templates saved yet."}</p>
              <p className="text-xs mt-1">{language === "ar" ? "استخدم النموذج لإنشاء أول قالب رسالة لك!" : "Use the form on the right to create your first messaging style!"}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {templates.map(temp => (
                <div 
                  key={temp.id} 
                  className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-sm text-gray-900 block">{temp.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono bg-white px-2 py-0.5 rounded-md border border-gray-100">
                        {temp.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-sans leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto pr-1">
                      {temp.message}
                    </p>
                    
                    {temp.attachmentUrl && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100 text-[10px] text-emerald-800 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        {language === "ar" ? `الوسائط: ${temp.attachmentType} مرفق` : `Media: ${temp.attachmentType} Attached`}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => onApplyTemplateToComposer(temp)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition-all"
                    >
                      {language === "ar" ? "تطبيق القالب" : "Apply template"}
                    </button>

                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleEdit(temp)}
                        className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        title={language === "ar" ? "تعديل القالب" : "Edit Template"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteTemplate(temp.id)}
                        className="p-1.5 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title={language === "ar" ? "حذف القالب" : "Delete Template"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {isEditing ? (language === "ar" ? "تعديل قالب الرسالة" : "Edit Message Template") : (language === "ar" ? "حفظ قالب جديد" : "Save New Template")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "اسم القالب" : "Template Name"}</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === "ar" ? "مثال: عرض كود الخصم" : "e.g. Discount Code Offer"}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "محتوى الرسالة" : "Message Content"}</label>
              <textarea 
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={language === "ar" ? "مرحباً {name}، إليك كود الخصم...\nرد بـ STOP لإلغاء الاشتراك." : "Hi {name}, here is your promo code...\nReply STOP to unsubscribe."}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed font-sans"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">{language === "ar" ? "سيتم تبديل المتغيرات مثل {'{name}'} و {'{order_number}'} تلقائياً." : "Variables like {'{name}'} and {'{order_number}'} will map dynamically."}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{language === "ar" ? "نوع مرفق القالب" : "Template Attachment Type"}</label>
              <select 
                value={attachmentType} 
                onChange={(e: any) => setAttachmentType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-hidden text-gray-700 font-semibold"
              >
                <option value="none">{language === "ar" ? "بدون مرفق" : "No Attachment"}</option>
                <option value="image">{language === "ar" ? "صورة مرفقة" : "Image Attachment"}</option>
                <option value="document">{language === "ar" ? "ملف (PDF/Doc) مرفق" : "PDF / Doc Attachment"}</option>
              </select>
            </div>

            {attachmentType !== "none" && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">{language === "ar" ? "رابط المرفق" : "Attachment Resource URL"}</label>
                  <input 
                    type="url" 
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://picsum.photos/seed/promo/800/600"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-hidden text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">{language === "ar" ? "تسمية المرفق التوضيحية" : "Attachment Caption"}</label>
                  <input 
                    type="text" 
                    value={attachmentCaption}
                    onChange={(e) => setAttachmentCaption(e.target.value)}
                    placeholder={language === "ar" ? "تسمية توضيحية للمنشور الترويجي" : "Special promo flyer caption"}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-hidden text-[10px]"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isEditing ? (language === "ar" ? "حفظ التحديثات" : "Save Template Updates") : (language === "ar" ? "إنشاء قالب جديد" : "Create New Template")}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
