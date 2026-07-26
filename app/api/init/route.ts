import { NextResponse } from 'next/server';
import { initApp } from '@/lib/init';

export const dynamic = 'force-dynamic';

export async function GET() {
  initApp();
  return NextResponse.json({ success: true, message: 'Services initialized' });
}
