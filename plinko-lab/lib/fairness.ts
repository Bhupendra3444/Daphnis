import crypto from 'crypto';

export class PRNG {
  private state: number;

  constructor(seedHex: string) {
    this.state = parseInt(seedHex.substring(0, 8), 16);
  }

  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    this.state >>>= 0;
    return this.state / 4294967296;
  }
}

export function generateCombinations(serverSeed: string, clientSeed: string, nonce: string) {
  const commitHex = crypto.createHash('sha256').update(`${serverSeed}:${nonce}`).digest('hex');
  const combinedSeed = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
  return { commitHex, combinedSeed };
}

export function generatePegMap(prng: PRNG, rows: number) {
  const pegMap: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowPegs = [];
    for (let p = 0; p <= r; p++) {
      const rand = prng.next();
      let leftBias = 0.5 + (rand - 0.5) * 0.2;
      // round to 6 decimals
      leftBias = Math.round(leftBias * 1000000) / 1000000;
      rowPegs.push(leftBias);
    }
    pegMap.push(rowPegs);
  }
  return pegMap;
}

export function computeOutcome(pegMap: number[][], prng: PRNG, dropColumn: number, rows: number) {
  let pos = 0;
  const path: number[] = [];

  for (let r = 0; r < rows; r++) {
    const pegIndex = Math.min(pos, r);
    const leftBias = pegMap[r][pegIndex];
    
    // Drop column influence
    const adj = (dropColumn - Math.floor(rows / 2)) * 0.01;
    let biasPrime = leftBias + adj;
    biasPrime = Math.max(0, Math.min(1, biasPrime)); // clamp
    
    const rnd = prng.next();
    const isLeft = rnd < biasPrime;
    if (isLeft) {
      path.push(-1); // -1 for left
    } else {
      path.push(1); // 1 for right
      pos += 1;
    }
  }

  return { binIndex: pos, path };
}

export function generateRandomSeed() {
  return crypto.randomBytes(32).toString('hex');
}
