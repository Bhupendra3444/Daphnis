import PlinkoGame from '@/components/PlinkoGame';

export const metadata = {
  title: 'Plinko Lab - Provably Fair Game',
  description: 'Interactive, provably fair Plinko built with Next.js',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 overflow-hidden">
      <PlinkoGame />
    </main>
  );
}
