import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

    const responseData = { ...round };
    if (round.status !== 'REVEALED') {
      // Don't leak serverSeed if not revealed yet
      (responseData as any).serverSeed = null;
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
