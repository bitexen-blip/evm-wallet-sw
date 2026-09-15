export default function Header() {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">🔄 EVM Wallet Sweeper</h1>
            <p className="text-gray-400 text-sm mt-1">Sweep all tokens and native coins across EVM chains</p>
          </div>
          <div className="text-right">
            <div className="text-2xl">💰</div>
          </div>
        </div>
      </div>
    </header>
  );
}
