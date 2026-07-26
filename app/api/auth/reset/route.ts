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

    const existingUser = await prisma.user.findFirst();

    if (!existingUser) {
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          name: 'System Admin',
        },
      });
    } else {
      await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { password: hashedPassword },
      });
    }

    return NextResponse.json({ success: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح للمستخدم admin' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: error?.message || 'فشل تصفير كلمة المرور' }, { status: 500 });
  }
}
