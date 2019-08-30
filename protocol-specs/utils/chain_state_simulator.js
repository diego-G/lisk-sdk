const {
	transfer,
	TransferTransaction,
	registerDelegate,
	DelegateTransaction,
} = require('@liskhq/lisk-transactions');
const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');

const { createBlock } = require('../utils/blocks');
const defaultConfig = require('../config/devnet');

class ChainStateSimulator {
	constructor(
		genesisBlock,
		initialAccountsStates,
		accounts,
		includeGenesisBlockInState = false,
	) {
		this.genesisBlock = genesisBlock;
		this.previousBlock = genesisBlock;
		this.state = {
			chain: includeGenesisBlockInState ? [this.genesisBlock] : [],
			accounts: cloneDeep(accounts),
			accountStore: [cloneDeep(initialAccountsStates)],
			initialAccountStore: cloneDeep(initialAccountsStates),
			pendingTransactions: [],
			appliedTransactions: [],
		};
		this.round = 0;
		this.slot = 0;
		this.fixedPoint = 10 ** 8;
	}

	transfer(amount) {
		return {
			from: addressFrom => ({
				to: addressTo => {
					const amountBedows = `${amount * this.fixedPoint}`;
					const transferTx = new TransferTransaction(
						transfer({
							amount: amountBedows,
							passphrase: Object.values(this.state.accounts).find(
								anAccount => anAccount.address === addressFrom,
							).passphrase,
							recipientId: Object.values(this.state.accounts).find(
								anAccount => anAccount.address === addressTo,
							).address,
						}),
					);
					// Push it to pending transaction
					this.state.pendingTransactions.push(transferTx);
					// Update accounts
					this.updateAccountBalancesAfterTransfer(
						addressFrom,
						addressTo,
						amountBedows,
					);
					return this;
				},
			}),
		};
	}

	registerDelegate(delegateName) {
		return {
			for: delegateAddress => {
				const amountBedows = `${25 * this.fixedPoint}`;

				const registerDelegateTx = new DelegateTransaction(
					registerDelegate({
						username: delegateName,
						passphrase: Object.values(this.state.accounts).find(
							anAccount => anAccount.address === delegateAddress,
						).passphrase,
					}),
				);
				// Push it to pending transaction
				this.state.pendingTransactions.push(registerDelegateTx);
				this.updateAccountStateAfterDelegateRegistration(
					delegateAddress,
					amountBedows,
					delegateName,
				);
				return this;
			},
		};
	}

	// Forge a block with pending transactions. If empty is set to true it can be used
	// to signal a block that should be empty due to invalid transactions
	forge(invalidBlock = false) {
		const latestsAccountState = this.state.accountStore.slice(-1)[0];

		let transactionsToBeIncluded = [...this.state.pendingTransactions];

		if (invalidBlock) {
			transactionsToBeIncluded = [];
			this.state.accountStore.pop();
		}

		const newBlock = createBlock(
			defaultConfig,
			latestsAccountState,
			this.previousBlock,
			this.round,
			this.slot,
			{
				version: 1,
				transactions: transactionsToBeIncluded,
			},
		);

		this.state.chain.push(newBlock);
		this.previousBlock = newBlock;
		this.state.appliedTransactions.push(transactionsToBeIncluded);
		this.state.pendingTransactions = [];
		return this;
	}

	getScenario() {
		return {
			initialAccountsState: this.state.initialAccountStore,
			finalAccountsState: this.state.accountStore,
			chain: this.state.chain,
		};
	}

	updateAccountBalancesAfterTransfer(from, to, amount) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);
		const sender = this.findAccountByAddress(from, newAccountStoreState);
		const recipient = this.findAccountByAddress(to, newAccountStoreState);

		if (!sender) {
			throw new Error(
				'Sender does not exists so it would not be possible to transfer form this account. Check the values passed to the constructor',
			);
		}

		if (!sender && !recipient) {
			throw new Error(
				'Both sender and recipient were not found in the account store state. This means that something is wrong with the values passed to the constructor.',
			);
		}

		// Update sender balance
		sender.balance = parseInt(
			new BigNum(sender.balance.toString()).sub(amount).toString(),
			10,
		);

		// If recipient does not exists create the account
		if (!recipient) {
			const newAccount = this.newAccountFromTemplate(
				Object.values(this.state.accounts).find(
					anAccount => anAccount.address === to,
				),
			);
			newAccount.balance = parseInt(
				new BigNum(newAccount.balance.toString()).add(amount).toString(),
				10,
			);
			newAccountStoreState.push(newAccount);
		} else {
			recipient.balance = parseInt(
				new BigNum(recipient.balance.toString()).add(amount).toString(),
				10,
			);
		}

		this.state.accountStore.push(newAccountStoreState);
	}

	updateAccountStateAfterDelegateRegistration(from, amount, delegateName) {
		const newAccountStoreState = cloneDeep(
			this.state.accountStore.slice(-1)[0],
		);

		const sender = this.findAccountByAddress(from, newAccountStoreState);

		if (!sender) {
			throw new Error(
				'Sender does not exists so it would not be possible to transfer from this account. Check the values passed to the constructor',
			);
		}
		// Update sender balance
		sender.balance = parseInt(
			new BigNum(sender.balance.toString()).sub(amount).toString(),
			10,
		);
		sender.username = delegateName;
		sender.isDelegate = true;

		this.state.accountStore.push(newAccountStoreState);
	}

	// eslint-disable-next-line
	findAccountByAddress(address, collection) {
		return collection.find(anAccount => anAccount.address === address);
	}

	// eslint-disable-next-line
	newAccountFromTemplate(account) {
		return {
			address: account.address,
			publicKey: account.publicKey,
			secondPublicKey: null,
			username: '',
			isDelegate: false,
			secondSignature: false,
			balance: 0,
			multiMin: 0,
			multiLifetime: 0,
			nameExist: false,
			missedBlocks: 0,
			producedBlocks: 0,
			rank: 0,
			fees: 0,
			rewards: 0,
			vote: 0,
			productivity: 0,
		};
	}
}

module.exports = ChainStateSimulator;
