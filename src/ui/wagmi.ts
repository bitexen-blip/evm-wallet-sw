import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base,
  avalanche,
  bsc,
  fantom,
  gnosis,
  celo,
  moonbeam,
  polygonZkEvm,
  zkSync,
  linea,
  scroll,
  // Additional chains
  defineChain,
} from 'wagmi/chains';

// Define chains not in wagmi by default
const harmony = defineChain({
  id: 1666600000,
  name: 'Harmony One',
  network: 'harmony',
  nativeCurrency: { name: 'ONE', symbol: 'ONE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.harmony.one'] },
    public: { http: ['https://api.harmony.one'] },
  },
  blockExplorers: {
    default: { name: 'Harmony Explorer', url: 'https://explorer.harmony.one' },
  },
});

const canto = defineChain({
  id: 7700,
  name: 'Canto',
  network: 'canto',
  nativeCurrency: { name: 'CANTO', symbol: 'CANTO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnode.plexnode.org:8545'] },
    public: { http: ['https://mainnode.plexnode.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'Canto Explorer', url: 'https://evm.explorer.canto.io' },
  },
});

const core = defineChain({
  id: 1116,
  name: 'Core',
  network: 'core',
  nativeCurrency: { name: 'CORE', symbol: 'CORE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.coredao.org'] },
    public: { http: ['https://rpc.coredao.org'] },
  },
  blockExplorers: {
    default: { name: 'Core Explorer', url: 'https://explorer.coredao.org' },
  },
});

const iotex = defineChain({
  id: 4689,
  name: 'IoTeX',
  network: 'iotex',
  nativeCurrency: { name: 'IOTX', symbol: 'IOTX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://babel-api.mainnet.iotex.io'] },
    public: { http: ['https://babel-api.mainnet.iotex.io'] },
  },
  blockExplorers: {
    default: { name: 'IoTeX Explorer', url: 'https://iotexscan.io' },
  },
});

const evmos = defineChain({
  id: 9001,
  name: 'Evmos',
  network: 'evmos',
  nativeCurrency: { name: 'EVMOS', symbol: 'EVMOS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://eth.bd.evmos.org:8545'] },
    public: { http: ['https://eth.bd.evmos.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'Evmos Explorer', url: 'https://escan.live' },
  },
});

const metis = defineChain({
  id: 1088,
  name: 'Metis Andromeda',
  network: 'metis',
  nativeCurrency: { name: 'METIS', symbol: 'METIS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://andromeda.metis.io/?owner=1088'] },
    public: { http: ['https://andromeda.metis.io/?owner=1088'] },
  },
  blockExplorers: {
    default: { name: 'Metis Explorer', url: 'https://andromeda-explorer.metis.io' },
  },
});

const moonriver = defineChain({
  id: 1285,
  name: 'Moonriver',
  network: 'moonriver',
  nativeCurrency: { name: 'MOVR', symbol: 'MOVR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://moonriver.public.blastapi.io'] },
    public: { http: ['https://moonriver.public.blastapi.io'] },
  },
  blockExplorers: {
    default: { name: 'Moonriver Explorer', url: 'https://moonriver.moonscan.io' },
  },
});

const theta = defineChain({
  id: 361,
  name: 'Theta',
  network: 'theta',
  nativeCurrency: { name: 'THETA', symbol: 'THETA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://eth-rpc-api.thetatoken.org/rpc'] },
    public: { http: ['https://eth-rpc-api.thetatoken.org/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Theta Explorer', url: 'https://explorer.thetatoken.org' },
  },
});

const fuse = defineChain({
  id: 122,
  name: 'Fuse',
  network: 'fuse',
  nativeCurrency: { name: 'FUSE', symbol: 'FUSE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.fuse.io'] },
    public: { http: ['https://rpc.fuse.io'] },
  },
  blockExplorers: {
    default: { name: 'Fuse Explorer', url: 'https://explorer.fuse.io' },
  },
});

const conflux = defineChain({
  id: 1030,
  name: 'Conflux eSpace',
  network: 'conflux',
  nativeCurrency: { name: 'CFX', symbol: 'CFX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm.confluxrpc.com'] },
    public: { http: ['https://evm.confluxrpc.com'] },
  },
  blockExplorers: {
    default: { name: 'Conflux Explorer', url: 'https://evm.confluxscan.io' },
  },
});

const dogechain = defineChain({
  id: 2000,
  name: 'Dogechain',
  network: 'dogechain',
  nativeCurrency: { name: 'DOGE', symbol: 'DOGE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.dogechain.dog'] },
    public: { http: ['https://rpc.dogechain.dog'] },
  },
  blockExplorers: {
    default: { name: 'Dogechain Explorer', url: 'https://explorer.dogechain.dog' },
  },
});

const kcc = defineChain({
  id: 322,
  name: 'KCC',
  network: 'kcc',
  nativeCurrency: { name: 'KCS', symbol: 'KCS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-mainnet.kcc.network'] },
    public: { http: ['https://rpc-mainnet.kcc.network'] },
  },
  blockExplorers: {
    default: { name: 'KCC Explorer', url: 'https://explorer.kcc.io' },
  },
});

const okxchain = defineChain({
  id: 66,
  name: 'OKX Chain',
  network: 'okxchain',
  nativeCurrency: { name: 'OKT', symbol: 'OKT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://exchainrpc.okex.org'] },
    public: { http: ['https://exchainrpc.okex.org'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.oklink.com/okc' },
  },
});

const huobi = defineChain({
  id: 128,
  name: 'Huobi ECO Chain',
  network: 'huobi',
  nativeCurrency: { name: 'HT', symbol: 'HT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://http-mainnet.hecochain.com'] },
    public: { http: ['https://http-mainnet.hecochain.com'] },
  },
  blockExplorers: {
    default: { name: 'Huobi Explorer', url: 'https://hecoinfo.com' },
  },
});

const cronos = defineChain({
  id: 25,
  name: 'Cronos',
  network: 'cronos',
  nativeCurrency: { name: 'CRO', symbol: 'CRO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.cronoslabs.com:8545'] },
    public: { http: ['https://mainnet.cronoslabs.com:8545'] },
  },
  blockExplorers: {
    default: { name: 'Cronos Explorer', url: 'https://cronoscan.com' },
  },
});

const aves = defineChain({
  id: 33,
  name: 'Aves',
  network: 'aves',
  nativeCurrency: { name: 'AVES', symbol: 'AVES', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.avescoin.io'] },
    public: { http: ['https://rpc.avescoin.io'] },
  },
  blockExplorers: {
    default: { name: 'Aves Explorer', url: 'https://explorer.avescoin.io' },
  },
});

const aurora = defineChain({
  id: 1313161554,
  name: 'Aurora',
  network: 'aurora',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.aurora.dev'] },
    public: { http: ['https://mainnet.aurora.dev'] },
  },
  blockExplorers: {
    default: { name: 'Aurora Explorer', url: 'https://explorer.aurora.dev' },
  },
});

export const supportedChains = [
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base,
  avalanche,
  bsc,
  fantom,
  gnosis,
  celo,
  moonbeam,
  polygonZkEvm,
  zkSync,
  linea,
  scroll,
  // Custom chains
  harmony,
  canto,
  core,
  iotex,
  evmos,
  metis,
  moonriver,
  theta,
  fuse,
  conflux,
  dogechain,
  kcc,
  okxchain,
  huobi,
  cronos,
  aves,
  aurora,
] as const;

export const getConfig = () =>
  getDefaultConfig({
    appName: 'EVM Wallet Sweeper',
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: supportedChains as any,
    ssr: false,
  });
