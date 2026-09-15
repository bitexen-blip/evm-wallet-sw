import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import WalletSweeper from './components/WalletSweeper';
import Header from './components/Header';

function App() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [supportedChains, setSupportedChains] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    // Fetch supported chains from backend
    fetchSupportedChains();
  }, []);

  const fetchSupportedChains = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chains');
      if (response.ok) {
        const chains = await response.json();
        setSupportedChains(chains);
      }
    } catch (error) {
      console.error('Failed to fetch supported chains:', error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
              <div className="mb-4">
                <h1 className="text-5xl font-bold text-white mb-2">🌊 EVM Wallet Sweeper</h1>
                <p className="text-xl text-gray-300">
                  Consolidate all your tokens and native coins across {supportedChains.length} EVM chains
                </p>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-lg text-gray-300 mb-8">
                Start sweeping by connecting your wallet with MetaMask or WalletConnect
              </p>
            </div>
            <ConnectButton />
            
            {/* Features Overview */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-4">
                <p className="text-2xl mb-2">🔗</p>
                <h3 className="font-semibold text-white mb-2">Multi-Chain</h3>
                <p className="text-sm text-gray-300">Sweep from {supportedChains.length} EVM-compatible chains</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-4">
                <p className="text-2xl mb-2">💰</p>
                <h3 className="font-semibold text-white mb-2">All Assets</h3>
                <p className="text-sm text-gray-300">Transfer all tokens and native coins in one go</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-4">
                <p className="text-2xl mb-2">🔒</p>
                <h3 className="font-semibold text-white mb-2">Secure</h3>
                <p className="text-sm text-gray-300">Your private keys never leave your wallet</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-400">Connected Wallet</p>
                <p className="text-sm font-mono text-purple-300 break-all">{address}</p>
              </div>
              <ConnectButton />
            </div>
            <WalletSweeper address={address!} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-700/50">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm font-semibold text-gray-300 mb-2">Supported Chains</p>
              <p className="text-xs text-gray-400">{supportedChains.length} EVM networks</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300 mb-2">Features</p>
              <p className="text-xs text-gray-400">Multi-chain sweeping</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300 mb-2">Security</p>
              <p className="text-xs text-gray-400">Wallet signing required</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300 mb-2">Version</p>
              <p className="text-xs text-gray-400">2.0.0</p>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-gray-500 text-center">
              ⚠️ Always test on testnet first. This tool is provided as-is. Use at your own risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;