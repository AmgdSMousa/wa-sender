import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let config = await prisma.aIConfig.findFirst();
    if (!config) {
      config = await prisma.aIConfig.create({
        data: {
          isEnabled: false,
          provider: 'gemini',
          fallbackEnabled: true,
          systemPrompt: 'أنت مساعد ذكي لخدمة عملاء مؤسستنا. أجب بشكل احترافي وودي ومختصر.',
        }
      });
    }
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    let config = await prisma.aIConfig.findFirst();

    const updateData = {
      apiKey: data.apiKey ?? undefined,
      openaiApiKey: data.openaiApiKey ?? undefined,
      provider: data.provider ?? 'gemini',
      fallbackEnabled: data.fallbackEnabled ?? true,
      systemPrompt: data.systemPrompt,
      isEnabled: data.isEnabled,
    };

    if (config) {
      config = await prisma.aIConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    } else {
      config = await prisma.aIConfig.create({ data: updateData });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
