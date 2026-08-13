import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Sparkles, 
  Globe, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Smartphone, 
  Trash2, 
  Plus, 
  RefreshCw, 
  FileText, 
  Image as ImageIcon, 
  FileDown, 
  FolderPlus,
  HelpCircle,
  Eye,
  AlertTriangle,
  Shield
} from "lucide-react";
import { Campaign, Recipient, Template } from "../types";
import { useLanguage } from "../LanguageContext";

interface CampaignsViewProps {
  onSaveCampaign: (campaign: Campaign) => Promise<void>;
  templates: Template[];
  unsubscribedList: string[];
  initialMessage?: string;
  initialAttachmentType?: "none" | "image" | "document" | "video";
  initialAttachmentUrl?: string;
  initialAttachmentCaption?: string;
  initialRecipients?: Recipient[];
}

export default function CampaignsView({ 
  onSaveCampaign, 
  templates, 
  unsubscribedList,
  initialMessage,
  initialAttachmentType,
  initialAttachmentUrl,
  initialAttachmentCaption,
  initialRecipients
}: CampaignsViewProps) {
  const { language } = useLanguage();

  // Helper to load draft from localStorage safely
  const getDraft = () => {
    try {
      const saved = localStorage.getItem("whatsapp_campaign_composer_draft");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error reading campaign draft", e);
      return null;
    }
  };

  const draft = getDraft();

  const [devices, setDevices] = useState<{id: string; name: string; phone?: string}[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return draft?.deviceId ?? "";
  });

  useEffect(() => {
    fetch("/api/devices")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDevices(data.filter(d => d.status === "connected"));
      })
      .catch(console.error);
  }, []);

  // Campaign setup state
  const [campaignName, setCampaignName] = useState<string>(() => {
    return draft?.campaignName ?? "";
  });

  const [message, setMessage] = useState<string>(() => {
    if (initialMessage !== undefined) return initialMessage;
    return draft?.message ?? "Hello {name},\n\nHope you are doing great! 🌟 We wanted to share that your order {order_number} has been dispatched.\n\nThank you for choosing us!\n\nTo unsubscribe, reply STOP.";
  });

  const [recipients, setRecipients] = useState<Recipient[]>(() => {
    if (initialRecipients !== undefined) return initialRecipients;
    return draft?.recipients ?? [];
  });
  
  // Recipient input mode
  const [inputMode, setInputMode] = useState<"manual" | "csv">((() => {
    return draft?.inputMode ?? "manual";
  }));

  const [rawNumbers, setRawNumbers] = useState<string>(() => {
    if (initialRecipients !== undefined) {
      return initialRecipients.map(r => 
        `${r.phone}${r.name ? `, ${r.name}` : ""}${r.orderNumber ? `, ${r.orderNumber}` : ""}${r.email ? `, ${r.email}` : ""}`
      ).join("\n");
    }
    return draft?.rawNumbers ?? "";
  });
  
  // CSV preview & mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappedPhoneIndex, setMappedPhoneIndex] = useState<number>(0);
  const [mappedNameIndex, setMappedNameIndex] = useState<number>(1);
  const [mappedOrderIndex, setMappedOrderIndex] = useState<number>(2);
  const [mappedEmailIndex, setMappedEmailIndex] = useState<number>(-1);

  // Attachment state
  const [attachmentType, setAttachmentType] = useState<"none" | "image" | "document" | "video">((() => {
    if (initialAttachmentType !== undefined) return initialAttachmentType;
    return draft?.attachmentType ?? "none";
  }));

  const [attachmentUrl, setAttachmentUrl] = useState<string>(() => {
    if (initialAttachmentUrl !== undefined) return initialAttachmentUrl;
    return draft?.attachmentUrl ?? "";
  });

  const [attachmentCaption, setAttachmentCaption] = useState<string>(() => {
    if (initialAttachmentCaption !== undefined) return initialAttachmentCaption;
    return draft?.attachmentCaption ?? "";
  });

  const [localFile, setLocalFile] = useState<File | null>(null);

  // AI Image generator state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSize, setAiSize] = useState<"1K" | "2K" | "4K">("1K");
  const [aiAspect, setAiAspect] = useState("1:1");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Translation state
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("Spanish");

  // Anti-ban & scheduling configuration
  const [delayMin, setDelayMin] = useState<number>(() => {
    return draft?.delayMin ?? 2;
  });

  const [delayMax, setDelayMax] = useState<number>(() => {
    return draft?.delayMax ?? 5;
  });

  const [batchSize, setBatchSize] = useState<number>(() => {
    return draft?.batchSize ?? 10;
  });

  const [batchDelay, setBatchDelay] = useState<number>(() => {
    return draft?.batchDelay ?? 1;
  });

  const [useAntiSpamId, setUseAntiSpamId] = useState<boolean>(() => {
    return draft?.useAntiSpamId ?? true;
  });

  const [isScheduled, setIsScheduled] = useState<boolean>(() => {
    return draft?.isScheduled ?? false;
  });

  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    return draft?.scheduledTime ?? "";
  });

  const [scheduledEndTime, setScheduledEndTime] = useState<string>(() => {
    return draft?.scheduledEndTime ?? "";
  });

  const [sendingMode, setSendingMode] = useState<
    "individual" | 
    "photoAlbum" | 
    "massSending" | 
    "contacts" | 
    "newSending" | 
    "addToGroup" | 
    "createGroup" | 
    "forward" |
    "publishToGroups"
  >(() => {
    return draft?.sendingMode ?? "individual";
  });

  // Automatically save composer states to draft on changes
  useEffect(() => {
    const stateToSave = {
      campaignName,
      message,
      recipients,
      inputMode,
      rawNumbers,
      attachmentType,
      attachmentUrl,
      attachmentCaption,
      delayMin,
      delayMax,
      batchSize,
      batchDelay,
      useAntiSpamId,
      isScheduled,
      scheduledTime,
      scheduledEndTime,
      sendingMode,
    };
    try {
      localStorage.setItem("whatsapp_campaign_composer_draft", JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Error saving campaign draft", e);
    }
  }, [
    campaignName,
    message,
    recipients,
    inputMode,
    rawNumbers,
    attachmentType,
    attachmentUrl,
    attachmentCaption,
    delayMin,
    delayMax,
    batchSize,
    batchDelay,
    useAntiSpamId,
    isScheduled,
    scheduledTime,
    scheduledEndTime,
    sendingMode,
  ]);

  // Clear draft / reset handler
  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to discard your draft progress and reset the composer?")) {
      localStorage.removeItem("whatsapp_campaign_composer_draft");
      setCampaignName("");
      setMessage("");
      setRecipients([]);
      setInputMode("manual");
      setRawNumbers("");
      setAttachmentType("none");
      setAttachmentUrl("");
      setAttachmentCaption("");
      setDelayMin(2);
      setDelayMax(5);
      setBatchSize(10);
      setBatchDelay(1);
      setUseAntiSpamId(true);
      setIsScheduled(false);
      setScheduledTime("");
    }
  };

  // Sending Simulator State
  const [isSending, setIsSending] = useState(false);
  const [currentSendingIndex, setCurrentSendingIndex] = useState(-1);
  const [sendingLogs, setSendingLogs] = useState<string[]>([]);
  const [simulatedSentRecipients, setSimulatedSentRecipients] = useState<Recipient[]>([]);
  const [simulationDelayCountdown, setSimulationDelayCountdown] = useState<number>(0);
  const [simulationPaused, setSimulationPaused] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Format utility
  const insertText = (tag: string) => {
    setMessage(prev => prev + tag);
  };

  // Quick formatting wrap
  const wrapFormat = (symbol: string) => {
    setMessage(prev => {
      return prev + symbol + "text" + symbol;
    });
  };

  // Handle template selection
  const handleApplyTemplate = (temp: Template) => {
    setMessage(temp.message);
    if (temp.attachmentUrl) {
      setAttachmentType(temp.attachmentType as any || "image");
      setAttachmentUrl(temp.attachmentUrl);
      setAttachmentCaption(temp.attachmentCaption || "");
    } else {
      setAttachmentType("none");
      setAttachmentUrl("");
      setAttachmentCaption("");
    }
  };

  // Parse direct text input to recipients
  const handleParseManual = () => {
    const lines = rawNumbers.split("\n");
    const parsed: Recipient[] = [];
    
    lines.forEach(line => {
      const parts = line.split(",").map(p => p.trim());
      if (parts[0]) {
        // filter out non-digits except +
        const phone = parts[0];
        const name = parts[1] || "";
        const orderNumber = parts[2] || "";
        const email = parts[3] || "";
        parsed.push({ phone, name, email, orderNumber });
      }
    });
    
    setRecipients(parsed);
  };

  // Handle CSV upload and parsing
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
      
      if (lines.length > 0) {
        // Detect headers
        const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
        const rows = lines.slice(1).map(line => 
          line.split(",").map(cell => cell.trim().replace(/^["']|["']$/g, ""))
        );

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Try to auto-map indices based on header names
        const phoneIdx = headers.findIndex(h => /phone|number|mobile|tel/i.test(h));
        const nameIdx = headers.findIndex(h => /name|contact|user/i.test(h));
        const orderIdx = headers.findIndex(h => /order|id|ref/i.test(h));
        const emailIdx = headers.findIndex(h => /email|mail/i.test(h));

        if (phoneIdx !== -1) setMappedPhoneIndex(phoneIdx);
        if (nameIdx !== -1) setMappedNameIndex(nameIdx);
        if (orderIdx !== -1) setMappedOrderIndex(orderIdx);
        if (emailIdx !== -1) setMappedEmailIndex(emailIdx);
      }
    };
    reader.readAsText(file);
  };

  // Apply mapped CSV columns
  const handleApplyCsvMapping = () => {
    if (csvRows.length === 0) return;

    const parsed: Recipient[] = csvRows.map(row => {
      const phone = row[mappedPhoneIndex] || "";
      const name = mappedNameIndex !== -1 ? row[mappedNameIndex] : "";
      const orderNumber = mappedOrderIndex !== -1 ? row[mappedOrderIndex] : "";
      const email = mappedEmailIndex !== -1 ? row[mappedEmailIndex] : "";

      return { phone, name, email, orderNumber };
    }).filter(r => r.phone);

    setRecipients(parsed);
  };

  // Handle local attachment selection
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger translation via Gemini
  const handleTranslate = async () => {
    if (!message.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, targetLanguage: targetLang }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setMessage(data.translatedText);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to translate. Ensure your backend and API Key are active.");
    } finally {
      setTranslating(false);
    }
  };

  // Trigger AI Image generation
  const handleGenerateAIImage = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAI(true);
    setAiError(null);
    setGeneratedImage(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, size: aiSize, aspectRatio: aiAspect }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        setAiError(data.error || "Could not generate image. Please check your credentials.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Network error while generating image. Please ensure server is running.");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Accept generated AI image as active attachment
  const handleAcceptAIImage = () => {
    if (generatedImage) {
      setAttachmentType("image");
      setAttachmentUrl(generatedImage);
      setAttachmentCaption(attachmentCaption || aiPrompt);
      setShowAIModal(false);
    }
  };

  // Format message text for the visual simulator mockup preview
  const renderFormattedPreview = (recipient?: Recipient) => {
    let text = message;
    if (recipient) {
      text = text
        .replace(/{name}/g, recipient.name || "Customer")
        .replace(/{order_number}/g, recipient.orderNumber || "ORD-0000")
        .replace(/{email}/g, recipient.email || "support@store.com")
        .replace(/{phone}/g, recipient.phone);
    } else {
      text = text
        .replace(/{name}/g, "John Doe")
        .replace(/{order_number}/g, "ORD-1234")
        .replace(/{email}/g, "john.doe@example.com")
        .replace(/{phone}/g, "+15550199");
    }

    if (useAntiSpamId) {
      text += `\n\n[ID: #WA-${Math.floor(100000 + Math.random() * 900000)}]`;
    }

    // Escape user-controlled text before applying the small WhatsApp formatting subset.
    // This prevents message text from being interpreted as executable HTML in the preview.
    const escapeHtml = (value: string) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Convert formatting rules to html segments for preview
    return text
      .split("\n")
      .map((line, idx) => {
        let formatted = escapeHtml(line);
        // Bold: *text*
        formatted = formatted.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
        // Italic: _text_
        formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");
        // Strikethrough: ~text~
        formatted = formatted.replace(/~(.*?)~/g, "<del>$1</del>");
        return <div key={idx} dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }} />;
      });
  };

  const [isProcessing, setIsProcessing] = useState(false);

  // Simulator loop simulation
  useEffect(() => {
    let isMounted = true;
    let timer: any;

    const processRecipient = async () => {
      if (isProcessing) return;
      setIsProcessing(true);

      const currentRecipient = recipients[currentSendingIndex];
      const isExcluded = unsubscribedList.includes(currentRecipient.phone);
      
      let status: "sent" | "failed" = "sent";
      let errorMsg = "";

      if (isExcluded) {
        status = "failed";
        errorMsg = "Recipient is in the unsubscribed list.";
      } else if (currentRecipient.phone.length < 7) {
        status = "failed";
        errorMsg = "Invalid phone number length.";
      } else {
        try {
          const finalMessage = message
            .replace(/{name}/g, currentRecipient.name || "Customer")
            .replace(/{order_number}/g, currentRecipient.orderNumber || "")
            .replace(/{email}/g, currentRecipient.email || "")
            .replace(/{phone}/g, currentRecipient.phone) +
            (useAntiSpamId ? ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F'].map(c => Math.random() > 0.5 ? c : '').join('') + '\u2800' : "");

          const res = await fetch("/api/whatsapp/send", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               phone: currentRecipient.phone,
               message: finalMessage,
               type: attachmentType === "image" ? "image" : "text",
               imageUrl: attachmentType === "image" ? attachmentUrl : undefined
             })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
        } catch (err: any) {
          status = "failed";
          errorMsg = err.message || "API Error";
        }
      }

      if (!isMounted) return;

      const updatedRecipient = {
        ...currentRecipient,
        status,
        errorMessage: errorMsg
      };

      setSimulatedSentRecipients(prev => [...prev, updatedRecipient]);
      
      const timestamp = new Date().toLocaleTimeString();
      const logMsg = status === "sent" 
        ? `[${timestamp}] ✅ Successfully sent to ${currentRecipient.name || currentRecipient.phone}`
        : `[${timestamp}] ❌ Failed to send to ${currentRecipient.name || currentRecipient.phone}: ${errorMsg}`;
        
      setSendingLogs(prev => [logMsg, ...prev]);

      const nextIndex = currentSendingIndex + 1;
      if (nextIndex < recipients.length) {
        setCurrentSendingIndex(nextIndex);
        const delay = Math.random() * (delayMax - delayMin) + delayMin;
        setSimulationDelayCountdown(+delay.toFixed(1));
      } else {
        setIsSending(false);
        const campaign: Campaign = {
          id: `camp_${Date.now()}`,
          name: campaignName,
          deviceId: selectedDeviceId || undefined,
          messageTemplate: message,
          attachmentUrl: attachmentType !== "none" ? attachmentUrl : undefined,
          attachmentType: attachmentType !== "none" ? attachmentType : undefined,
          attachmentCaption: attachmentType !== "none" ? attachmentCaption : undefined,
          recipients: [...simulatedSentRecipients, updatedRecipient],
          status: "completed",
          delayMin,
          delayMax,
          batchSize,
          batchDelay,
          useAntiSpamId,
          sentCount: [...simulatedSentRecipients, updatedRecipient].filter(r => r.status === "sent").length,
          failCount: [...simulatedSentRecipients, updatedRecipient].filter(r => r.status === "failed").length,
          createdAt: new Date().toLocaleString(),
          logs: [
            `Campaign completed at ${new Date().toLocaleString()}`,
            ...sendingLogs,
            logMsg
          ]
        };
        onSaveCampaign(campaign);
        localStorage.removeItem("whatsapp_campaign_composer_draft");
      }
      setIsProcessing(false);
    };

    if (isSending && !simulationPaused && currentSendingIndex < recipients.length) {
      if (simulationDelayCountdown > 0) {
        timer = setTimeout(() => {
          setSimulationDelayCountdown(prev => +(prev - 0.1).toFixed(1));
        }, 100);
      } else {
        processRecipient();
      }
    }
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isSending, simulationPaused, currentSendingIndex, simulationDelayCountdown, isProcessing]);

  // Start sending simulation
  const handleStartCampaign = async () => {
    if (recipients.length === 0) {
      alert("Please add at least one recipient first.");
      return;
    }
    
    // Check if scheduled instead of instant
    if (isScheduled && scheduledTime) {
      if (scheduledEndTime && new Date(scheduledEndTime) <= new Date(scheduledTime)) {
        alert("End time must be after start time.");
        return;
      }
      const scheduledCampaign: Campaign = {
        id: `camp_${Date.now()}`,
        name: campaignName,
        deviceId: selectedDeviceId || undefined,
        messageTemplate: message,
        attachmentUrl: attachmentType !== "none" ? attachmentUrl : undefined,
        attachmentType: attachmentType !== "none" ? attachmentType : undefined,
        attachmentCaption: attachmentType !== "none" ? attachmentCaption : undefined,
        recipients: recipients.map(r => ({ ...r, status: "pending" })),
        status: "scheduled",
        scheduledAt: scheduledTime,
        scheduledEndTime: scheduledEndTime || undefined,
        delayMin,
        delayMax,
        batchSize,
        batchDelay,
        useAntiSpamId,
        sentCount: 0,
        failCount: 0,
        createdAt: new Date().toLocaleString(),
        logs: [`Campaign scheduled for ${scheduledTime}${scheduledEndTime ? ` to ${scheduledEndTime}` : ''}`]
      };
      try {
        await onSaveCampaign(scheduledCampaign);
      } catch (error: any) {
        alert(error.message || "Unable to schedule campaign.");
        return;
      }
      localStorage.removeItem("whatsapp_campaign_composer_draft");
      alert(`Campaign scheduled successfully for ${new Date(scheduledTime).toLocaleString()}!`);
      return;
    }

    const queuedCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: campaignName,
      deviceId: selectedDeviceId || undefined,
      messageTemplate: message,
      attachmentUrl: attachmentType !== "none" ? attachmentUrl : undefined,
      attachmentType: attachmentType !== "none" ? attachmentType : undefined,
      attachmentCaption: attachmentType !== "none" ? attachmentCaption : undefined,
      recipients: recipients.map(recipient => ({ ...recipient, status: "pending" })),
      status: "queued",
      delayMin,
      delayMax,
      batchSize,
      batchDelay,
      useAntiSpamId,
      sentCount: 0,
      failCount: 0,
      createdAt: new Date().toLocaleString(),
      logs: [`Campaign queued at ${new Date().toLocaleString()}`],
    };
    try {
      await onSaveCampaign(queuedCampaign);
      localStorage.removeItem("whatsapp_campaign_composer_draft");
    } catch (error: any) {
      alert(error.message || "Unable to queue campaign.");
    }
  };

  // Force stop campaign simulation
  const handleStopCampaign = () => {
    setIsSending(false);
    // Save as draft or partial completed
    const partialCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: campaignName,
      deviceId: selectedDeviceId || undefined,
      messageTemplate: message,
      attachmentUrl: attachmentType !== "none" ? attachmentUrl : undefined,
      attachmentType: attachmentType !== "none" ? attachmentType : undefined,
      attachmentCaption: attachmentType !== "none" ? attachmentCaption : undefined,
      recipients: [
        ...simulatedSentRecipients,
        ...recipients.slice(simulatedSentRecipients.length).map(r => ({ ...r, status: "pending" as const }))
      ],
      status: "paused",
      delayMin,
      delayMax,
      batchSize,
      batchDelay,
      useAntiSpamId,
      sentCount: simulatedSentRecipients.filter(r => r.status === "sent").length,
      failCount: simulatedSentRecipients.filter(r => r.status === "failed").length,
      createdAt: new Date().toLocaleString(),
      logs: [`Campaign paused manually by user.`, ...sendingLogs]
    };
    onSaveCampaign(partialCampaign);
    localStorage.removeItem("whatsapp_campaign_composer_draft");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="campaigns-workspace">
      {/* Configuration Column - 8 cols */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Campaign Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs" id="camp-info">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "أساسيات الحملة" : "Campaign Basics"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium shadow-3xs">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                {language === "ar" ? "حفظ تلقائي للمسودة" : "Draft Auto-saved"}
              </span>
              <button 
                onClick={handleClearDraft}
                className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors cursor-pointer border border-slate-100 bg-slate-50/50 hover:bg-red-50 hover:border-red-100 px-2.5 py-0.5 rounded-lg"
                title={language === "ar" ? "إعادة تعيين جميع الحقول للافتراضي" : "Reset all fields to defaults"}
              >
                {language === "ar" ? "مسح المسودة" : "Clear Draft"}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "طريقة واستراتيجية الإرسال" : "Sending Strategy / Mode"}</label>
              <select
                value={sendingMode}
                onChange={(e) => setSendingMode(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm mb-4"
              >
                <option value="individual">{language === "ar" ? "إرسال فردي (10 رسائل/دقيقة)" : "Individual Sending (10 msgs/min)"}</option>
                <option value="photoAlbum">{language === "ar" ? "إرسال ألبوم صور (حتى 10 صور/رسالة)" : "Photo Album Sending (Up to 10 photos/msg)"}</option>
                <option value="massSending">{language === "ar" ? "إرسال جماعي (إنشاء مجموعة، إرسال، حذف)" : "Mass Brand Sending (Group Create, Send, Delete)"}</option>
                <option value="contacts">{language === "ar" ? "إرسال لجهات الاتصال (20 رسالة/دقيقة)" : "Send to Contacts (20 msgs/min)"}</option>
                <option value="newSending">{language === "ar" ? "محرك إرسال جديد (35 رسالة/دقيقة)" : "New Sending Engine (35 msgs/min)"}</option>
                <option value="addToGroup">{language === "ar" ? "إضافة العملاء للمجموعات (250 عميل/3 دقائق)" : "Add Clients to Groups (250 clients/3 min)"}</option>
                <option value="forward">{language === "ar" ? "إرسال عبر إعادة توجيه الرسائل" : "Send by Forwarding Messages"}</option>
                <option value="publishToGroups">{language === "ar" ? "النشر في مجموعات واتساب" : "Publish to WhatsApp Groups"}</option>
              </select>
            </div>
            
            {sendingMode === "publishToGroups" && (
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-700">{language === "ar" ? "تبديل وتدوير الحسابات المتعددة" : "Multi-Account Rotating & Switching"}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{language === "ar" ? "النشر في المجموعات بالتناوب تلقائيًا بين حسابات إرسال متعددة متصلة لتجنب الحظر." : "Publish to groups by automatically rotating through multiple connected sender accounts to avoid limits."}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "رقم الإرسال (الجهاز)" : "Sending Device"}</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm mb-4"
              >
                <option value="">{language === "ar" ? "تحديد تلقائي (عشوائي من المتصلين)" : "Auto-Select (Random from connected)"}</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} {d.phone ? `(${d.phone})` : ""}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "اسم الحملة" : "Campaign Name"}</label>
              <input 
                type="text" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={language === "ar" ? "مثال: حملة الجمعة السوداء" : "e.g. Black Friday Launch"}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Recipients list input */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs" id="camp-recipients">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center justify-end gap-2 text-right">
                {language === "ar" ? `الأرقام المستهدفة (${recipients.length})` : `Target Recipients (${recipients.length})`}
                <Upload className="w-5 h-5 text-emerald-600" />
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "حدد قائمة جمهور الواتساب الخاص بك" : "Define your WhatsApp audience list"}</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg self-start">
              <button 
                onClick={() => setInputMode("manual")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${inputMode === "manual" ? "bg-white shadow-xs text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                {language === "ar" ? "إدخال يدوي" : "Manual Input"}
              </button>
              <button 
                onClick={() => setInputMode("csv")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${inputMode === "csv" ? "bg-white shadow-xs text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                {language === "ar" ? "رفع ملف CSV / جداول" : "CSV Upload / Sheets"}
              </button>
            </div>
          </div>

          {inputMode === "manual" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {language === "ar" ? "الصيغة: رقم الهاتف، الاسم، رقم الطلب، البريد الإلكتروني (كل سطر منفصل)" : "Format: Phone, Name, Order Number, Email (One per line)"}
                </label>
                <textarea 
                  rows={4}
                  value={rawNumbers}
                  onChange={(e) => setRawNumbers(e.target.value)}
                  placeholder={language === "ar" ? "مثال:\n+201001234567, محمد أحمد, ORD-123, email@example.com" : "e.g.\n+15550199, John Doe, ORD-123, email@example.com"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-mono"
                />
              </div>
              <button 
                onClick={handleParseManual}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-all"
              >
                {language === "ar" ? "تحليل ومزامنة الأرقام" : "Parse & Sync Numbers"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-xl p-6 text-center transition-all">
                <input 
                  type="file" 
                  ref={csvInputRef}
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden" 
                />
                <div className="flex flex-col items-center cursor-pointer" onClick={() => csvInputRef.current?.click()}>
                  <FileText className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">{language === "ar" ? "انقر لرفع ملف CSV" : "Click to upload CSV"}</span>
                  <span className="text-xs text-gray-500 mt-1">{language === "ar" ? "مُصدَّر من جداول جوجل أو إكسيل" : "Exported from Google Sheets or Excel"}</span>
                </div>
              </div>

              {csvHeaders.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">{language === "ar" ? "معاينة ربط حقول CSV" : "CSV Field Mapping Preview"}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{language === "ar" ? "رقم الهاتف *" : "Phone Number *"}</label>
                      <select 
                        value={mappedPhoneIndex} 
                        onChange={(e) => setMappedPhoneIndex(parseInt(e.target.value))}
                        className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden"
                      >
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{language === "ar" ? "اسم العميل" : "Customer Name"}</label>
                      <select 
                        value={mappedNameIndex} 
                        onChange={(e) => setMappedNameIndex(parseInt(e.target.value))}
                        className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden"
                      >
                        <option value={-1}>{language === "ar" ? "[تخطي الحقل]" : "[Skip Field]"}</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{language === "ar" ? "رقم الطلب" : "Order Number"}</label>
                      <select 
                        value={mappedOrderIndex} 
                        onChange={(e) => setMappedOrderIndex(parseInt(e.target.value))}
                        className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden"
                      >
                        <option value={-1}>{language === "ar" ? "[تخطي الحقل]" : "[Skip Field]"}</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{language === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                      <select 
                        value={mappedEmailIndex} 
                        onChange={(e) => setMappedEmailIndex(parseInt(e.target.value))}
                        className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden"
                      >
                        <option value={-1}>{language === "ar" ? "[تخطي الحقل]" : "[Skip Field]"}</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handleApplyCsvMapping}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      {language === "ar" ? "تطبيق ومعاينة القائمة" : "Apply & Preview List"}
                    </button>
                    <button 
                      onClick={() => { setCsvHeaders([]); setCsvRows([]); }}
                      className="px-3.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-medium rounded-lg transition-all"
                    >
                      {language === "ar" ? "مسح" : "Clear"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Recipients List */}
          {recipients.length > 0 && (
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                      <th className="p-3 font-medium">{language === "ar" ? "الهاتف" : "Phone"}</th>
                      <th className="p-3 font-medium">{language === "ar" ? "الاسم" : "Name"}</th>
                      <th className="p-3 font-medium">{language === "ar" ? "رقم الطلب" : "Order ID"}</th>
                      <th className="p-3 font-medium">{language === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                      <th className="p-3 text-right">{language === "ar" ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recipients.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-medium text-gray-900">{rec.phone}</td>
                        <td className="p-3 text-gray-700">{rec.name || <span className="text-gray-300">-</span>}</td>
                        <td className="p-3 text-gray-700 font-mono">{rec.orderNumber || <span className="text-gray-300">-</span>}</td>
                        <td className="p-3 text-gray-500">{rec.email || <span className="text-gray-300">-</span>}</td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => setRecipients(prev => prev.filter((_, i) => i !== idx))}
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
            </div>
          )}
        </div>

        {/* Message Composer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="camp-composer">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center justify-end gap-2">
                {language === "ar" ? "محتوى الرسالة" : "Message Content"}
                <FileText className="w-5 h-5 text-emerald-600" />
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "استخدم أدوات التنسيق والمتغيرات" : "Use formatting helpers and variables"}</p>
            </div>
            
            {/* Quick Apply Templates Dropdown */}
            {templates.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{language === "ar" ? "تطبيق:" : "Apply:"}</span>
                <select 
                  onChange={(e) => {
                    const found = templates.find(t => t.id === e.target.value);
                    if (found) handleApplyTemplate(found);
                  }}
                  className="bg-gray-50 border border-gray-200 text-xs rounded-lg p-1 px-2.5 focus:outline-hidden font-medium text-gray-700"
                  defaultValue=""
                >
                  <option value="" disabled>{language === "ar" ? "-- اختر قالب محفوظ --" : "-- Select saved template --"}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Merge Tags & Formatting Shortcuts */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
            <button onClick={() => insertText("{name}")} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-xs">
              + {'{name}'}
            </button>
            <button onClick={() => insertText("{order_number}")} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-xs">
              + {'{order_number}'}
            </button>
            <button onClick={() => insertText("{email}")} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-xs">
              + {'{email}'}
            </button>
            <button onClick={() => insertText("{phone}")} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-all shadow-xs">
              + {'{phone}'}
            </button>
            <div className="h-5 w-[1px] bg-gray-200 mx-1 self-center" />
            <button onClick={() => wrapFormat("*")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Bold">
              B
            </button>
            <button onClick={() => wrapFormat("_")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs italic text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Italic">
              I
            </button>
            <button onClick={() => wrapFormat("~")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs line-through text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Strikethrough">
              S
            </button>
            <button onClick={() => insertText("💡 ")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Emoji Example">
              💡
            </button>
            <button onClick={() => insertText("🔥 ")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Emoji Example">
              🔥
            </button>
            <button onClick={() => insertText("✅ ")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-all shadow-xs" title="Emoji Example">
              ✅
            </button>
          </div>

          {/* Text Area */}
          <textarea 
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm leading-relaxed"
            placeholder={language === "ar" ? "اكتب قالب رسالة واتساب هنا..." : "Type your WhatsApp message template here..."}
          />

          {/* Translation Widget */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">{language === "ar" ? "المترجم الذكي والوصول متعدد اللغات" : "Smart Translator & Multilingual Reach"}</span>
                <span className="text-[10px] text-emerald-700">{language === "ar" ? "ترجم الرسائل الجماعية مع الاحتفاظ بالمتغيرات سليمة" : "Translate bulk message while keeping merge variables intact"}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-white border border-gray-200 text-xs rounded-lg p-1.5 focus:outline-hidden text-gray-700 font-medium shadow-xs"
              >
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
                <option value="Arabic">Arabic</option>
                <option value="Japanese">Japanese</option>
                <option value="Portuguese">Portuguese</option>
              </select>
              <button 
                onClick={handleTranslate}
                disabled={translating}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
              >
                {translating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {language === "ar" ? "ترجمة" : "Translate"}
              </button>
            </div>
          </div>
        </div>

        {/* Media Attachments Section with AI Studio Image Generator */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="camp-attachment">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "المرفقات والوسائط المتعددة" : "File Attachments & Smart Content Generator"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "قم بإرفاق صور مخصصة، مستندات، مقاطع فيديو، أو صمم مرئيات باستخدام الذكاء الاصطناعي" : "Attach custom images, docs, videos, or design visuals using AI"}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: "none", label: language === "ar" ? "بدون مرفقات" : "No Attachment" },
              { id: "image", label: language === "ar" ? "صورة / صورة منتج" : "Image / Product Photo" },
              { id: "document", label: language === "ar" ? "مستند (PDF)" : "Document (PDF)" },
              { id: "video", label: language === "ar" ? "فيديو (MP4)" : "Video (MP4)" }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setAttachmentType(type.id as any)}
                className={`p-3 text-center rounded-xl border text-xs font-medium transition-all ${attachmentType === type.id ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {attachmentType !== "none" && (
            <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Manual File Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "ar" ? "رفع ملف محلي" : "Upload Local File"}</label>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalFileChange}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 bg-white border border-gray-200 hover:border-emerald-500 rounded-xl text-xs font-semibold text-gray-700 transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    {language === "ar" ? "اختر ملف من الجهاز" : "Choose File From Device"}
                  </button>
                </div>

                {/* AI Generator Trigger */}
                {attachmentType === "image" && (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "ar" ? "المصمم المرئي الذكي" : "Smart Visual Designer"}</label>
                    <button 
                      onClick={() => setShowAIModal(true)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      {language === "ar" ? "إنشاء مرفق مرئي" : "Generate Visual Attachment"}
                    </button>
                  </div>
                )}
              </div>

              {attachmentUrl && (
                <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                    {attachmentType === "image" ? (
                      <img src={attachmentUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <FileText className="w-8 h-8 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700 block truncate">{language === "ar" ? "الملف النشط المحدد" : "Active File Selected"}</span>
                    <span className="text-[10px] text-gray-400 block truncate">{attachmentUrl.startsWith("data:") ? (language === "ar" ? "مرفق Base64" : "Base64 Asset Attachment") : (language === "ar" ? "رابط مرفوع" : "Uploaded URL Reference")}</span>
                    <button onClick={() => { setAttachmentUrl(""); setLocalFile(null); }} className="text-[10px] text-red-500 font-semibold mt-1 hover:underline">
                      {language === "ar" ? "إزالة المرفق" : "Remove attachment"}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{language === "ar" ? "وصف المرفق" : "Attachment Caption"}</label>
                <input 
                  type="text"
                  value={attachmentCaption}
                  onChange={(e) => setAttachmentCaption(e.target.value)}
                  placeholder={language === "ar" ? "مثال: تحقق من عرضنا الخاص لعطلة نهاية الأسبوع!" : "e.g. Check out our special weekend offer!"}
                  className="w-full px-3.5 py-2 bg-white rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                />
              </div>

            </div>
          )}

        </div>

        {/* Anti-Ban Protection Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="camp-antiban">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-600" />
              {language === "ar" ? "إعدادات الحماية من الحظر (Anti-Ban)" : "Smart Anti-Ban & Anti-Spam Safeguards"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{language === "ar" ? "قم بتكوين إجراءات وقائية متقدمة لتأمين حساب الواتساب الخاص بك من القيود" : "Configure advanced safeguards to secure your WhatsApp account from restrictions"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Delay Settings */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-700 block">{language === "ar" ? "تأخير عشوائي بين الرسائل" : "Random Delay Between Messages"}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={delayMin} 
                  onChange={(e) => setDelayMin(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-white border border-gray-200 rounded-lg p-2 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-gray-400">{language === "ar" ? "إلى" : "to"}</span>
                <input 
                  type="number" 
                  value={delayMax} 
                  onChange={(e) => setDelayMax(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-20 bg-white border border-gray-200 rounded-lg p-2 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-gray-500">{language === "ar" ? "ثانية تأخير" : "seconds delay"}</span>
              </div>
              <span className="text-[10px] text-gray-400 block leading-tight">{language === "ar" ? "يحاكي فترات سرعة الكتابة البشرية الطبيعية بشكل ديناميكي." : "Mimics natural human typing speed gaps dynamically."}</span>
            </div>

            {/* Batch Delay */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-700 block">{language === "ar" ? "حدود الدفعات" : "Batching Limits"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{language === "ar" ? "إرسال" : "Send"}</span>
                <input 
                  type="number" 
                  value={batchSize} 
                  onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white border border-gray-200 rounded-lg p-2 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-gray-500">{language === "ar" ? "ثم توقف لمدة" : "then pause for"}</span>
                <input 
                  type="number" 
                  value={batchDelay} 
                  onChange={(e) => setBatchDelay(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white border border-gray-200 rounded-lg p-2 text-center text-xs focus:outline-hidden"
                />
                <span className="text-xs text-gray-500">{language === "ar" ? "دقيقة" : "min"}</span>
              </div>
              <span className="text-[10px] text-gray-400 block leading-tight">{language === "ar" ? "يوزع أنماط الإرسال عبر فترات زمنية أكبر وأكثر أمانًا." : "Spreads sending patterns across larger, safer time-blocks."}</span>
            </div>

          </div>

          {/* Delay Management Detailed Guide */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              {language === "ar" ? "دليل إدارة التأخير وحماية الحساب" : "Delay Management Guide"}
            </h3>
            <ul className="text-[11px] text-emerald-700 space-y-1.5 list-disc pl-4">
              <li><strong>{language === "ar" ? "تسخين الحساب:" : "Warm Up:"}</strong> {language === "ar" ? "إذا كان حسابك جديدًا، ابدأ بتأخير من 5 إلى 10 ثوانٍ وأرسل لقوائم صغيرة أولاً." : "If your account is new, start with 5-10 seconds delay and send to small lists first."}</li>
              <li><strong>{language === "ar" ? "السرعات الآمنة:" : "Safe Speeds:"}</strong> {language === "ar" ? "للحسابات القديمة، ضبط تأخير عشوائي من" : "For mature accounts, setting a Random Delay of"} <strong>{language === "ar" ? "3 إلى 8 ثوانٍ" : "3 to 8 seconds"}</strong> {language === "ar" ? "هو المعيار." : "is standard."}</li>
              <li><strong>{language === "ar" ? "الكميات الكبيرة:" : "High Volume:"}</strong> {language === "ar" ? "للحملات التي تتجاوز 500 مستلم، قم بتكوين حدود الدفعات للتوقف 5 دقائق كل 50 رسالة." : "For campaigns over 500 recipients, configure Batching Limits to pause 5 minutes every 50 messages."}</li>
              <li><strong>{language === "ar" ? "تنوع الرسائل:" : "Message Variations:"}</strong> {language === "ar" ? "استخدم معرف الحماية من الحظر والمتغيرات حتى لا تتطابق رسالتان." : "Use the Anti-Spam Identifier and Spintax/Variables so no two messages are identical."}</li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-700">{language === "ar" ? "إضافة معرف فريد للحماية من الحظر" : "Append Unique Anti-Spam Identifier ID"}</span>
              <span className="text-[10px] text-gray-400">{language === "ar" ? "يضيف علامة تم إنشاؤها تلقائيًا (#WA-123456) لكل رسالة صادرة لتجاوز فلاتر الكشف." : "Adds an auto-generated tag (`#WA-123456`) to each outgoing text to bypass content templates detection filters."}</span>
            </div>
            <input 
              type="checkbox"
              checked={useAntiSpamId}
              onChange={(e) => setUseAntiSpamId(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded-sm cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 mt-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-700">{language === "ar" ? "نظام الأمان: حقن كلمات عشوائية" : "Security System: Random Words Injection"}</span>
              <span className="text-[10px] text-gray-400">{language === "ar" ? "يحمي الحسابات عن طريق حقن كلمات عشوائية متعددة بشكل غير مرئي في نهاية الرسالة للتهرب من خوارزميات الكشف." : "Protects accounts by injecting multiple random keywords invisibly at the end of the message to evade duplicate detection algorithms."}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

        </div>

        {/* Scheduling and Sending Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4" id="camp-trigger">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{language === "ar" ? "جدولة هذه الحملة" : "Schedule This Campaign"}</span>
              <span className="text-xs text-gray-500">{language === "ar" ? "تعيين فترات إرسال مستقبلية تلقائية بدلاً من الإرسال الفوري" : "Set automatic future sending intervals instead of instant delivery"}</span>
            </div>
            <input 
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
          </div>

          {isScheduled && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-900">{language === "ar" ? "فترة التوصيل" : "Delivery Window"}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{language === "ar" ? "حدد نطاق تاريخ/وقت لتوزيع إرسال الرسائل بشكل متساوٍ تلقائيًا عبر الفترة، لتقليل مخاطر الحظر." : "Select a date/time range to automatically spread message dispatch evenly across the window, minimizing ban risks."}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{language === "ar" ? "وقت البدء" : "Start Time"}</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{language === "ar" ? "وقت الانتهاء" : "End Time"}</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-xs rounded-lg p-2 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {scheduledTime && scheduledEndTime && new Date(scheduledEndTime) > new Date(scheduledTime) && recipients.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-xs text-blue-800">
                  <div className="flex flex-col">
                    <span className="font-semibold text-blue-900">{language === "ar" ? "التوزيع التلقائي المحسوب" : "Auto-calculated Spread"}</span>
                    <span>{recipients.length} {language === "ar" ? "رسائل موزعة بالتساوي" : "messages evenly distributed"}</span>
                  </div>
                  <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-900">
                    ~{(((new Date(scheduledEndTime).getTime() - new Date(scheduledTime).getTime()) / 1000) / recipients.length).toFixed(1)} {language === "ar" ? "ث/رسالة" : "s per message"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleStartCampaign}
              disabled={isSending}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isScheduled ? (language === "ar" ? "تأكيد جدولة الحملة" : "Confirm Campaign Schedule") : (language === "ar" ? "إطلاق الحملة الجماعية الآن" : "Fire Bulk Campaign Now")}
            </button>
          </div>
        </div>

      </div>

      {/* Right Column - Live Preview Mockup & Simulation logs - 4 cols */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Mobile Phone WhatsApp Live Preview Mockup */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col items-center" id="live-phone-preview">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 self-start w-full">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            {language === "ar" ? "معاينة عميل الواتساب" : "WhatsApp Client Preview"}
          </h2>
          
          {/* Outer phone shell */}
          <div className="w-full max-w-[280px] aspect-[9/18.5] bg-neutral-900 rounded-[40px] border-[6px] border-neutral-800 p-2.5 shadow-xl relative overflow-hidden flex flex-col">
            
            {/* Phone speaker/camera notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-neutral-900 rounded-b-xl z-20 flex items-center justify-center">
              <div className="w-8 h-1 bg-neutral-800 rounded-full mb-1" />
            </div>

            {/* Simulated app screen header */}
            <div className="bg-[#005e54] text-white text-[10px] p-2 pt-5 rounded-t-2xl flex items-center justify-between z-10">
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-[8px]">
                  C
                </div>
                <div>
                  <span className="font-semibold block truncate w-24">
                    {recipients[0]?.name || (language === "ar" ? "معاينة العميل" : "Customer Preview")}
                  </span>
                  <span className="text-[7px] text-emerald-100 block">{language === "ar" ? "متصل" : "online"}</span>
                </div>
              </div>
            </div>

            {/* Chat viewport background */}
            <div className="flex-1 bg-[#efeae2] p-2 overflow-y-auto space-y-3 relative flex flex-col justify-end text-[10px]">
              {/* Optional attachment box inside bubble */}
              <div className="bg-white rounded-lg p-1.5 shadow-xs max-w-[90%] self-end border border-gray-100">
                {attachmentType !== "none" && attachmentUrl && (
                  <div className="rounded-md bg-gray-100 overflow-hidden mb-1 flex items-center justify-center aspect-video">
                    {attachmentType === "image" ? (
                      <img src={attachmentUrl} alt="Visual attached" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="p-3 text-center">
                        <FileText className="w-6 h-6 mx-auto text-emerald-600" />
                        <span className="text-[7px] block text-gray-500 mt-1">{language === "ar" ? "مرفق PDF" : "PDF Attachment"}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {attachmentType !== "none" && attachmentCaption && (
                  <div className="text-[8px] text-gray-500 italic border-b border-gray-100 pb-1 mb-1 font-medium">
                    {attachmentCaption}
                  </div>
                )}

                <div className="text-gray-800 font-sans leading-relaxed text-[9px] break-words">
                  {renderFormattedPreview(recipients[0])}
                </div>
                <span className="text-[7px] text-gray-400 text-right block mt-1">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                </span>
              </div>
            </div>
            
          </div>
        </div>

        {/* Live Simulator Logs & Status when firing */}
        {isSending && (
          <div className="bg-neutral-900 text-neutral-200 rounded-2xl p-5 shadow-lg space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {language === "ar" ? "الحملة نشطة" : "CAMPAIGN ACTIVE"}
              </span>
              <button 
                onClick={handleStopCampaign}
                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold rounded-md border border-red-500/30 transition-all cursor-pointer"
              >
                {language === "ar" ? "إيقاف مؤقت" : "PAUSE"}
              </button>
            </div>

            <div className="space-y-1 bg-black/40 rounded-xl p-3 border border-neutral-800 text-[10px]">
              <div className="flex justify-between text-neutral-400">
                <span>{language === "ar" ? "التقدم:" : "Progress:"}</span>
                <span className="font-bold text-white">{simulatedSentRecipients.length} / {recipients.length}</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${(simulatedSentRecipients.length / recipients.length) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-neutral-400 mt-2">
                <span>{language === "ar" ? "تأخير آمن:" : "Safe Delay:"}</span>
                <span className="text-yellow-400 font-bold">{simulationDelayCountdown} {language === "ar" ? "ث متبقية" : "s remaining"}</span>
              </div>
            </div>

            {/* Small scroll log list */}
            <div>
              <span className="text-[10px] text-neutral-500 block mb-1">{language === "ar" ? "سجلات العملية" : "TERMINAL TELEMETRY"}</span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin bg-black/60 p-2.5 rounded-xl border border-neutral-800 text-[9px] leading-tight">
                {sendingLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("Successfully") ? "text-emerald-400" : log.includes("Failed") ? "text-red-400" : "text-neutral-400"}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* AI Visual Designer Modal for Size affordances 1K, 2K, 4K */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="ai-modal">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold text-base">{language === "ar" ? "المصمم الرسومي الذكي" : "Smart Graphic Designer"}</h3>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-white hover:text-gray-200 font-semibold text-lg">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{language === "ar" ? "صف الصورة أو البانر الذي تريد إنشاءه" : "Describe the image or banner you want to generate"}</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={language === "ar" ? "مثال: تصميم عصري بسيط مع فنجان قهوة على طاولة خشبية، خلفية باستيل فاتحة، بانر تجاري عالي الجودة" : "e.g. Modern minimalist design with a coffee cup on wood table, light pastel background, cozy professional tone, high quality commercial banner"}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{language === "ar" ? "حجم الصورة" : "Affordance Image Size"}</label>
                  <select
                    value={aiSize}
                    onChange={(e: any) => setAiSize(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-hidden"
                  >
                    <option value="1K">{language === "ar" ? "جودة قياسية 1K (1024x1024)" : "1K Standard Quality (1024x1024)"}</option>
                    <option value="2K">{language === "ar" ? "جودة احترافية 2K (2048x2048)" : "2K Professional Quality (2048x2048)"}</option>
                    <option value="4K">{language === "ar" ? "جودة سينمائية فائقة 4K (4096x4096)" : "4K Cinematic Ultra-HD (4096x4096)"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{language === "ar" ? "نسبة العرض إلى الارتفاع" : "Aspect Ratio"}</label>
                  <select
                    value={aiAspect}
                    onChange={(e) => setAiAspect(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-hidden"
                  >
                    <option value="1:1">{language === "ar" ? "1:1 مربع (منشورات)" : "1:1 Square (Posts)"}</option>
                    <option value="16:9">{language === "ar" ? "16:9 أفقي (بانرات)" : "16:9 Landscape (Banners)"}</option>
                    <option value="9:16">{language === "ar" ? "9:16 عمودي (حالات واتساب)" : "9:16 Portrait (WA Status / Story)"}</option>
                    <option value="4:3">{language === "ar" ? "4:3 شبكة سطح المكتب" : "4:3 Desktop Grid"}</option>
                  </select>
                </div>
              </div>

              {aiError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {generatedImage && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-700 block">{language === "ar" ? "معاينة المخرجات الذكية:" : "Smart Output Preview:"}</span>
                  <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 aspect-video max-h-48 flex items-center justify-center">
                    <img src={generatedImage} alt="Generated visual output" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAIImage}
                  disabled={generatingAI || !aiPrompt.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  {generatingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {language === "ar" ? `تركيب المرئيات (${aiSize})...` : `Synthesizing Visuals (${aiSize})...`}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {language === "ar" ? "إنشاء الأصل المرئي" : "Create Visual Asset"}
                    </>
                  )}
                </button>
                
                {generatedImage && (
                  <button
                    onClick={handleAcceptAIImage}
                    className="px-5 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold rounded-xl border border-emerald-200 transition-all"
                  >
                    {language === "ar" ? "إرفاق الصورة" : "Attach Image"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
