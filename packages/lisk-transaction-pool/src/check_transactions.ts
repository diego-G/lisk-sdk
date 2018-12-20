import { Transaction } from './transaction_pool';

export type CheckerFunction = (
	transactions: ReadonlyArray<Transaction>,
) => CheckerFunctionResponse;

export interface CheckerFunctionResponse {
	status: Status;
	transactionsResponses: ReadonlyArray<TransactionResponse>;
}

export interface TransactionResponse {
	readonly errors: ReadonlyArray<Error>;
	readonly id: string;
	readonly status: Status;
}

export enum Status {
	FAIL,
	OK,
}

export interface CheckTransactionsResponse {
	failedTransactions: ReadonlyArray<Transaction>;
	passedTransactions: ReadonlyArray<Transaction>;
}

export const checkTransactions = async (
	transactions: ReadonlyArray<Transaction>,
	checkerFunction: CheckerFunction,
): Promise<CheckTransactionsResponse> => {
	// Process transactions and check their validity
	const { transactionsResponses } = await checkerFunction(transactions);

	// Get ids of failed transactions from the response
	const failedTransactionIds = transactionsResponses
		.filter(transactionResponse => transactionResponse.status === Status.FAIL)
		.map(transationStatus => transationStatus.id);

	// Filter transactions which were failed
	const failedTransactions = transactions.filter(transaction =>
		failedTransactionIds.includes(transaction.id),
	);
	// Filter transactions which were ok
	const passedTransactions = transactions.filter(
		transaction => !failedTransactionIds.includes(transaction.id),
	);

	return {
		failedTransactions,
		passedTransactions,
	};
};
