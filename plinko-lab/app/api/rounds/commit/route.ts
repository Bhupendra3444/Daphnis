import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { generateRandomSeed } from '@/lib/fairness';

export async function POST() {
  try {
    const serverSeed = generateRandomSeed();
    const nonce = crypto.randomBytes(8).toString('hex');
    const commitHex = crypto.createHash('sha256').update(`${serverSeed}:${nonce}`).digest('hex');

    const round = await prisma.round.create({
      data: {
        status: 'CREATED',
        serverSeed,
        nonce,
        commitHex,
      },
    });

    return NextResponse.json({
      roundId: round.id,
      commitHex: round.commitHex,
      nonce: round.nonce
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to commit round' }, { status: 500 });
  }
}
