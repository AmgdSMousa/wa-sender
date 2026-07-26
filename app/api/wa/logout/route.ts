import { NextResponse } from 'next/server';
import { disconnectWA } from '@/lib/whatsapp/client';

export async function POST() {
  try {
    await disconnectWA();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Allow GET for easy manual testing or simple links
  try {
    await disconnectWA();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
