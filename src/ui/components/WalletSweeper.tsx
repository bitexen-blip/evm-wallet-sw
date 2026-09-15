import { useState, useEffect } from 'react';
import BalanceChecker from './BalanceChecker';
import SweepForm from './SweepForm';
import TransactionStatus from './TransactionStatus';

interface WalletSweeperProps {
  address: string;
}

export default function WalletSweeper({ address }: WalletSweeperProps) {
  const [destinationAddress, setDestinationAddress] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [balances, setBalances] = useState<Record<number, any>>({});
  const [isSweeping, setIsSweeping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSweep = async (destination: string, chains: number[]) => {
    setDestinationAddress(destination);
    setSelectedChains(chains);
    setIsSweeping(true);

    try {
      const response = await fetch('/api/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAddress: address,
          destinationAddress: destination,
          chains,
        }),
      });

      const data = await response.json();
      if (data.txHash) {
        setTxHash(data.txHash);
      }
    } catch (error) {
      console.error('Sweep error:', error);
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <SweepForm address={address} onSweep={handleSweep} loading={isSweeping} />
      </div>
      <div>
        <BalanceChecker address={address} balances={balances} setBalances={setBalances} />
      </div>
      {txHash && <TransactionStatus txHash={txHash} />}
    </div>
  );
}
