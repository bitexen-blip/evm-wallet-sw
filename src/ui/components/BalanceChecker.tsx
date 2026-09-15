import { useEffect, useState } from 'react';
import { useBalance } from 'wagmi';

interface BalanceCheckerProps {
  address: string;
  balances: Record<number, any>;
  setBalances: (balances: Record<number, any>) => void;
}

export default function BalanceChecker({ address, balances, setBalances }: BalanceCheckerProps) {
  const [loading, setLoading] = useState(false);
  const { data: nativeBalance } = useBalance({ address: address as `0x${string}` });

  const checkBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/balances/${address}`);
      const data = await response.json();
      setBalances(data);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBalances();
  }, [address]);

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">📊 Balances</h2>
      <button
        onClick={checkBalances}
        disabled={loading}
        className="w-full mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition"
      >
        {loading ? 'Checking...' : 'Check Balances'}
      </button>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(balances).map(([chainId, chainData]) => (
          <div key={chainId} className="bg-slate-700/50 rounded p-3">
            <p className="text-sm font-semibold text-purple-300">Chain {chainId}</p>
            <p className="text-sm text-gray-300 truncate">
              {chainData.nativeBalance} {chainData.nativeSymbol}
            </p>
            {chainData.tokens.length > 0 && (
              <div className="mt-2 space-y-1">
                {chainData.tokens.slice(0, 3).map((token: any) => (
                  <p key={token.address} className="text-xs text-gray-400 truncate">
                    {token.balance} {token.symbol}
                  </p>
                ))}
                {chainData.tokens.length > 3 && (
                  <p className="text-xs text-gray-500">+{chainData.tokens.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
