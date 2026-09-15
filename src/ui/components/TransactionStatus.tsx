interface TransactionStatusProps {
  txHash: string;
}

export default function TransactionStatus({ txHash }: TransactionStatusProps) {
  return (
    <div className="lg:col-span-3">
      <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur border border-green-500/20 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-300 mb-3">✅ Transaction Submitted</h3>
        <p className="text-sm text-gray-300 mb-4">Transaction hash:</p>
        <code className="block bg-slate-800 p-3 rounded text-xs text-green-300 overflow-auto">{txHash}</code>
        <p className="text-xs text-gray-400 mt-3">Check the transaction on your network's block explorer</p>
      </div>
    </div>
  );
}
