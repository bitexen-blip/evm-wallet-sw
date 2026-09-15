import { useState } from 'react';

const MAJOR_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 10, name: 'Optimism', symbol: 'OP' },
  { id: 42161, name: 'Arbitrum', symbol: 'ARB' },
  { id: 8453, name: 'Base', symbol: 'BASE' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
];

interface SweepFormProps {
  address: string;
  onSweep: (destination: string, chains: number[]) => void;
  loading: boolean;
}

export default function SweepForm({ address, onSweep, loading }: SweepFormProps) {
  const [destination, setDestination] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [useAllChains, setUseAllChains] = useState(false);

  const handleChainToggle = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) {
      alert('Please enter a destination address');
      return;
    }
    if (selectedChains.length === 0 && !useAllChains) {
      alert('Please select at least one chain');
      return;
    }
    const chains = useAllChains ? MAJOR_CHAINS.map((c) => c.id) : selectedChains;
    onSweep(destination, chains);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Destination Address */}
      <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
        <label className="block text-sm font-semibold text-white mb-2">Destination Address</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <p className="text-xs text-gray-400 mt-2">Funds will be sent to this address</p>
      </div>

      {/* Source Address Info */}
      <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
        <label className="block text-sm font-semibold text-white mb-2">Source Address</label>
        <div className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-300 font-mono text-sm break-all">
          {address}
        </div>
      </div>

      {/* Chain Selection */}
      <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-white">Select Chains</label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useAllChains}
              onChange={(e) => {
                setUseAllChains(e.target.checked);
                if (e.target.checked) {
                  setSelectedChains(MAJOR_CHAINS.map((c) => c.id));
                }
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-300">Select All</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MAJOR_CHAINS.map((chain) => (
            <label
              key={chain.id}
              className="flex items-center p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50 transition"
            >
              <input
                type="checkbox"
                checked={selectedChains.includes(chain.id)}
                onChange={() => handleChainToggle(chain.id)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-3 text-sm text-white">{chain.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !destination}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition transform hover:scale-105 disabled:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Sweeping...
          </span>
        ) : (
          '🔄 Sweep Wallet'
        )}
      </button>
    </form>
  );
}
