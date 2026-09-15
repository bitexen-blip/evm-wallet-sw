# EVM Wallet Sweeper - Web dApp Edition

A modern web application for sweeping all tokens and native balances from an EOA (Externally Owned Account) across multiple EVM-compatible chains to a single destination address.

## Features

✨ **Modern Web UI** - Built with React, Vite, and Tailwind CSS

🔗 **dApp Integration** - Connect with MetaMask, WalletConnect, and other EVM wallets via RainbowKit

⛓️ **Multi-Chain Support** - Sweep from Ethereum, Polygon, Optimism, Arbitrum, Base, Avalanche, and more

💰 **Token Detection** - Automatically detects and displays all ERC20 tokens and native coins

🔒 **Smart Contract** - Secure sweep contract for single-transaction approval

🚀 **Fast & Efficient** - Minimal gas fees with optimized transaction batching

## Architecture

```
┌─────────────────────────────────────────┐
│     Web UI (React + Vite)               │
│  - Connect Wallet (RainbowKit)          │
│  - Balance Checker                      │
│  - Sweep Form                           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     Backend (Express + TypeScript)      │
│  - Balance API                          │
│  - Sweep Coordinator                    │
│  - Chain Configuration                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     Smart Contract (WalletSweeper.sol)  │
│  - Token Transfers                      │
│  - Native Currency Sweep                │
│  - Single-Signature Approval            │
└─────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- A Web3 wallet (MetaMask, Trust Wallet, etc.)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/hom1109000-droid/evm-wallet-sw.git
   cd evm-wallet-sw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your WalletConnect Project ID
   ```

4. **Get WalletConnect Project ID**
   - Go to https://cloud.walletconnect.com/
   - Sign up/login
   - Create a new project
   - Copy the Project ID to `.env`

## Development

### Run both frontend and backend
```bash
npm run dev:all
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Run only frontend
```bash
npm run dev
```

### Run only backend
```bash
npm run server
```

## Usage

1. **Connect Your Wallet**
   - Click "Connect Wallet" button
   - Select your preferred wallet (MetaMask, WalletConnect, etc.)
   - Approve the connection

2. **Check Balances**
   - Click "Check Balances" to scan all chains
   - View your tokens and native coins

3. **Configure Sweep**
   - Enter destination address
   - Select chains to sweep from
   - Or use "Select All" for all chains

4. **Execute Sweep**
   - Click "🔄 Sweep Wallet"
   - Confirm in your wallet
   - Monitor transaction progress

## Smart Contract Functions

### sweep()
Sweeps multiple ERC20 tokens and native currency in a single transaction.

```solidity
function sweep(
    address[] calldata tokens,
    address payable destination,
    uint256 minGasBuffer
) external
```

### sweepNative()
Sweeps only native currency to destination.

```solidity
function sweepNative(
    address payable destination,
    uint256 minGasBuffer
) external
```

### sweepToken()
Sweeps a single ERC20 token to destination.

```solidity
function sweepToken(
    address token,
    address payable destination
) external
```

## API Endpoints

### GET `/api/balances/:address`
Fetch balances across all EVM chains

**Response:**
```json
{
  "1": {
    "nativeBalance": "1.5",
    "nativeSymbol": "ETH",
    "tokens": [
      {
        "address": "0x...",
        "symbol": "USDC",
        "balance": "1000",
        "decimals": 6
      }
    ]
  }
}
```

### POST `/api/sweep`
Initiate wallet sweep

**Request:**
```json
{
  "sourceAddress": "0x...",
  "destinationAddress": "0x...",
  "chains": [1, 137, 10]
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "message": "Sweep initiated"
}
```

## Configuration

### Supported Chains

Default chains in `src/ui/wagmi.ts`:
- Ethereum (1)
- Sepolia (11155111)
- Polygon (137)
- Optimism (10)
- Arbitrum (42161)
- Base (8453)

Add more chains by modifying the `chains` array in the wagmi config.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Private Keys**: Never enter your private key in the web interface
2. **Smart Contract**: Audit the contract before deploying to mainnet
3. **Gas Limits**: The contract includes gas buffer protection
4. **Approvals**: Always verify token approvals before signing
5. **Destination**: Double-check destination address before confirming

## Troubleshooting

### "No RPC found for this chain"
The balance checker couldn't find an RPC endpoint for that chain. Check your internet connection.

### "Gas price too high"
You can set a max gas price option in the sweep configuration.

### Transaction stuck
Check the transaction hash on a block explorer. You may need to increase gas price or wait for network congestion to decrease.

## Building for Production

```bash
# Build frontend
npm run build

# Output will be in dist-ui/
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is provided as-is. Use at your own risk. Always test on testnet first before using on mainnet. The developers are not responsible for any loss of funds.
