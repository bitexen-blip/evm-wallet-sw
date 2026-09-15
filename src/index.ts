#!/usr/bin/env ts-node
import { Command } from 'commander';
import axios from 'axios';
import { Wallet, JsonRpcProvider, Contract, parseUnits, formatUnits, formatEther, ZeroAddress, TransactionResponse } from 'ethers';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const EVERCLEAR_CONFIG_URL = 'https://raw.githubusercontent.com/connext/chaindata/main/everclear.json';
const RPCS_URL = 'https://chainlist.org/rpcs.json';
const DEFAULT_DESTINATION = process.env.DEFAULT_DESTINATION_WALLET || process.env.VITE_DEFAULT_DESTINATION_WALLET;

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const WALLET_SWEEPER_ABI = [
  'function sweep(address[] calldata tokens, address payable destination, uint256 minGasBuffer) external',
  'function sweepNative(address payable destination, uint256 minGasBuffer) external',
];

const program = new Command();

program
  .name('sweep-wallet')
  .description('Sweep all token and native balances from an EOA across EVM chains with ONE SIGNATURE PER CHAIN')
  .requiredOption('-k, --private-key <key>', 'Private key of the EOA to sweep')
  .option('--destination <address>', 'Destination address (overrides env DEFAULT_DESTINATION_WALLET)')
  .option('--dry-run', 'Simulate actions without sending transactions', false)
  .option('--max-gas-price <gwei>', 'Maximum gas price (in gwei) for transactions', parseFloat)
  .option('--skip-erc20', 'Skip transferring non-native (ERC20) tokens', false)
  .option('--min-gas-buffer <wei>', 'Minimum gas buffer to keep (default: 0.1 ETH)', '100000000000000000')
  .parse(process.argv);

const opts = program.opts();

// Determine destination address
let outAddress = opts.destination || DEFAULT_DESTINATION;

if (!outAddress || outAddress.trim() === '') {
  console.error('\n❌ Error: Destination address not provided');
  console.error('Set DEFAULT_DESTINATION_WALLET environment variable or use --destination flag\n');
  process.exit(1);
}

outAddress = outAddress.trim();

console.log('\n🌊 EVM WALLET SWEEPER - ONE SIGNATURE PER CHAIN');
console.log(`📍 Destination: ${outAddress}\n`);

interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  assets: any[];
}

async function fetchConfigs() {
  const [everclearRes, rpcsRes] = await Promise.all([
    axios.get(EVERCLEAR_CONFIG_URL),
    axios.get(RPCS_URL),
  ]);
  return { everclear: everclearRes.data, rpcs: rpcsRes.data };
}

function getEvmChains(everclear: any) {
  if (typeof everclear.chains !== 'object' || everclear.chains === null) {
    throw new Error('Invalid everclear.json format');
  }
  return Object.entries(everclear.chains)
    .map(([chainId, chain]: [string, any]) => ({
      ...chain,
      chainId: Number(chainId),
    }))
    .filter((chain: any) => chain.network === 'evm');
}

function getRpcForChain(chainId: number, rpcs: any): string | null {
  const rpcEntry = rpcs.find(
    (r: any) =>
      r.chainId === chainId ||
      r.chainId === `0x${Number(chainId).toString(16)}` ||
      r.chainId === Number(chainId)
  );
  if (rpcEntry && Array.isArray(rpcEntry.rpc) && rpcEntry.rpc.length > 0) {
    return rpcEntry.rpc[0].url;
  }
  return null;
}

async function getContractAddress(chainId: number): Promise<string | null> {
  const envKey = `VITE_WALLET_SWEEPER_${chainId}`;
  const address = process.env[envKey];
  return address && address !== '0x' ? address : null;
}

async function getTokensWithBalance(
  provider: JsonRpcProvider,
  userAddress: string,
  chainId: number,
  chainAssets: any[]
): Promise<{ address: string; symbol: string; decimals: number; balance: string }[]> {
  const tokensWithBalance: { address: string; symbol: string; decimals: number; balance: string }[] = [];

  for (const asset of chainAssets.filter((a: any) => !a.isNative)) {
    try {
      if (!asset.address || asset.address === ZeroAddress) continue;

      const contract = new Contract(asset.address, ERC20_ABI, provider);
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.decimals(),
        contract.symbol(),
      ]);

      if (balance > 0n) {
        tokensWithBalance.push({
          address: asset.address,
          symbol: symbol as string,
          decimals: decimals as number,
          balance: formatUnits(balance, decimals),
        });
      }
    } catch (err) {
      // Silently skip tokens that can't be read
    }
  }

  return tokensWithBalance;
}

async function approveTokens(
  provider: JsonRpcProvider,
  wallet: Wallet,
  userAddress: string,
  contractAddress: string,
  tokenAddresses: string[]
): Promise<string[]> {
  const approvedTokens: string[] = [];
  const connectedWallet = wallet.connect(provider);

  for (const tokenAddress of tokenAddresses) {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, connectedWallet);
      const allowance = await contract.allowance(userAddress, contractAddress);

      // Check if allowance is less than max uint256
      if (allowance < BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') / 2n) {
        const approveTx = await contract.approve(
          contractAddress,
          BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        );
        await approveTx.wait();
      }

      approvedTokens.push(tokenAddress);
    } catch (err) {
      console.warn(`  ⚠️  Could not approve token ${tokenAddress}:`, (err as Error).message);
    }
  }

  return approvedTokens;
}

async function executeChainSweep(
  chainInfo: ChainInfo,
  provider: JsonRpcProvider,
  wallet: Wallet,
  userAddress: string
): Promise<{ success: boolean; txHash?: string; tokensSwept?: number; error?: string }> {
  console.log(`\n[${chainInfo.chainId}] ${chainInfo.name}`);

  try {
    const connectedWallet = wallet.connect(provider);
    const sweepContract = new Contract(chainInfo.contractAddress, WALLET_SWEEPER_ABI, connectedWallet);

    // Get tokens with balance
    const tokensWithBalance = await getTokensWithBalance(
      provider,
      userAddress,
      chainInfo.chainId,
      chainInfo.assets
    );

    console.log(`  💰 Found ${tokensWithBalance.length} ERC20 tokens with balance`);

    // Approve tokens if not skipping ERC20
    let tokensToSweep: string[] = [];
    if (!opts.skipErc20 && tokensWithBalance.length > 0) {
      console.log(`  🔐 Approving ${tokensWithBalance.length} token(s)...`);
      tokensToSweep = await approveTokens(
        provider,
        wallet,
        userAddress,
        chainInfo.contractAddress,
        tokensWithBalance.map((t) => t.address)
      );
      console.log(`  ✓ Approved ${tokensToSweep.length} token(s)`);
    }

    // Check native balance
    const nativeBalance = await provider.getBalance(userAddress);
    console.log(`  🪙 Native balance: ${formatEther(nativeBalance)}`);

    // Execute sweep with ONE SIGNATURE
    console.log(`  📝 Waiting for 1 signature to sweep all tokens + native...`);

    let tx: TransactionResponse;
    if (nativeBalance > 0n && tokensToSweep.length === 0) {
      // Only native tokens
      tx = await sweepContract.sweepNative(outAddress, opts.minGasBuffer);
    } else {
      // Both tokens and native - this is ONE signature for everything
      tx = await sweepContract.sweep(tokensToSweep, outAddress, opts.minGasBuffer);
    }

    console.log(`  📤 Transaction hash: ${tx.hash}`);
    console.log(`  ⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`  ✅ Confirmed!`);

    return { success: true, txHash: tx.hash, tokensSwept: tokensToSweep.length };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`  ❌ Error on ${chainInfo.name}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function dryRunSweep(
  chainInfo: ChainInfo,
  provider: JsonRpcProvider,
  userAddress: string
) {
  console.log(`\n[${chainInfo.chainId}] ${chainInfo.name} [DRY RUN]`);

  try {
    const tokensWithBalance = await getTokensWithBalance(
      provider,
      userAddress,
      chainInfo.chainId,
      chainInfo.assets
    );

    if (tokensWithBalance.length > 0) {
      console.log(`  📋 Would sweep ${tokensWithBalance.length} ERC20 tokens:`);
      for (const token of tokensWithBalance) {
        console.log(`     • ${token.balance} ${token.symbol}`);
      }
    }

    const nativeBalance = await provider.getBalance(userAddress);
    if (nativeBalance > 0n) {
      console.log(`  📋 Would sweep ${formatEther(nativeBalance)} (native)`);
    }

    if (tokensWithBalance.length === 0 && nativeBalance === 0n) {
      console.log(`  📋 Nothing to sweep on this chain`);
    }

    console.log(`  📍 Destination: ${outAddress}`);
  } catch (err) {
    console.warn(`  ⚠️  Could not read chain ${chainInfo.name}:`, (err as Error).message);
  }
}

async function promptConfirmation(chainsToSweep: ChainInfo[], userAddress: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });

  console.log('\n' + '='.repeat(70));
  console.log('🔐 SWEEP CONFIRMATION');
  console.log('='.repeat(70));
  console.log(`\nSource Wallet: ${userAddress}`);
  console.log(`Destination: ${outAddress}`);
  console.log(`\nChains to sweep: ${chainsToSweep.length}`);
  for (const chain of chainsToSweep) {
    console.log(`  • ${chain.name} (Chain ${chain.chainId})`);
  }

  console.log('\n⚠️  Each chain requires ONE SIGNATURE (all tokens + native swept together)\n');
  console.log('='.repeat(70));
  
  const answer = await rl.question('Proceed? (yes/no): ');
  rl.close();

  return answer.trim().toLowerCase() === 'yes';
}

async function main() {
  try {
    console.log('⏳ Fetching configurations...\n');
    const { everclear, rpcs } = await fetchConfigs();
    const evmChains = getEvmChains(everclear);
    const wallet = new Wallet(process.env.PRIVATE_KEY || opts.privateKey);
    const userAddress = await wallet.getAddress();

    console.log(`📍 Wallet: ${userAddress}\n`);

    // Prepare chains with deployed contracts
    const chainsToSweep: ChainInfo[] = [];

    for (const chain of evmChains) {
      const rpcUrl = getRpcForChain(chain.chainId, rpcs);
      if (!rpcUrl) continue;

      const contractAddress = await getContractAddress(chain.chainId);
      if (!contractAddress) continue;

      chainsToSweep.push({
        chainId: chain.chainId,
        name: chain.name || `Chain ${chain.chainId}`,
        rpcUrl,
        contractAddress,
        assets: Object.values(chain.assets || {}),
      });
    }

    if (chainsToSweep.length === 0) {
      console.error('❌ No chains with deployed contracts found');
      console.error('Set VITE_WALLET_SWEEPER_<CHAIN_ID> environment variables\n');
      process.exit(1);
    }

    console.log(`✅ Found ${chainsToSweep.length} chain(s) with deployed contracts\n`);

    // DRY RUN mode
    if (opts.dryRun) {
      console.log('📋 DRY RUN - Preview of what would be swept:\n');
      for (const chainInfo of chainsToSweep) {
        const provider = new JsonRpcProvider(chainInfo.rpcUrl);
        await dryRunSweep(chainInfo, provider, userAddress);
      }
      console.log('\n✅ Dry run complete!\n');
      return;
    }

    // Ask for confirmation before executing
    const confirmed = await promptConfirmation(chainsToSweep, userAddress);
    if (!confirmed) {
      console.log('\n❌ Sweep cancelled by user.\n');
      process.exit(0);
    }

    // Execute sweeps sequentially
    console.log('\n🌊 EXECUTING SWEEP - ONE SIGNATURE PER CHAIN\n');

    const results = [];
    for (const chainInfo of chainsToSweep) {
      const provider = new JsonRpcProvider(chainInfo.rpcUrl);
      const result = await executeChainSweep(chainInfo, provider, wallet, userAddress);
      results.push({ chainId: chainInfo.chainId, chainName: chainInfo.name, ...result });
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SWEEP SUMMARY');
    console.log('='.repeat(70));

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n✅ Successful: ${successful}/${results.length}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}/${results.length}\n`);
      for (const result of results.filter((r) => !r.success)) {
        console.log(`  • ${result.chainName}: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SWEEP COMPLETE!\n');
  } catch (err) {
    console.error('\n❌ Fatal Error:', err);
    process.exit(1);
  }
}

main();
