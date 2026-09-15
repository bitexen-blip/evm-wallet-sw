import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base,
  avalancheFuji,
} from 'wagmi/chains';

export const getConfig = () =>
  getDefaultConfig({
    appName: 'EVM Wallet Sweeper',
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [mainnet, sepolia, polygon, optimism, arbitrum, base],
    ssr: false,
  });
