import { Contract, JsonRpcProvider, formatUnits, parseUnits, ZeroAddress } from 'ethers';
import { WALLET_SWEEPER_ABI, ERC20_ABI } from '../config/contractABI';
import { CHAIN_CONFIG, SUPPORTED_CHAIN_IDS } from '../config/chains';

// Get contract address from environment
export function getContractAddress(chainId: number): string | null {
  const envKey = `VITE_WALLET_SWEEPER_${chainId}`;
  const address = process.env[envKey];
  if (address && address !== '0x') {
    return address;
  }
  return null;
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get RPC provider for chain
export function getProviderForChain(chainId: number, rpcUrl?: string): JsonRpcProvider | null {
  try {
    // Try custom RPC first
    if (rpcUrl) {
      return new JsonRpcProvider(rpcUrl);
    }

    // Check env vars
    const chainConfig = CHAIN_CONFIG[chainId];
    if (chainConfig?.rpc) {
      return new JsonRpcProvider(chainConfig.rpc);
    }

    return null;
  } catch (error) {
    console.error(`Failed to create provider for chain ${chainId}:`, error);
    return null;
  }
}

export interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceRaw: string;
}

export interface ChainBalance {
  chainId: number;
  chainName: string;
  nativeBalance: string;
  nativeSymbol: string;
  tokens: TokenBalance[];
}

// Get token balances for an address on a specific chain
export async function getTokenBalances(
  provider: JsonRpcProvider,
  userAddress: string,
  chainId: number,
  tokenAddresses: string[]
): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];

  for (const tokenAddress of tokenAddresses) {
    if (!isValidAddress(tokenAddress) || tokenAddress === ZeroAddress) {
      continue;
    }

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, provider);
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.decimals(),
        contract.symbol(),
      ]);

      if (balance > 0n) {
        balances.push({
          address: tokenAddress,
          symbol: symbol as string,
          decimals: decimals as number,
          balance: formatUnits(balance, decimals),
          balanceRaw: balance.toString(),
        });
      }
    } catch (error) {
      console.error(`Error fetching balance for token ${tokenAddress} on chain ${chainId}:`, error);
    }
  }

  return balances;
}

export interface SweepTxData {
  to: string; // contract address
  data: string; // encoded function call
  value: string; // in wei for native transfers
  chainId: number;
}

// Prepare sweep transaction data (not signed yet - user signs in wallet)
export async function prepareSweepTransaction(
  provider: JsonRpcProvider,
  userAddress: string,
  destinationAddress: string,
  contractAddress: string,
  tokenAddresses: string[],
  chainId: number,
  minGasBuffer: string
): Promise<SweepTxData> {
  if (!isValidAddress(userAddress)) throw new Error('Invalid user address');
  if (!isValidAddress(destinationAddress)) throw new Error('Invalid destination address');
  if (!isValidAddress(contractAddress)) throw new Error('Invalid contract address');

  // Filter valid token addresses
  const validTokens = tokenAddresses.filter((addr) => isValidAddress(addr) && addr !== ZeroAddress);

  try {
    const contract = new Contract(contractAddress, WALLET_SWEEPER_ABI, provider);

    // Encode the sweep function call
    const encodedData = contract.interface.encodeFunctionData('sweep', [
      validTokens,
      destinationAddress,
      minGasBuffer,
    ]);

    return {
      to: contractAddress,
      data: encodedData,
      value: '0',
      chainId,
    };
  } catch (error) {
    console.error('Error preparing sweep transaction:', error);
    throw new Error('Failed to prepare sweep transaction');
  }
}

// Validate sweep parameters
export function validateSweepParams(
  sourceAddress: string,
  destinationAddress: string,
  chains: number[]
): { valid: boolean; error?: string } {
  if (!isValidAddress(sourceAddress)) {
    return { valid: false, error: 'Invalid source address' };
  }

  if (!isValidAddress(destinationAddress)) {
    return { valid: false, error: 'Invalid destination address' };
  }

  if (sourceAddress.toLowerCase() === destinationAddress.toLowerCase()) {
    return { valid: false, error: 'Source and destination must be different' };
  }

  if (!Array.isArray(chains) || chains.length === 0) {
    return { valid: false, error: 'At least one chain must be selected' };
  }

  const invalidChains = chains.filter((c) => !SUPPORTED_CHAIN_IDS.includes(c));
  if (invalidChains.length > 0) {
    return { valid: false, error: `Unsupported chains: ${invalidChains.join(', ')}` };
  }

  return { valid: true };
}
