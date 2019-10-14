import { Transaction } from './transaction_pool';

export type TransactionFilterableKeys =
	| 'id'
	| 'recipientId'
	| 'senderPublicKey'
	| 'type';

export const checkTransactionPropertyForValues = (
	values: ReadonlyArray<string | number>,
	propertyName: TransactionFilterableKeys,
): ((transaction: Transaction) => boolean) => (transaction: Transaction) => {
	if (propertyName === 'recipientId') {
		return transaction.asset.recipientId &&
			typeof transaction.asset.recipientId === 'string'
			? values.includes(transaction.asset.recipientId)
			: false;
	}

	return values.includes(transaction[propertyName]);
};

export const returnTrueUntilLimit = (
	limit: number,
): ((transaction: Transaction) => boolean) => {
	// tslint:disable-next-line:no-let
	let current = 0;

	// tslint:disable-next-line:increment-decrement
	return _ => current++ < limit;
};

export const checkTransactionForExpiry = (): ((
	transaction: Transaction,
) => boolean) => {
	const timeNow = new Date();

	return (transaction: Transaction) => transaction.isExpired(timeNow);
};

export const checkTransactionForSenderPublicKey = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const senderProperty: TransactionFilterableKeys = 'senderPublicKey';
	const senderPublicKeys = transactions.map(
		transaction => transaction[senderProperty],
	);

	return checkTransactionPropertyForValues(senderPublicKeys, senderProperty);
};

export const checkTransactionForId = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const idProperty: TransactionFilterableKeys = 'id';
	const ids = transactions.map(transaction => transaction.id);

	return checkTransactionPropertyForValues(ids, idProperty);
};

export const checkTransactionForSenderPublicKeyWithRecipientIds = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const recipientProperty: TransactionFilterableKeys = 'recipientId';
	const senderPublicKey: TransactionFilterableKeys = 'senderPublicKey';
	const recipients = transactions
		.map(transaction => transaction.asset[recipientProperty])
		.filter(id => id !== undefined) as ReadonlyArray<string>;

	return checkTransactionPropertyForValues(recipients, senderPublicKey);
};

export const checkTransactionForTypes = (
	transactions: ReadonlyArray<Transaction>,
): ((transaction: Transaction) => boolean) => {
	const typeProperty: TransactionFilterableKeys = 'type';
	const types: ReadonlyArray<number> = transactions.map(
		(transaction: Transaction) => transaction[typeProperty],
	);

	return checkTransactionPropertyForValues(types, typeProperty);
};
