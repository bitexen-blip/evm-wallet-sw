import { useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
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

export default function WalletSweeper({ address }: WalletSweeperProps) {
  const { chain: connectedChain } = useAccount();
  const { sendTransaction } = useSendTransaction();
  
  const [balances, setBalances] = useState<Record<number, ChainBalance>>({});
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [completedTransactions, setCompletedTransactions] = useState<TransactionState[]>([]);
  const [currentTxIndex, setCurrentTxIndex] = useState<number | null>(null);

  const handleSweep = async (destination: string, chains: number[]) => {
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
              // In a real app, you'd prompt user to switch chains
              console.warn(
                `Please switch to ${instruction.chainName} (Chain ${instruction.chainId})`,
                `Currently on chain ${connectedChain?.id}`
              );
              setSweepError(
                `Please switch to ${instruction.chainName} in your wallet to continue.`
              );
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
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
          <SweepForm address={address} onSweep={handleSweep} loading={isSweeping} />
        </div>
        <div>
          <BalanceChecker address={address} balances={balances} setBalances={setBalances} />
        </div>
      </div>

      {/* Current Network Info */}
      {isSweeping && currentTxIndex !== null && (
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-200 text-sm">
            <span className="font-semibold">⏳ Executing transaction {(currentTxIndex || 0) + 1}</span> of{' '}
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
                {sweepResult.sweepInstructions.reduce(
                  (sum, inst) => sum + (inst.tokensToSweep || 0),
                  0
                )}
              </p>
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