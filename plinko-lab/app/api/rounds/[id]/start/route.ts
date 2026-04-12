import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { PRNG, generatePegMap, computeOutcome } from '@/lib/fairness';

const PAYOUTS = [10, 5, 2, 1.5, 1.2, 1, 0.5, 1, 1.2, 1.5, 2, 5, 10];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clientSeed, betCents, dropColumn } = body;

    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (round.status !== 'CREATED') return NextResponse.json({ error: 'Round already started' }, { status: 400 });

    const serverSeed = round.serverSeed;
    const nonce = round.nonce;

    const combinedSeed = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
    const prng = new PRNG(combinedSeed);

    const rows = 12;
    const pegMap = generatePegMap(prng, rows);
    const pegMapHash = crypto.createHash('sha256').update(JSON.stringify(pegMap)).digest('hex');

    const { binIndex, path } = computeOutcome(pegMap, prng, dropColumn, rows);

    const payoutMultiplier = PAYOUTS[binIndex] || 0;

    await prisma.round.update({
      where: { id },
      data: {
        status: 'STARTED',
        clientSeed,
        combinedSeed,
        pegMapHash,
        rows,
        dropColumn,
        binIndex,
        payoutMultiplier,
        betCents,
        pathJson: JSON.stringify(path),
      }
    });

    return NextResponse.json({
      roundId: id,
      pegMapHash,
      rows,
      binIndex,
      path,
      payoutMultiplier
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
