import crypto from 'crypto';
import { PRNG, generatePegMap, computeOutcome, generateCombinations } from './fairness';

describe('Fairness PRNG test vectors', () => {
  const rows = 12;
  const serverSeed = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
  const nonce = '42';
  const clientSeed = 'candidate-hello';

  it('matches the commit and combined seeds', () => {
    const { commitHex, combinedSeed } = generateCombinations(serverSeed, clientSeed, nonce);
    expect(commitHex).toBe('bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');
    expect(combinedSeed).toBe('e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');
  });

  it('matches first 5 rands of PRNG', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    const prng = new PRNG(combinedSeed);
    
    // We expect the PRNG values to be extremely close to the test vector
    const eps = 0.000000001;
    expect(Math.abs(prng.next() - 0.1106166649)).toBeLessThan(eps);
    expect(Math.abs(prng.next() - 0.7625129214)).toBeLessThan(eps);
    expect(Math.abs(prng.next() - 0.0439292176)).toBeLessThan(eps);
    expect(Math.abs(prng.next() - 0.4578678815)).toBeLessThan(eps);
    expect(Math.abs(prng.next() - 0.3438999297)).toBeLessThan(eps);
  });

  it('generates the correct peg map row biases', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    const prng = new PRNG(combinedSeed);
    const pegMap = generatePegMap(prng, rows);
    
    expect(pegMap[0][0]).toBe(0.422123);
    
    expect(pegMap[1][0]).toBe(0.552503);
    expect(pegMap[1][1]).toBe(0.408786);
    
    expect(pegMap[2][0]).toBe(0.491574);
    expect(pegMap[2][1]).toBe(0.468780);
    expect(pegMap[2][2]).toBe(0.436540);
  });

  it('correctly calculates binIndex for center drop', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    const prng = new PRNG(combinedSeed);
    const pegMap = generatePegMap(prng, rows);
    // Note: the test vector PRNG must be freshly instantiated because we reuse the single stream.
    // The spec says: use the same PRNG stream order every time: first for peg map, then for row decisions.
    
    const dropColumn = 6;
    const outcome = computeOutcome(pegMap, prng, dropColumn, rows);
    
    expect(outcome.binIndex).toBe(6);
  });
});
