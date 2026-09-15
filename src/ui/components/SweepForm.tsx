import { useState, useEffect } from 'react';

const MAJOR_CHAINS = [
  // Ethereum & Layer 2s
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 10, name: 'Optimism', symbol: 'OP' },
  { id: 42161, name: 'Arbitrum', symbol: 'ARB' },
  { id: 8453, name: 'Base', symbol: 'BASE' },
  
  // Sidechains
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
  { id: 56, name: 'BNB Chain', symbol: 'BNB' },
  
  // Other Major Chains
  { id: 250, name: 'Fantom', symbol: 'FTM' },
  { id: 100, name: 'Gnosis', symbol: 'xDAI' },
  { id: 42220, name: 'Celo', symbol: 'CELO' },
  { id: 1284, name: 'Moonbeam', symbol: 'GLMR' },
  { id: 1101, name: 'Polygon zkEVM', symbol: 'ETH' },
  { id: 324, name: 'zkSync Era', symbol: 'ETH' },
  { id: 59144, name: 'Linea', symbol: 'ETH' },
  { id: 534352, name: 'Scroll', symbol: 'ETH' },
];\n\ninterface SweepFormProps {
  address: string;
  onSweep: (destination: string, chains: number[]) => void;
  loading: boolean;
}

export default function SweepForm({ address, onSweep, loading }: SweepFormProps) {
  const [destination, setDestination] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [useAllChains, setUseAllChains] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Set default destination from env
  useEffect(() => {
    const defaultDest = import.meta.env.VITE_DEFAULT_DESTINATION_WALLET;
    if (defaultDest && !destination) {
      setDestination(defaultDest);
    }
  }, []);

  const handleChainToggle = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
    setValidationError(null);
  };

  const validateAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!destination.trim()) {
      setValidationError('Destination address is required');
      return;
    }

    if (!validateAddress(destination)) {
      setValidationError('Invalid destination address format (must be 0x...)');
      return;
    }

    if (destination.toLowerCase() === address.toLowerCase()) {
      setValidationError('Destination must be different from source address');
      return;
    }

    if (selectedChains.length === 0 && !useAllChains) {
      setValidationError('Please select at least one chain');
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
          onChange={(e) => {
            setDestination(e.target.value);
            setValidationError(null);
          }}
          placeholder="0x..."
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
        />
        <p className="text-xs text-gray-400 mt-2">All funds will be sent to this address</p>
        {destination && validateAddress(destination) && (
          <p className="text-xs text-green-400 mt-1">✓ Valid address</p>
        )}
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
                setValidationError(null);
              }}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="ml-2 text-sm text-gray-300">Select All ({MAJOR_CHAINS.length})</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
          {MAJOR_CHAINS.map((chain) => (
            <label
              key={chain.id}
              className="flex items-center p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50 transition border border-slate-600/50"
            >
              <input
                type="checkbox"
                checked={selectedChains.includes(chain.id)}
                onChange={() => handleChainToggle(chain.id)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              />
              <span className="ml-3 text-sm text-white font-medium">{chain.name}</span>
              <span className="ml-auto text-xs text-gray-500">{chain.symbol}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {selectedChains.length} of {MAJOR_CHAINS.length} chains selected
        </p>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm">
          ⚠️ {validationError}
        </div>
      )}

      {/* Security Warning */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs text-blue-200">
          <span className="font-semibold">🔒 Security Note:</span> Verify the destination address is correct before confirming.
          This action will sweep ALL tokens and native coins to the destination.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !destination}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Sweeping...
          </>
        ) : (
          '🔄 Sweep Wallet'
        )}
      </button>
    </form>
  );
}
