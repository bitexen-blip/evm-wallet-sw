import express from 'express';
import cors from 'cors';
import { JsonRpcProvider, formatEther } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import {
  getContractAddress,
  isValidAddress,
  getProviderForChain,
  getTokenBalances,
  prepareSweepTransaction,
  validateSweepParams,
} from './contractUtils';
import { CHAIN_CONFIG, SUPPORTED_CHAIN_IDS } from '../config/chains';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const EVERCLEAR_CONFIG_URL = 'https://raw.githubusercontent.com/connext/chaindata/main/everclear.json';
const RPCS_URL = 'https://chainlist.org/rpcs.json';

let cachedConfigs: any = null;
let configsExpiry = 0;

// Cache configurations for 1 hour
async function getConfigs() {
  const now = Date.now();
  if (cachedConfigs && now < configsExpiry) {
    return cachedConfigs;
  }

  try {
    const [everclearRes, rpcsRes] = await Promise.all([
      axios.get(EVERCLEAR_CONFIG_URL),
      axios.get(RPCS_URL),
    ]);
    cachedConfigs = { everclear: everclearRes.data, rpcs: rpcsRes.data };
    configsExpiry = now + 3600000;
    return cachedConfigs;
  } catch (error) {
    console.error('Error fetching configs:', error);
    throw error;
  }
}

// Get EVM chains from Everclear config
function getEvmChains(everclear: any) {
  if (typeof everclear.chains !== 'object' || everclear.chains === null) {
    throw new Error('Invalid everclear.json format');
  }
  return Object.entries(everclear.chains)
    .map(([chainId, chain]: [string, any]) => ({ ...chain, chainId: Number(chainId) }))
    .filter((chain: any) => chain.network === 'evm');
}

// Get RPC URL for a chain
function getRpcForChain(chainId: number, rpcs: any): string | null {
  const rpcEntry = rpcs.find(
    (r: any) => r.chainId === chainId || r.chainId === `0x${Number(chainId).toString(16)}`
  );
  if (rpcEntry && Array.isArray(rpcEntry.rpc) && rpcEntry.rpc.length > 0) {
    // Filter out broken RPC URLs
    return rpcEntry.rpc.find((r: any) => !r.url.includes('infura') || r.url.includes('YOUR_API_KEY') === false)?.url || rpcEntry.rpc[0].url;
  }
  return null;
}

// GET /api/balances/:address - Fetch balances across all chains
app.get('/api/balances/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const { everclear, rpcs } = await getConfigs();
    const evmChains = getEvmChains(everclear);

    const balances: Record<number, any> = {};

    // Query only supported chains
    const chainsToQuery = evmChains.filter((chain: any) => SUPPORTED_CHAIN_IDS.includes(chain.chainId));

    await Promise.all(
      chainsToQuery.map(async (chain: any) => {
        const rpcUrl = getRpcForChain(chain.chainId, rpcs);
        if (!rpcUrl) return;

        try {
          const provider = new JsonRpcProvider(rpcUrl);
          const nativeBalance = await provider.getBalance(address);
          const nativeSymbol = CHAIN_CONFIG[chain.chainId]?.symbol || 'ETH';

          const tokens = [];
          const chainAssets = Object.values(chain.assets || {}) as any[];

          // Query top 20 tokens for balance
          const tokenAddresses = chainAssets
            .filter((asset: any) => !asset.isNative)
            .slice(0, 20)
            .map((asset: any) => asset.address);

          if (tokenAddresses.length > 0) {
            const tokenBalances = await getTokenBalances(provider, address, chain.chainId, tokenAddresses);
            tokens.push(...tokenBalances);
          }

          balances[chain.chainId] = {
            chainName: CHAIN_CONFIG[chain.chainId]?.name || `Chain ${chain.chainId}`,
            nativeBalance: formatEther(nativeBalance),
            nativeSymbol,
            tokens: tokens.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)),
          };
        } catch (error) {
          console.error(`Error checking chain ${chain.chainId}:`, error);
        }
      })
    );

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/sweep - Prepare sweep transaction (user signs in wallet)
app.post('/api/sweep', async (req, res) => {
  try {
    const { sourceAddress, destinationAddress, chains } = req.body;

    // Validate inputs
    const validation = validateSweepParams(sourceAddress, destinationAddress, chains);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check which chains have deployed contracts
    const availableChains = chains.filter((chainId: number) => {
      const contractAddr = getContractAddress(chainId);
      return contractAddr !== null;
    });

    if (availableChains.length === 0) {
      return res.status(400).json({
        error: 'No WalletSweeper contracts deployed on selected chains. Please deploy the contract first.',
        chains: chains.map((chainId: number) => ({
          chainId,
          chainName: CHAIN_CONFIG[chainId]?.name || `Chain ${chainId}`,
          status: 'not_deployed',
        })),
      });
    }

    const { everclear, rpcs } = await getConfigs();
    const evmChains = getEvmChains(everclear);

    const sweepInstructions = [];

    // Prepare sweep transactions for each chain
    for (const chainId of availableChains) {
      const chainConfig = evmChains.find((c: any) => c.chainId === chainId);
      if (!chainConfig) continue;

      const rpcUrl = getRpcForChain(chainId, rpcs);
      if (!rpcUrl) continue;

      try {
        const provider = new JsonRpcProvider(rpcUrl);
        const contractAddress = getContractAddress(chainId)!;

        // Get token balances for this chain
        const tokenAddresses = Object.values(chainConfig.assets || {})
          .filter((asset: any) => !asset.isNative)
          .slice(0, 20)
          .map((asset: any) => (asset as any).address);

        const tokenBalances = await getTokenBalances(provider, sourceAddress, chainId, tokenAddresses);
        const tokensWithBalance = tokenBalances.map((t) => t.address);

        // Prepare sweep transaction
        const minGasBuffer = process.env.MIN_GAS_BUFFER || '100000000000000000'; // 0.1 ETH default
        const txData = await prepareSweepTransaction(
          provider,
          sourceAddress,
          destinationAddress,
          contractAddress,
          tokensWithBalance,
          chainId,
          minGasBuffer
        );

        sweepInstructions.push({
          chainId,
          chainName: CHAIN_CONFIG[chainId]?.name,
          contractAddress,
          txData,
          tokensToSweep: tokensWithBalance.length,
          totalTokensOnChain: tokenBalances.length,
        });
      } catch (error) {
        console.error(`Error preparing sweep for chain ${chainId}:`, error);
        sweepInstructions.push({
          chainId,
          chainName: CHAIN_CONFIG[chainId]?.name,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    res.json({
      success: true,
      sourceAddress,
      destinationAddress,
      totalChains: sweepInstructions.length,
      sweepInstructions,
      message: `Ready to sweep from ${sweepInstructions.length} chain(s). User must sign transactions in wallet.`,
    });
  } catch (error) {
    console.error('Sweep error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/chains - Get supported chains
app.get('/api/chains', (req, res) => {
  const chains = SUPPORTED_CHAIN_IDS.map((chainId) => ({
    chainId,
    ...CHAIN_CONFIG[chainId],
    contractDeployed: getContractAddress(chainId) !== null,
  }));
  res.json(chains);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Supported chains: ${SUPPORTED_CHAIN_IDS.join(', ')}`);
});
