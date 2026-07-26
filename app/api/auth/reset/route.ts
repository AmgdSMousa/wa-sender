import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.upsert({
      where: { username: 'admin' },
      update: { password: hashedPassword },
      create: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        name: 'System Admin',
      },
    });

    return NextResponse.json({ success: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح للمستخدم admin' });
  } catch (error: any) {
    return NextResponse.json({ error: 'فشل تصفير كلمة المرور' }, { status: 500 });
  }
}
