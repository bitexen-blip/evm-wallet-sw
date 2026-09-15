import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import WalletSweeper from './components/WalletSweeper';
import Header from './components/Header';

function App() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-lg text-gray-300 mb-8">To get started with wallet sweep, connect your wallet</p>
            </div>
            <ConnectButton />
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <ConnectButton />
            </div>
            <WalletSweeper address={address!} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
