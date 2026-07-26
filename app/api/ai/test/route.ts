import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, provider = "gemini" } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "يرجى إدخال المفتاح" }, { status: 400 });
    }

    // ─── Test OpenAI ──────────────────────────────────────────────────────────
    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say hi in one word" }],
        max_tokens: 5,
      });
      if (completion.choices[0]?.message?.content) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: "لم يرد الخادم" });
    }

    // ─── Test Gemini ──────────────────────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Hi",
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("AI Test Error:", error);

    // insufficient_quota = No credits at all (billing issue)
    if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
      return NextResponse.json({
        success: true,
        warning: "⚠️ المفتاح صحيح ✅ لكن حساب OpenAI مش عنده رصيد. يرجى إضافة رصيد من: platform.openai.com/settings/billing"
      });
    }

    // 429 = Temporary quota/rate limit → key IS valid
    if (error.status === 429 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
      return NextResponse.json({
        success: true,
        warning: "⚠️ المفتاح صحيح وصالح، لكن الكوتة المجانية خلصت مؤقتاً. المفتاح سيعمل مع التطبيق."
      });
    }

    // Invalid key
    if (error.status === 401 || error.status === 403 || error.message?.includes("API_KEY_INVALID") || error.message?.includes("Incorrect API key")) {
      return NextResponse.json({ success: false, error: "❌ المفتاح غير صحيح أو لا يملك الصلاحيات." });
    }

    // 404 = Model not found
    if (error.status === 404) {
      return NextResponse.json({ success: false, error: "❌ النموذج غير متاح." });
    }

    return NextResponse.json({ success: false, error: error.message || "خطأ غير معروف" });
  }
}
