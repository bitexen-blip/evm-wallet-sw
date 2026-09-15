export const CHAIN_CONFIG: Record<number, { name: string; symbol: string; blockExplorer: string; rpc?: string }> = {
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    blockExplorer: 'https://etherscan.io',
    rpc: process.env.ETH_RPC_URL,
  },
  11155111: {
    name: 'Sepolia',
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com',
    rpc: process.env.POLYGON_RPC_URL,
  },
  10: {
    name: 'Optimism',
    symbol: 'ETH',
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  42161: {
    name: 'Arbitrum',
    symbol: 'ETH',
    blockExplorer: 'https://arbiscan.io',
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    blockExplorer: 'https://basescan.org',
  },
  43114: {
    name: 'Avalanche',
    symbol: 'AVAX',
    blockExplorer: 'https://snowscan.xyz',
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAIN_CONFIG).map(Number);

export function getChainName(chainId: number): string {
  return CHAIN_CONFIG[chainId]?.name || `Chain ${chainId}`;
}

export function getBlockExplorerUrl(chainId: number, txHash: string): string {
  const config = CHAIN_CONFIG[chainId];
  if (!config) return '';
  return `${config.blockExplorer}/tx/${txHash}`;
}
