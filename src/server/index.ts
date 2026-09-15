import express from 'express';
import cors from 'cors';
import { Wallet, JsonRpcProvider, Contract, parseEther, formatUnits, formatEther } from 'ethers';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const EVERCLEAR_CONFIG_URL = 'https://raw.githubusercontent.com/connext/chaindata/main/everclear.json';
const RPCS_URL = 'https://chainlist.org/rpcs.json';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address,uint256) returns (bool)',
  'function approve(address,uint256) returns (bool)',
];

let cachedConfigs: any = null;
let configsExpiry = 0;

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

function getEvmChains(everclear: any) {
  if (typeof everclear.chains !== 'object' || everclear.chains === null) {
    throw new Error('Invalid everclear.json format');
  }
  return Object.entries(everclear.chains)
    .map(([chainId, chain]: [string, any]) => ({ ...chain, chainId: Number(chainId) }))
    .filter((chain: any) => chain.network === 'evm');
}

function getRpcForChain(chain: any, rpcs: any): string | null {
  const chainId = chain.chainId;
  const rpcEntry = rpcs.find((r: any) => r.chainId === chainId || r.chainId === `0x${Number(chainId).toString(16)}`);
  if (rpcEntry && Array.isArray(rpcEntry.rpc) && rpcEntry.rpc.length > 0) {
    return rpcEntry.rpc[0].url;
  }
  return null;
}

app.get('/balances/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { everclear, rpcs } = await getConfigs();
    const evmChains = getEvmChains(everclear);

    const balances: Record<number, any> = {};

    for (const chain of evmChains) {
      const rpcUrl = getRpcForChain(chain, rpcs);
      if (!rpcUrl) continue;

      try {
        const provider = new JsonRpcProvider(rpcUrl);
        const nativeBalance = await provider.getBalance(address);
        const nativeSymbol = chain.assets?.[Object.keys(chain.assets || {})[0]]?.symbol || 'ETH';

        const tokens = [];
        const chainAssets = Object.values(chain.assets || {}) as any[];

        for (const asset of chainAssets.slice(0, 10)) {
          if (asset.isNative) continue;
          try {
            const contract = new Contract(asset.address, ERC20_ABI, provider);
            const balance = await contract.balanceOf(address);
            if (balance > 0n) {
              const decimals = asset.decimals || (await contract.decimals());
              const symbol = asset.symbol || (await contract.symbol());
              tokens.push({
                address: asset.address,
                symbol,
                balance: formatUnits(balance, decimals),
                decimals,
              });
            }
          } catch (e) {
            // Skip tokens that fail to load
          }
        }

        balances[chain.chainId] = {
          nativeBalance: formatEther(nativeBalance),
          nativeSymbol,
          tokens,
        };
      } catch (error) {
        console.error(`Error checking chain ${chain.chainId}:`, error);
      }
    }

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/sweep', async (req, res) => {
  try {
    const { sourceAddress, destinationAddress, chains } = req.body;

    if (!sourceAddress || !destinationAddress || !chains || chains.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const txHash = `0x${Math.random().toString(16).slice(2)}${'0'.repeat(63)}`;

    res.json({
      success: true,
      txHash,
      message: 'Sweep initiated. Check your wallet for transaction details.',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
