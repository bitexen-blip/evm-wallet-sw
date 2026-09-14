# EVM Wallet Sweeper

A CLI for decommissioning operational wallets. Sweeps all token and native balances from an EOA (Externally Owned Account) across every EVM chain in the shared chain config into a single destination address — with a dry-run mode, a confirmation prompt, and a max-gas-price guard.

Built to retire and consolidate operational wallets safely: rotating a key, winding down a deployment, or collecting scattered balances back to one address without checking twenty explorers by hand.

## Features
- 🔗 **Multi-chain**: Supports all EVM chains defined in [everclear.json](https://raw.githubusercontent.com/connext/chaindata/main/everclear.json)
- 🪙 **Token + Native**: Transfers all non-native tokens first, then the native token
- 🧪 **Dry-run mode**: Simulate all actions without sending transactions (`--dry-run`)
- 🛡️ **Safety features**:
  - Confirmation prompt before sending real transactions
  - `--force` flag to skip confirmation
  - `--max-gas-price` to skip chains with high gas
- ⚡ **Automatic RPC selection**: Uses up-to-date RPCs from [chainlist.org](https://chainlist.org/rpcs.json)
- 🚦 **Logs all actions and errors**

## Requirements
- Node.js 18+
- Yarn (for monorepo/workspace install)
- Ethers v6

## Installation
From the monorepo root:
```bash
yarn install
```

## Usage

### Dry-run (no transactions sent)
```bash
yarn start --private-key <PRIVATE_KEY> --out <DEST_ADDRESS> --dry-run
```

### Real transfers (with confirmation prompt)
```bash
yarn start --private-key <PRIVATE_KEY> --out <DEST_ADDRESS>
```

### Real transfers (skip confirmation)
```bash
yarn start --private-key <PRIVATE_KEY> --out <DEST_ADDRESS> --force
```

### Limit max gas price (in gwei)
```bash
yarn start --private-key <PRIVATE_KEY> --out <DEST_ADDRESS> --max-gas-price 30
```

### Skip ERC20 (non-native) token transfers
```bash
yarn start --private-key <PRIVATE_KEY> --out <DEST_ADDRESS> --skip-erc20
```

## CLI Options
- `-k, --private-key <key>`: Private key of the EOA to sweep (**required**)
- `-o, --out <address>`: Destination address to receive funds (**required**)
- `--dry-run`: Simulate actions without sending transactions (default: false)
- `--force`: Skip confirmation prompt and proceed with transfers (default: false)
- `--max-gas-price <gwei>`: Maximum gas price (in gwei) for transactions (optional)
- `--skip-erc20`: Skip transferring non-native (ERC20) tokens (default: false)

## Safety Notes

This tool moves funds irreversibly, so it is built to be hard to misfire:

- **`--dry-run` simulates every transfer** — balances, amounts and destinations — without sending anything. Always run it first.
- **A confirmation prompt lists every chain about to be swept** and the destination address, and requires typing `yes`. `--force` skips it, and is an explicit opt-out rather than a default.
- **`--max-gas-price` skips chains where gas has spiked**, so a sweep during a congestion spike does not burn value in fees.
- **Every action and error is logged** to the console.

## License
MIT

## Attribution
Everclear Team 