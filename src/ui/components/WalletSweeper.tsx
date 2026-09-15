import { useState } from 'react';
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

interface SweepResult {
  success: boolean;
  sourceAddress: string;
  destinationAddress: string;
  totalChains: number;
  sweepInstructions: Array<{
    chainId: number;
    chainName: string;
    contractAddress?: string;
    txData?: string;
    tokensToSweep?: number;
    totalTokensOnChain?: number;
    status?: string;
    error?: string;
  }>;
  message: string;
}

export default function WalletSweeper({ address }: WalletSweeperProps) {
  const [balances, setBalances] = useState<Record<number, ChainBalance>>({});
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<Record<number, string>>({});

  const handleSweep = async (destination: string, chains: number[]) => {
    setIsSweeping(true);
    setSweepError(null);
    setSweepResult(null);
    setTxHashes({});

    try {
      // Step 1: Prepare sweep transactions
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
        const successfulTxs: Record<number, string> = {};
        const errors: string[] = [];

        for (const instruction of data.sweepInstructions) {
          if (instruction.status === 'error') {
            errors.push(`Chain ${instruction.chainId}: ${instruction.error}`);
            continue;
          }

          try {
            // In a real implementation, this would integrate with wagmi/ethers
            // to sign and submit transactions through the user's wallet
            console.log(`Would execute sweep on chain ${instruction.chainId}:`, instruction);
            // successfulTxs[instruction.chainId] = txHash;
          } catch (err) {
            errors.push(
              `Chain ${instruction.chainId}: ${err instanceof Error ? err.message : 'Unknown error'}`
            );
          }
        }

        setTxHashes(successfulTxs);
        if (errors.length > 0) {
          setSweepError(`Some chains failed: ${errors.join('; ')}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setSweepError(errorMsg);
      console.error('Sweep error:', error);
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SweepForm address={address} onSweep={handleSweep} loading={isSweeping} />
        </div>
        <div>
          <BalanceChecker address={address} balances={balances} setBalances={setBalances} />
        </div>
      </div>

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
              <p className="text-gray-400">Destination Address</p>
              <p className="text-blue-200 font-mono text-xs break-all">{sweepResult.destinationAddress}</p>
            </div>
            <div>
              <p className="text-gray-400">Chains Ready</p>
              <p className="text-blue-200 font-semibold">{sweepResult.totalChains}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Tokens</p>
              <p className="text-blue-200 font-semibold">
                {sweepResult.sweepInstructions.reduce((sum, inst) => sum + (inst.tokensToSweep || 0), 0)}
              </p>
            </div>
          </div>

          {/* Chain Details */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sweepResult.sweepInstructions.map((instruction) => (
              <div key={instruction.chainId} className="bg-slate-800/50 rounded p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-300">{instruction.chainName}</span>
                  {instruction.status === 'error' ? (
                    <span className="text-red-300">❌ {instruction.error}</span>
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
            ))}
          </div>

          <p className="text-xs text-blue-200 mt-4 italic">{sweepResult.message}</p>
        </div>
      )}

      {/* Transaction Hashes */}
      {Object.keys(txHashes).length > 0 && (
        <div>
          <TransactionStatus txHashes={txHashes} />
        </div>
      )}
    </div>
  );
}