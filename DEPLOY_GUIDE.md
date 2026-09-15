# WalletSweeper Smart Contract Deployment Guide

This guide walks you through deploying the `WalletSweeper.sol` contract to all supported EVM chains.

## Prerequisites

- Node.js 18+
- A private key with funds on each chain (for deployment gas)
- Foundry or Hardhat installed
- `.env` file configured with deployment parameters

## Quick Deploy (Using Foundry)

### 1. Install Dependencies

```bash
npm install
# or if using foundry
forge install
```

### 2. Configure Environment

Create a `.env` file with your private key:

```bash
PRIVATE_KEY=0x... # Your deployment account private key
ETHERSCAN_API_KEY=... # For verification (optional)
```

### 3. Deploy to All Chains

Use the provided deployment script:

```bash
# Deploy to all supported chains
npm run deploy:all

# Or deploy to specific chain
npm run deploy:eth
npm run deploy:polygon
npm run deploy:arbitrum
# ... etc
```

## Manual Deployment (Hardhat)

### 1. Compile Contract

```bash
npx hardhat compile
```

### 2. Deploy to Specific Chain

```bash
# Ethereum Mainnet
WALLET_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network ethereum

# Polygon
WALLET_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network polygon

# Arbitrum
WALLET_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network arbitrum
```

### 3. Verify on Block Explorer

```bash
# Verify on Etherscan
npx hardhat verify --network ethereum <CONTRACT_ADDRESS>
```

## Supported Chains & RPC Endpoints

| Chain | Chain ID | RPC Endpoint | Explorer |
|-------|----------|--------------|----------|
| Ethereum | 1 | https://eth.rpc.blxrbdn.com | https://etherscan.io |
| Sepolia | 11155111 | https://eth-sepolia.public.blastapi.io | https://sepolia.etherscan.io |
| Polygon | 137 | https://polygon-rpc.com | https://polygonscan.com |
| Optimism | 10 | https://mainnet.optimism.io | https://optimistic.etherscan.io |
| Arbitrum | 42161 | https://arb1.arbitrum.io/rpc | https://arbiscan.io |
| Base | 8453 | https://mainnet.base.org | https://basescan.org |
| Avalanche | 43114 | https://api.avax.network/ext/bc/C/rpc | https://snowscan.xyz |
| BSC | 56 | https://bsc-dataseed1.binance.org:8545 | https://bscscan.com |
| Fantom | 250 | https://rpc.ftm.tools | https://ftmscan.com |
| Gnosis | 100 | https://rpc.gnosischain.com | https://gnosisscan.io |
| Celo | 42220 | https://forno.celo.org | https://celoscan.io |
| Moonbeam | 1284 | https://rpc.api.moonbeam.network | https://moonscan.io |
| zkSync | 324 | https://mainnet.era.zksync.io | https://explorer.zksync.io |
| Linea | 59144 | https://rpc.linea.build | https://lineascan.build |
| Scroll | 534352 | https://rpc.scroll.io | https://scrollscan.com |

## After Deployment

### 1. Update .env Configuration

After deploying to each chain, update `.env` with the contract addresses:

```bash
VITE_WALLET_SWEEPER_1=0x... # Ethereum
VITE_WALLET_SWEEPER_137=0x... # Polygon
VITE_WALLET_SWEEPER_42161=0x... # Arbitrum
# ... etc for all chains
```

### 2. Verify Backend Recognizes Contracts

```bash
curl http://localhost:3001/api/chains
```

You should see `contractDeployed: true` for chains with deployed contracts.

### 3. Test Sweep

1. Start the app:
   ```bash
   npm run dev:all
   ```

2. Connect wallet
3. Check balances
4. Select chains with contracts deployed
5. Execute sweep

## Gas Cost Estimates

Estimated deployment gas costs (in USD, at typical gas prices):

- **Ethereum**: $150-300
- **Polygon**: $10-20
- **Arbitrum**: $20-50
- **Optimism**: $30-60
- **Other L2s**: $10-30 each

**Total for all 30+ chains**: $500-1000 (approximate)

## Troubleshooting

### "Insufficient funds for gas"

- Your deployment account doesn't have enough native tokens on the chain
- Add funds from a centralized exchange or bridge

### "Invalid RPC URL"

- The RPC endpoint is down or invalid
- Try an alternative RPC provider
- Check hardhat.config.ts for correct network configuration

### "Contract verification failed"

- Make sure ETHERSCAN_API_KEY is set in .env
- Some chains don't have Etherscan support (use block explorer directly)
- Verify contract manually on the explorer

## Contract Functions

Once deployed, users can call:

```solidity
// Sweep all tokens and native currency
function sweep(
  address[] calldata tokens,
  address payable destination,
  uint256 minGasBuffer
) external

// Sweep only native currency
function sweepNative(
  address payable destination,
  uint256 minGasBuffer
) external

// Sweep single token
function sweepToken(
  address token,
  address payable destination
) external
```

## Security Notes

- ✅ Contract has no owner/admin functions
- ✅ Each user can only sweep their own tokens
- ✅ Destination address is specified per transaction
- ✅ Gas buffer protection prevents running out of gas
- ⚠️ Always test on testnet first (Sepolia, Mumbai, etc.)
- ⚠️ Audit recommended before mainnet deployment

## Next Steps

1. Deploy contract to all chains
2. Update `.env` with contract addresses
3. Run integration tests
4. Launch frontend to production
