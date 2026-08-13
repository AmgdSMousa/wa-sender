export interface Recipient {
  phone: string;
  name?: string;
  email?: string;
  orderNumber?: string;
  customFields?: Record<string, string>;
  status?: "pending" | "sending" | "sent" | "failed";
  errorMessage?: string;
}

export interface Campaign {
  id: string;
  name: string;
  messageTemplate: string;
  attachmentUrl?: string;
  attachmentType?: string; // "image" | "document" | "video" | "audio"
  attachmentCaption?: string;
  recipients: Recipient[];
  status: "draft" | "queued" | "scheduled" | "sending" | "completed" | "paused";
  deviceId?: string;
  scheduledAt?: string;
  scheduledEndTime?: string;
  delayMin: number; // in seconds
  delayMax: number; // in seconds
  batchSize: number;
  batchDelay: number; // in minutes
  useAntiSpamId: boolean;
  sentCount: number;
  deliveredCount?: number;
  readCount?: number;
  failCount: number;
  createdAt: string;
  logs: string[];
}

export interface Template {
  id: string;
  name: string;
  message: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentCaption?: string;
  createdAt: string;
}

export interface ChatbotRule {
  id: string;
  trigger: string;
  triggerType: "equals" | "contains" | "starts_with";
  response: string;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "bot" | "client";
  text: string;
  timestamp: string;
}

export interface SupportSession {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "call" | "video" | "chat";
  status: "scheduled" | "completed";
}
