import { useWaitForTransactionReceipt } from 'wagmi';
import { CHAIN_CONFIG, getBlockExplorerUrl } from '../../config/chains';

interface TransactionState {
  chainId: number;
  chainName: string;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

interface TransactionStatusProps {
  transactions: TransactionState[];
}

function TransactionRow({ tx }: { tx: TransactionState }) {
  const chainNum = tx.chainId;
  const chainConfig = CHAIN_CONFIG[chainNum];
  const explorerUrl = getBlockExplorerUrl(chainNum, tx.hash);
  const { data: receipt } = useWaitForTransactionReceipt({ hash: (tx.hash as `0x${string}`) || undefined });

  const isConfirmed = receipt?.status === 'success';
  const isFailed = receipt?.status === 'reverted' || tx.status === 'failed';
  const isPending = !receipt && tx.status !== 'failed';

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-green-500/50 transition">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-green-300">{tx.chainName}</p>
          <p className="text-xs text-gray-400">
            {isPending && '⏳ Pending...'}
            {isConfirmed && '✅ Confirmed'}
            {isFailed && '❌ Failed'}
          </p>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition"
          >
            View ↗
          </a>
        )}
      </div>
      <code className="block bg-slate-900 p-2 rounded text-xs text-green-300 overflow-auto font-mono break-all mb-2">
        {tx.hash}
      </code>
      {receipt && (
        <div className="text-xs text-gray-400 space-y-1">
          <p>Block: {receipt.blockNumber?.toString()}</p>
          <p>Gas Used: {receipt.gasUsed?.toString()}</p>
          {isConfirmed && <p className="text-green-400 font-semibold">✓ Transaction successful</p>}
        </div>
      )}
      {tx.error && <p className="text-xs text-red-300 mt-2">{tx.error}</p>}
    </div>
  );
}

export default function TransactionStatus({ transactions }: TransactionStatusProps) {
  if (transactions.length === 0) {
    return null;
  }

  const confirmedCount = transactions.filter((tx) => tx.status === 'confirmed').length;
  const failedCount = transactions.filter((tx) => tx.status === 'failed').length;
  const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;

  return (
    <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur border border-green-500/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-green-300">🌊 Sweep In Progress</h3>
        <div className="text-xs text-gray-300 space-x-4">
          {pendingCount > 0 && <span>⏳ {pendingCount} pending</span>}
          {confirmedCount > 0 && <span className="text-green-400">✅ {confirmedCount} confirmed</span>}
          {failedCount > 0 && <span className="text-red-400">❌ {failedCount} failed</span>}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {transactions.map((tx) => (
          <TransactionRow key={tx.hash || tx.chainId} tx={tx} />
        ))}
      </div>

      <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded text-xs text-blue-200">
        💡 <span className="font-semibold">Tip:</span> Transactions may take time to be included in a block. Check back
        later for confirmation or monitor on the block explorer.
      </div>
    </div>
  );
}
