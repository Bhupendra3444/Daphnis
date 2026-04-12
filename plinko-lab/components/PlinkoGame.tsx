'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import confetti from 'canvas-confetti';

interface PlinkoGameProps { }

export default function PlinkoGame(props: PlinkoGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [dropColumn, setDropColumn] = useState(6);
  const [isDropping, setIsDropping] = useState(false);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState('lucky-player');
  const [mute, setMute] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio refs
  const tickAudio = useRef<HTMLAudioElement | null>(null);
  const winAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    tickAudio.current = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_24e055f190.mp3?filename=pop-39222.mp3'); // short tick
    winAudio.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3'); // chime
  }, []);

  const playTick = () => {
    if (!mute && tickAudio.current) {
      tickAudio.current.currentTime = 0;
      tickAudio.current.volume = 0.2;
      tickAudio.current.play().catch(() => {});
    }
  };

  const playWin = () => {
    if (!mute && winAudio.current) {
      winAudio.current.currentTime = 0;
      winAudio.current.volume = 0.5;
      winAudio.current.play().catch(() => {});
    }
  };

  const handleDrop = async () => {
    if (isDropping) return;
    setIsDropping(true);

    try {
      // 1. Commit
      const commitRes = await fetch('/api/rounds/commit', { method: 'POST' });
      const commitData = await commitRes.json();

      if (!commitRes.ok || !commitData.roundId) {
        console.error('Failed to commit round:', commitData);
        alert('Server Error: Database is read-only or unavailable.');
        setIsDropping(false);
        return;
      }

      // 2. Start
      const startRes = await fetch(`/api/rounds/${commitData.roundId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSeed, betCents: betAmount * 100, dropColumn })
      });
      const startData = await startRes.json();
      
      if (!startRes.ok || !startData.path) {
        console.error('Failed to start round:', startData);
        setIsDropping(false);
        return;
      }

      // 3. Animate (Fake physics based on path)
      setRoundId(commitData.roundId);
      await animateDrop(startData.path);

      // 4. Reveal
      const revealRes = await fetch(`/api/rounds/${commitData.roundId}/reveal`, { method: 'POST' });
      const revealData = await revealRes.json();

      if (startData.payoutMultiplier >= 1.0) {
        playWin();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 }
        });
      }

      setHistory(prev => [{
        id: commitData.roundId,
        bet: betAmount,
        payout: startData.payoutMultiplier,
        serverSeed: revealData.serverSeed,
        clientSeed,
        nonce: commitData.nonce,
        dropColumn
      }, ...prev].slice(0, 10));

    } catch (err) {
      console.error(err);
    }
    
    setIsDropping(false);
  };

  const animateDrop = (path: number[]) => {
    return new Promise<void>((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) { resolve(); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(); return; }

      const rows = 12;
      const startX = canvas.width / 2 + (dropColumn - 6) * 30; // 30 is horizontal spacing
      const startY = 30;
      
      let currentRow = 0;
      let currentX = startX;
      let currentY = startY;

      let progress = 0;
      
      const animate = () => {
        if (currentRow >= rows) {
          // Re-draw clean board
          drawBoard(ctx, canvas);
          resolve();
          return;
        }

        drawBoard(ctx, canvas);
        
        const nextDir = path[currentRow]; // -1 or 1
        const targetX = currentX + (nextDir * 15);
        const targetY = currentY + 30; // 30 vertical spacing
        
        progress += 0.1;
        if (progress >= 1) {
          progress = 0;
          currentX = targetX;
          currentY = targetY;
          currentRow++;
          playTick();
        }

        const renderX = currentX + (targetX - currentX) * progress;
        const renderY = currentY + (targetY - currentY) * progress;

        ctx.beginPath();
        ctx.arc(renderX, renderY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3366';
        ctx.fill();
        ctx.closePath();

        requestAnimationFrame(animate);
      };

      animate();
    });
  };

  const drawBoard = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Pegs
    const rows = 12;
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r <= rows; r++) {
      for (let p = 0; p <= r; p++) {
        const x = canvas.width / 2 + (p - r / 2) * 30;
        const y = 50 + r * 30;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }
    }

    // Draw Drop Zone Indicators
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for(let i=0; i<=12; i++) {
        const x = canvas.width / 2 + (i - 6) * 30;
        const y = 20;
        if (i === dropColumn) {
            ctx.fillStyle = 'rgba(255, 51, 102, 0.8)';
            ctx.beginPath();
            ctx.moveTo(x - 5, y - 5);
            ctx.lineTo(x + 5, y - 5);
            ctx.lineTo(x, y + 5);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        }
    }

    // Draw Bins
    const multipliers = [10, 5, 2, 1.5, 1.2, 1, 0.5, 1, 1.2, 1.5, 2, 5, 10];
    for (let i = 0; i <= 12; i++) {
      const x = canvas.width / 2 + (i - 6) * 30;
      const y = 50 + 13 * 30;
      ctx.fillStyle = i === dropColumn && isDropping ? 'rgba(255, 255, 255, 0.3)' : `hsl(${120 - Math.abs(6-i)*15}, 70%, 50%)`;
      ctx.fillRect(x - 12, y, 24, 20);
      ctx.fillStyle = '#111';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(multipliers[i] + 'x', x, y + 15);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) drawBoard(ctx, canvasRef.current);
    }
  }, [dropColumn]); // Redraw when dropColumn changes


  const handleKeyDown = (e: KeyboardEvent) => {
    if (isDropping) return;
    if (e.key === 'ArrowLeft') {
      setDropColumn(Math.max(0, dropColumn - 1));
    } else if (e.key === 'ArrowRight') {
      setDropColumn(Math.min(12, dropColumn + 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      handleDrop();
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto p-4 md:p-8 bg-gray-900 min-h-screen text-white font-sans outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
      <h1 className="text-4xl font-black mb-2 tracking-tighter bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">PLINKO LAB</h1>
      <p className="text-gray-400 mb-8 max-w-lg text-center text-sm">Provably fair, deterministic physics. Use Left/Right arrows to move the drop zone. Space to drop.</p>

      <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-start">
        <div className="relative p-6 rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <canvas ref={canvasRef} width={600} height={500} className="rounded-lg shadow-inner bg-gray-900 border border-gray-800" />
        </div>

        <div className="flex flex-col gap-6 w-full md:w-64">
           <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Bet Amount</label>
             <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-lg font-bold text-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all" />
           </div>

           <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Client Seed</label>
             <input type="text" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:ring-2 focus:ring-violet-500 focus:outline-none transition-all" />
           </div>

           <div className="flex gap-2 text-sm text-gray-400 font-medium items-center justify-between px-1">
             <span>Drop Column: <span className="text-white font-bold">{dropColumn}</span></span>
             <button onClick={() => setMute(!mute)} className="hover:text-white transition-colors">{mute ? '🔇 Muted' : '🔊 Sound On'}</button>
           </div>

           <button 
             onClick={handleDrop} 
             disabled={isDropping}
             className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-pink-500/20 text-white"
           >
             {isDropping ? 'DROPPING...' : 'DROP BALL'}
           </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="w-full max-w-4xl mt-12 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          <div className="p-4 bg-gray-800/50 border-b border-gray-700">
            <h3 className="font-bold text-gray-200">Recent Rounds</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-700">Bet</th>
                  <th className="px-4 py-3 border-b border-gray-700">Payout</th>
                  <th className="px-4 py-3 border-b border-gray-700">Client Seed</th>
                  <th className="px-4 py-3 border-b border-gray-700">Server Seed</th>
                  <th className="px-4 py-3 border-b border-gray-700">Verify</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-700/50 transition-colors border-b border-gray-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-300">{h.bet}</td>
                    <td className={`px-4 py-3 font-bold ${h.payout >= 1 ? 'text-green-400' : 'text-red-400'}`}>{h.payout}x</td>
                    <td className="px-4 py-3 font-mono text-xs">{h.clientSeed}</td>
                    <td className="px-4 py-3 font-mono text-xs">{h.serverSeed ? `${h.serverSeed.substring(0, 16)}...` : 'Hidden'}</td>
                    <td className="px-4 py-3">
                      <a href={`/verify?serverSeed=${h.serverSeed}&clientSeed=${h.clientSeed}&nonce=${h.nonce}&dropColumn=${h.dropColumn}&roundId=${h.id}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium">Verify</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
