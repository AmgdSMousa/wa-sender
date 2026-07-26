import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Delete campaign contacts first due to foreign key constraints
    await prisma.campaignContact.deleteMany({
      where: { campaignId: id },
    });
    
    // Delete the campaign
    await prisma.campaign.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
