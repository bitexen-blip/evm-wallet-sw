import { CHAIN_CONFIG, getBlockExplorerUrl } from '../../config/chains';

interface TransactionStatusProps {
  txHashes: Record<number, string>;
}

export default function TransactionStatus({ txHashes }: TransactionStatusProps) {
  const txArray = Object.entries(txHashes);

  if (txArray.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur border border-green-500/20 rounded-lg p-6">
      <h3 className="text-lg font-bold text-green-300 mb-4">✅ Transactions Submitted</h3>
      <div className="space-y-3">
        {txArray.map(([chainId, txHash]) => {
          const chainNum = Number(chainId);
          const chainConfig = CHAIN_CONFIG[chainNum];
          const explorerUrl = getBlockExplorerUrl(chainNum, txHash);

          return (
            <div key={chainId} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-green-300">
                    {chainConfig?.name || `Chain ${chainId}`}
                  </p>
                  <p className="text-xs text-gray-400">Transaction Hash</p>
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
              <code className="block bg-slate-900 p-2 rounded text-xs text-green-300 overflow-auto font-mono break-all">
                {txHash}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Monitor this transaction on{' '}
                {chainConfig?.blockExplorer ? (
                  <a href={chainConfig.blockExplorer} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {chainConfig.blockExplorer.replace('https://', '')}
                  </a>
                ) : (
                  'a block explorer'
                )}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded text-xs text-blue-200">
        💡 <span className="font-semibold">Tip:</span> Transactions may take time to be included in a block. Check back
        later for confirmation.
      </div>
    </div>
  );
}