// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title WalletSweeper
 * @notice Contract to sweep tokens and native currency from a wallet to a destination
 * @dev User approves this contract to transfer their tokens, then calls sweep function
 */
contract WalletSweeper {
    error UnauthorizedCaller();
    error TransferFailed();
    error InsufficientBalance();

    event Sweep(
        address indexed user,
        address indexed destination,
        address[] tokens,
        uint256 nativeAmount
    );

    /**
     * @notice Sweep all tokens and native currency to destination
     * @param tokens Array of token addresses to sweep (empty array to skip tokens)
     * @param destination Address to receive swept funds
     * @param minGasBuffer Minimum gas to keep in the wallet (in wei)
     */
    function sweep(
        address[] calldata tokens,
        address payable destination,
        uint256 minGasBuffer
    ) external {
        if (destination == address(0)) revert TransferFailed();

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            if (token == address(0)) continue;

            IERC20 erc20 = IERC20(token);
            uint256 balance = erc20.balanceOf(msg.sender);

            if (balance > 0) {
                bool success = erc20.transferFrom(msg.sender, destination, balance);
                if (!success) revert TransferFailed();
            }
        }

        uint256 nativeBalance = address(this).balance;
        if (nativeBalance > minGasBuffer) {
            uint256 amountToSend = nativeBalance - minGasBuffer;
            (bool success, ) = destination.call{value: amountToSend}('');
            if (!success) revert TransferFailed();
        }

        emit Sweep(msg.sender, destination, tokens, nativeBalance);
    }

    /**
     * @notice Sweep only native currency to destination
     * @param destination Address to receive swept funds
     * @param minGasBuffer Minimum gas to keep in the wallet (in wei)
     */
    function sweepNative(
        address payable destination,
        uint256 minGasBuffer
    ) external {
        if (destination == address(0)) revert TransferFailed();

        uint256 nativeBalance = address(this).balance;
        if (nativeBalance > minGasBuffer) {
            uint256 amountToSend = nativeBalance - minGasBuffer;
            (bool success, ) = destination.call{value: amountToSend}('');
            if (!success) revert TransferFailed();
        }

        emit Sweep(msg.sender, destination, new address[](0), nativeBalance);
    }

    /**
     * @notice Sweep single token to destination
     * @param token Address of the token to sweep
     * @param destination Address to receive swept funds
     */
    function sweepToken(
        address token,
        address payable destination
    ) external {
        if (token == address(0) || destination == address(0)) revert TransferFailed();

        IERC20 erc20 = IERC20(token);
        uint256 balance = erc20.balanceOf(msg.sender);

        if (balance > 0) {
            bool success = erc20.transferFrom(msg.sender, destination, balance);
            if (!success) revert TransferFailed();
        }

        address[] memory tokens = new address[](1);
        tokens[0] = token;
        emit Sweep(msg.sender, destination, tokens, 0);
    }

    receive() external payable {}
}
