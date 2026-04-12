import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (round.status === 'CREATED') return NextResponse.json({ error: 'Round not started yet' }, { status: 400 });

    if (round.status !== 'REVEALED') {
      await prisma.round.update({
        where: { id },
        data: {
          status: 'REVEALED',
          revealedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      serverSeed: round.serverSeed
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
