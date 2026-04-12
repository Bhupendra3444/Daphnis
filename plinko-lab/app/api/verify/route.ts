import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PRNG, generatePegMap, computeOutcome } from '@/lib/fairness';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const serverSeed = url.searchParams.get('serverSeed');
  const clientSeed = url.searchParams.get('clientSeed');
  const nonce = url.searchParams.get('nonce');
  const dropColumnStr = url.searchParams.get('dropColumn');

  if (!serverSeed || !clientSeed || !nonce || !dropColumnStr) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const dropColumn = parseInt(dropColumnStr, 10);
  const commitHex = crypto.createHash('sha256').update(`${serverSeed}:${nonce}`).digest('hex');
  const combinedSeed = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
  
  const prng = new PRNG(combinedSeed);
  const rows = 12;
  const pegMap = generatePegMap(prng, rows);
  const pegMapHash = crypto.createHash('sha256').update(JSON.stringify(pegMap)).digest('hex');

  const { binIndex, path } = computeOutcome(pegMap, prng, dropColumn, rows);

  return NextResponse.json({
    commitHex,
    combinedSeed,
    pegMapHash,
    binIndex,
    path
  });
}
