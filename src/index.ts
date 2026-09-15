#!/usr/bin/env ts-node
import { Command } from 'commander';
import axios from 'axios';
import { Wallet, JsonRpcProvider, Contract, parseUnits, formatUnits, formatEther, ZeroAddress } from 'ethers';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const EVERCLEAR_CONFIG_URL = 'https://raw.githubusercontent.com/connext/chaindata/main/everclear.json';
const RPCS_URL = 'https://chainlist.org/rpcs.json';
const DEFAULT_DESTINATION = process.env.DEFAULT_DESTINATION_WALLET;

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address,uint256) returns (bool)',
];

const program = new Command();

program
  .name('sweep-wallet')
  .description('Sweep all token and native balances from an EOA across EVM chains to default destination')
  .requiredOption('-k, --private-key <key>', 'Private key of the EOA to sweep')
  .option('--dry-run', 'Simulate actions without sending transactions', false)
  .option('--force', 'Skip confirmation prompt and proceed with transfers', false)
  .option('--max-gas-price <gwei>', 'Maximum gas price (in gwei) for transactions', parseFloat)
  .option('--skip-erc20', 'Skip transferring non-native (ERC20) tokens', false)
  .parse(process.argv);

const opts = program.opts();

// Validate DEFAULT_DESTINATION is set
if (!DEFAULT_DESTINATION || DEFAULT_DESTINATION.trim() === '') {
  console.error('\n❌ Error: DEFAULT_DESTINATION_WALLET environment variable is not set');
  console.error('Please set it in your .env file:');
  console.error('DEFAULT_DESTINATION_WALLET=0x...\n');
  process.exit(1);
}

const outAddress = DEFAULT_DESTINATION;

async function fetchConfigs() {
  const [everclearRes, rpcsRes] = await Promise.all([axios.get(EVERCLEAR_CONFIG_URL), axios.get(RPCS_URL)]);
  const everclear = everclearRes.data;
  const rpcs = rpcsRes.data;
  return { everclear, rpcs };
}

function getEvmChains(everclear: any) {
  if (typeof everclear.chains !== 'object' || everclear.chains === null) throw new Error('Invalid everclear.json format');
  return Object.entries(everclear.chains)
    .map(([chainId, chain]: [string, any]) => ({ ...chain, chainId: Number(chainId) }))
    .filter((chain: any) => chain.network === 'evm');
}

function getRpcForChain(chain: any, rpcs: any): string | null {
  const chainId = chain.chainId;
  const rpcEntry = rpcs.find((r: any) => {
    return (
      r.chainId === chainId ||
      r.chainId === `0x${Number(chainId).toString(16)}` ||
      r.chainId === Number(chainId)
    );
  });
  if (rpcEntry && Array.isArray(rpcEntry.rpc) && rpcEntry.rpc.length > 0) {
    return rpcEntry.rpc[0].url;
  }
  return null;
}

async function dryRunSweep(chain: any, rpcUrl: string, tokens: any[], wallet: Wallet) {
  const provider = new JsonRpcProvider(rpcUrl);
  const connectedWallet = wallet.connect(provider);
  const address = await connectedWallet.getAddress();
  console.log(`\n[${chain.chainId}] ${chain.name || 'Unknown Chain'}`);
  console.log(`  Wallet: ${address}`);

  // Sweep non-native tokens first
  if (!opts.skipErc20) {
    for (const token of tokens.filter((t: any) => !t.isNative)) {
      try {
        const contract = new Contract(token.address, ERC20_ABI, provider);
        const balance: bigint = await contract.balanceOf(address);
        if (balance > 0n) {
          const decimals = token.decimals || (await contract.decimals());
          const symbol = token.symbol || (await contract.symbol());
          const formatted = formatUnits(balance, decimals);
          console.log(`  [DRY-RUN] Would send ${formatted} ${symbol}`);
        }
      } catch (err) {
        console.warn(`  [WARN] Could not check token ${token.symbol || token.address}:`, (err as Error).message);
      }
    }
  }

  // Sweep native token
  try {
    const nativeToken = tokens.find((t: any) => t.isNative);
    const balance: bigint = await provider.getBalance(address);
    const txRequest = {
      to: outAddress,
      value: balance,
    };
    const estimatedGas = await provider.estimateGas(txRequest);
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
    if (currentGasPrice == null) {
      console.warn('  [WARN] Could not determine gas price. Skipping native token.');
      return;
    }
    const totalGasCost = estimatedGas * currentGasPrice;
    if (balance > totalGasCost) {
      const sendAmount = balance - totalGasCost;
      const formatted = formatEther(sendAmount);
      console.log(
        `  [DRY-RUN] Would send ${formatted} ${nativeToken ? nativeToken.symbol : 'ETH'} (native)`
      );
    } else {
      console.log('  Not enough native token to cover gas cost.');
    }
  } catch (err) {
    console.warn('  [WARN] Could not check native token:', (err as Error).message);
  }
}

async function confirmProceed(chains: any[]) {
  const rl = readline.createInterface({ input, output });
  console.log('\n🌊 WALLET SWEEP - CONFIRMATION REQUIRED\n');
  console.log('Chains to sweep:');
  for (const chain of chains) {
    console.log(`  • ${chain.name || `Chain ${chain.chainId}`}`);
  }
  const answer = await rl.question('\n⚠️  Are you sure you want to proceed? (yes/no): ');
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

async function transferAll(chain: any, rpcUrl: string, tokens: any[], wallet: Wallet, maxGasPriceGwei?: number) {
  const provider = new JsonRpcProvider(rpcUrl);
  const connectedWallet = wallet.connect(provider);
  const address = await connectedWallet.getAddress();
  console.log(`\n[${chain.chainId}] ${chain.name || 'Unknown Chain'}`);
  console.log(`  Source: ${address}`);

  let gasPrice: bigint | undefined;
  if (maxGasPriceGwei !== undefined) {
    try {
      const feeData = await provider.getFeeData();
      gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? undefined;
      if (gasPrice === undefined) {
        console.warn('  [WARN] Could not determine gas price. Skipping chain.');
        return;
      }
      const maxGasPrice = parseUnits(maxGasPriceGwei.toString(), 'gwei');
      if (gasPrice > maxGasPrice) {
        console.warn(`  [WARN] Gas price too high. Skipping chain.`);
        return;
      }
    } catch (err) {
      console.warn('  [WARN] Could not fetch gas price:', (err as Error).message);
    }
  }

  // Transfer non-native tokens first
  if (!opts.skipErc20) {
    for (const token of tokens.filter((t: any) => !t.isNative)) {
      try {
        const contract = new Contract(token.address, ERC20_ABI, connectedWallet);
        const balance: bigint = await contract.balanceOf(address);
        if (balance > 0n) {
          const decimals = token.decimals || (await contract.decimals());
          const symbol = token.symbol || (await contract.symbol());
          const formatted = formatUnits(balance, decimals);
          console.log(`  Sending ${formatted} ${symbol}`);
          const tx = await contract.transfer(outAddress, balance, gasPrice ? { gasPrice } : {});
          console.log(`    [TX] ${tx.hash}`);
          await tx.wait();
          console.log('    ✓ Confirmed!');
        }
      } catch (err) {
        console.warn(`  [WARN] Could not send token ${token.symbol || token.address}:`, (err as Error).message);
      }
    }
  }

  // Transfer native token
  try {
    const nativeToken = tokens.find((t: any) => t.isNative);
    const balance: bigint = await provider.getBalance(address);
    const txRequest = {
      to: outAddress,
      value: balance,
      ...(gasPrice ? { gasPrice } : {}),
    };
    const estimatedGas = await provider.estimateGas(txRequest);
    const feeData = await provider.getFeeData();
    const currentGasPrice = gasPrice ?? (feeData.maxFeePerGas ?? feeData.gasPrice);
    if (currentGasPrice == null) {
      console.warn('  [WARN] Could not determine gas price.');
      return;
    }
    const totalGasCost = estimatedGas * currentGasPrice;
    if (balance > totalGasCost) {
      const sendAmount = balance - totalGasCost;
      const formatted = formatEther(sendAmount);
      console.log(`  Sending ${formatted} ${nativeToken ? nativeToken.symbol : 'ETH'} (native)`);
      const tx = await connectedWallet.sendTransaction({
        to: outAddress,
        value: sendAmount,
        ...(gasPrice ? { gasPrice } : {}),
      });
      console.log(`    [TX] ${tx.hash}`);
      await tx.wait();
      console.log('    ✓ Confirmed!');
    } else {
      console.log('  Not enough native token to cover gas cost.');
    }
  } catch (err) {
    console.warn('  [WARN] Could not send native token:', (err as Error).message);
  }
}

(async () => {
  try {
    console.log('\n🌊 EVM WALLET SWEEPER\n');

    const { everclear, rpcs } = await fetchConfigs();
    const evmChains = getEvmChains(everclear);
    const wallet = new Wallet(opts.privateKey);
    let hasConfirmed = false;

    for (const chain of evmChains as any[]) {
      const rpcUrl = getRpcForChain(chain, rpcs);
      if (!rpcUrl) {
        console.log(`\n[${chain.chainId}] No RPC found. Skipping.`);
        continue;
      }
      const tokens = Object.values(chain.assets || {});
      if (opts.dryRun) {
        await dryRunSweep(chain, rpcUrl, tokens, wallet);
      } else {
        if (!opts.force && !hasConfirmed) {
          const confirmed = await confirmProceed(evmChains);
          if (!confirmed) {
            console.log('\n❌ Aborted by user.');
            process.exit(0);
          }
          hasConfirmed = true;
        }
        await transferAll(chain, rpcUrl, tokens, wallet, opts.maxGasPrice);
      }
    }
    console.log('\n✅ Sweep complete!\n');
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }
})();
