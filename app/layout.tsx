import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Sidebar from "../components/Sidebar";
import { ToastProvider } from "../components/Toast";
import "./globals.css";

const cairo = Cairo({ 
  subsets: ["arabic", "latin"],
  display: "swap",
  fallback: ["system-ui", "Tahoma", "Arial", "sans-serif"]
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "WA Sender",
  description: process.env.NEXT_PUBLIC_APP_DESC || "أفضل أداة لإرسال رسائل واتساب بالجملة وإدارة الحملات التسويقية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className} suppressHydrationWarning>
        <ToastProvider>
          <div className="flex h-screen bg-gray-50 overflow-hidden" suppressHydrationWarning>
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-8">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
