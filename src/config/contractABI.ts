export const WALLET_SWEEPER_ABI = [
  {
    type: 'function',
    name: 'sweep',
    inputs: [
      { name: 'tokens', type: 'address[]' },
      { name: 'destination', type: 'address' },
      { name: 'minGasBuffer', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sweepNative',
    inputs: [
      { name: 'destination', type: 'address' },
      { name: 'minGasBuffer', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sweepToken',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'destination', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Sweep',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'destination', type: 'address', indexed: true },
      { name: 'tokens', type: 'address[]' },
      { name: 'nativeAmount', type: 'uint256' },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const;
