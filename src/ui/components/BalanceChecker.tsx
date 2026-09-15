import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

interface ChainBalance {
  chainName: string;
  nativeBalance: string;
  nativeSymbol: string;
  tokens: TokenBalance[];
}

interface BalanceCheckerProps {
  address: string;
  balances: Record<number, ChainBalance>;
  setBalances: (balances: Record<number, ChainBalance>) => void;
}

export default function BalanceChecker({ address, balances, setBalances }: BalanceCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);

  const checkBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/balances/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch balances: ${response.statusText}`);
      }
      const data = await response.json();
      setBalances(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Failed to fetch balances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      checkBalances();
    }
  }, [address]);

  const hasTokens = Object.values(balances).some((chain) => chain.tokens.length > 0);
  const totalChains = Object.keys(balances).length;
  const chainsWithBalance = Object.entries(balances).filter(
    ([, chain]) => parseFloat(chain.nativeBalance) > 0 || chain.tokens.length > 0
  ).length;

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">📊 Balances</h2>
        <button
          onClick={checkBalances}
          disabled={loading}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition"
          title="Refresh balances"
        >
          {loading ? '⟳' : '🔄'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500/50 rounded text-blue-200 text-sm">
          Loading balances...
        </div>
      )}

      {totalChains === 0 ? (
        <p className="text-gray-400 text-sm">Click "Check Balances" to scan your wallet across all chains</p>
      ) : (
        <>
          <div className="mb-3 p-3 bg-slate-700/50 rounded border border-slate-600 text-xs text-gray-300">
            <span className="font-semibold">{chainsWithBalance}</span> chain(s) with balance • Found{' '}
            <span className="font-semibold">{hasTokens ? '✓' : '0'}</span> token(s)
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {Object.entries(balances)
              .sort(([, a], [, b]) => {
                const aTotal = parseFloat(a.nativeBalance) + a.tokens.reduce((sum, t) => sum + parseFloat(t.balance), 0);
                const bTotal = parseFloat(b.nativeBalance) + b.tokens.reduce((sum, t) => sum + parseFloat(t.balance), 0);
                return bTotal - aTotal;
              })
              .map(([chainId, chainData]) => {
                const nativeNum = parseFloat(chainData.nativeBalance);
                const hasTokens = chainData.tokens.length > 0;
                const isExpanded = expandedChain === Number(chainId);

                return (
                  <div
                    key={chainId}
                    className="bg-slate-700/50 rounded border border-slate-600 hover:border-purple-500/30 transition"
                  >
                    <button
                      onClick={() => setExpandedChain(isExpanded ? null : Number(chainId))}
                      className="w-full p-3 text-left hover:bg-slate-600/30 transition rounded"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-purple-300">{chainData.chainName}</p>
                          <p className="text-xs text-gray-400">
                            {nativeNum > 0 && (
                              <span className="inline-block mr-2">
                                💰 {nativeNum.toFixed(4)} {chainData.nativeSymbol}
                              </span>
                            )}
                            {hasTokens && <span className="text-purple-400">+{chainData.tokens.length} token(s)</span>}
                            {nativeNum === 0 && !hasTokens && <span className="text-gray-500">No balance</span>}
                          </p>
                        </div>
                        {hasTokens && (
                          <span className="text-purple-400 text-lg">{isExpanded ? '▼' : '▶'}</span>
                        )}
                      </div>
                    </button>

                    {isExpanded && hasTokens && (
                      <div className="border-t border-slate-600 px-3 py-2 bg-slate-800/50">
                        <div className="space-y-1">
                          {chainData.tokens.map((token) => (
                            <div key={token.address} className="flex justify-between text-xs">
                              <span className="text-gray-400 truncate mr-2">{token.symbol}</span>
                              <span className="text-gray-300 font-mono">
                                {parseFloat(token.balance).toLocaleString('en-US', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 4,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <button
            onClick={checkBalances}
            disabled={loading}
            className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded transition font-medium"
          >
            {loading ? 'Checking...' : 'Refresh All Balances'}
          </button>
        </>
      )}
    </div>
  );
}