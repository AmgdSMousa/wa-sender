import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contacts: {
          include: { contact: true }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const data = campaign.contacts.map((c: any) => ({
      'الاسم': c.contact.name || 'بدون اسم',
      'رقم الهاتف': c.contact.phone,
      'الحالة': c.status === 'sent' ? 'تم الإرسال' : c.status === 'failed' ? 'فشل' : 'قيد الانتظار',
      'وقت الإرسال': c.sentAt ? new Date(c.sentAt).toLocaleString('ar-EG') : '-',
      'الخطأ': c.error || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Generate buffer
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="campaign-${campaignId}-report.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
