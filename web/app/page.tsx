import AnalyzerView from './components/AnalyzerView';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center gap-8 p-8">
      <header className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">
          Style<span className="text-cyan-400">On</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">Real-time color season analysis</p>
      </header>

      <AnalyzerView />
    </main>
  );
}
