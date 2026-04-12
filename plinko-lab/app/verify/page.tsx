'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyForm() {
  const searchParams = useSearchParams();
  const [roundId, setRoundId] = useState(searchParams.get('roundId') || '');
  const [serverSeed, setServerSeed] = useState(searchParams.get('serverSeed') || '');
  const [clientSeed, setClientSeed] = useState(searchParams.get('clientSeed') || '');
  const [nonce, setNonce] = useState(searchParams.get('nonce') || '');
  const [dropColumn, setDropColumn] = useState(searchParams.get('dropColumn') || '6');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const qs = new URLSearchParams({ serverSeed, clientSeed, nonce, dropColumn }).toString();
      const res = await fetch(`/api/verify?${qs}`);
      const data = await res.json();
      
      let roundData = null;
      if (roundId) {
        const rRes = await fetch(`/api/rounds/${roundId}`);
        if (rRes.ok) {
           roundData = await rRes.json();
        }
      }

      if (!res.ok) {
        setError(data.error || 'Verification failed');
      } else {
        const matchesDB = roundData ? (roundData.commitHex === data.commitHex && roundData.binIndex === data.binIndex) : undefined;
        setResult({ ...data, roundData, matchesDB });
      }
    } catch (err) {
      setError('An error occurred during verification');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-6 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Round Verifier</h1>
        <p className="text-gray-400 mb-8">Enter the round details below to deterministically recompute hashes, positions and final bin index. This guarantees fairness since the outcome logic cannot be altered post-bet.</p>
        
        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Round ID (Optional DB Match)</label>
            <input type="text" value={roundId} onChange={e => setRoundId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm" placeholder="e.g. cmnw46fdy000uuhocl5p7skcw" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Server Seed</label>
            <input required type="text" value={serverSeed} onChange={e => setServerSeed(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm" placeholder="e.g. b2a5f3f3..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Client Seed</label>
            <input required type="text" value={clientSeed} onChange={e => setClientSeed(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm" placeholder="e.g. lucky-player" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Nonce</label>
              <input required type="text" value={nonce} onChange={e => setNonce(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Drop Column (0-12)</label>
              <input required type="number" min="0" max="12" value={dropColumn} onChange={e => setDropColumn(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg">
            {loading ? 'Verifying...' : 'Verify Fairness'}
          </button>
        </form>

        {error && <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 mb-8">{error}</div>}

        {result && (
          <div className={`bg-gray-800 p-6 rounded-2xl border shadow-xl space-y-4 ${result.matchesDB === false ? 'border-red-500/30 shadow-red-500/10' : 'border-green-500/30 shadow-green-500/10'}`}>
            <h2 className={`text-xl font-bold flex items-center gap-2 mb-6 ${result.matchesDB === false ? 'text-red-400' : 'text-green-400'}`}>
              {result.matchesDB === true ? '✅ DB & Hash Match Verified' : result.matchesDB === false ? '❌ DB Mismatch' : '✅ Deterministic Hash Verified'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wilder mb-1">Commit Hash</h3>
                <div className="font-mono text-xs bg-gray-900 p-3 rounded-lg border border-gray-700 break-all text-gray-300">{result.commitHex}</div>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wilder mb-1">Combined Seed</h3>
                <div className="font-mono text-xs bg-gray-900 p-3 rounded-lg border border-gray-700 break-all text-gray-300">{result.combinedSeed}</div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wilder mb-1">Peg Map Hash</h3>
                <div className="font-mono text-xs bg-gray-900 p-3 rounded-lg border border-gray-700 break-all text-gray-300">{result.pegMapHash}</div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wilder mb-1">Final Bin Index</h3>
                <div className="font-mono text-3xl font-black bg-gray-900 p-3 rounded-lg border border-gray-700 text-indigo-400 text-center flex flex-col justify-center">{result.binIndex}</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wilder mb-3">Replay Path</h3>
              <div className="flex flex-wrap gap-2 text-sm bg-gray-900 p-4 rounded-lg font-mono">
                {result.path.map((dir: number, i: number) => (
                  <span key={i} className={`px-2 py-1 rounded inline-flex items-center justify-center font-bold ${dir === -1 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    Row {i}: {dir === -1 ? 'Left' : 'Right'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="bg-gray-900 min-h-screen text-white p-8">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
