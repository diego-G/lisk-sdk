/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
// tslint:disable-next-line no-reference
/// <reference path="../types/browserify-bignum/index.d.ts" />

import {
	bigNumberToBuffer,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	signData,
} from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import {
	BYTESIZES,
	MAX_TRANSACTION_AMOUNT,
	UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} from './constants';
import { SignatureObject } from './create_signature_object';
import {
	convertToTransactionError,
	TransactionError,
	TransactionMultiError,
	TransactionPendingError,
} from './errors';
import { createResponse, Status } from './response';
import { Account, TransactionJSON } from './transaction_types';
import {
	getId,
	validateSenderIdAndPublicKey,
	validateSignature,
	validateTransactionId,
	validator,
	verifyBalance,
	verifyMultiSignatures,
	verifySecondSignature,
	verifySenderId,
	verifySenderPublicKey,
} from './utils';
import * as schemas from './utils/validation/schema';

export interface TransactionResponse {
	readonly id: string;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
}

export interface StateStoreGetter<T> {
	get(key: string): T;
	find(func: (item: T) => boolean): T | undefined;
}

export interface StateStoreDefaultGetter<T> {
	getOrDefault(key: string): T;
}

export interface StateStoreSetter<T> {
	set(key: string, value: T): void;
}

export interface StateStore {
	readonly account: StateStoreGetter<Account> &
		StateStoreDefaultGetter<Account> &
		StateStoreSetter<Account>;
	readonly transaction: StateStoreGetter<TransactionJSON>;
}

export interface StateStoreCache<T> {
	cache(
		filterArray: ReadonlyArray<{ readonly [key: string]: string }>,
	): Promise<ReadonlyArray<T>>;
}

export interface StateStorePrepare {
	readonly account: StateStoreCache<Account>;
	readonly transaction: StateStoreCache<TransactionJSON>;
}

export enum MultisignatureStatus {
	UNKNOWN = 0,
	NONMULTISIGNATURE = 1,
	PENDING = 2,
	READY = 3,
	FAIL = 4,
}

export const ENTITY_ACCOUNT = 'account';
export const ENTITY_TRANSACTION = 'transaction';

export abstract class BaseTransaction {
	public readonly amount: BigNum;
	public readonly recipientId: string;
	public readonly blockId?: string;
	public readonly recipientPublicKey?: string;
	public readonly senderId: string;
	public readonly senderPublicKey: string;
	public readonly signatures: string[];
	public readonly timestamp: number;
	public readonly type: number;
	public readonly containsUniqueData?: boolean;
	public readonly fee: BigNum;
	public receivedAt?: Date;

	protected _id?: string;
	protected _signature?: string;
	protected _signSignature?: string;
	protected _multisignatureStatus: MultisignatureStatus =
		MultisignatureStatus.UNKNOWN;

	public abstract assetToJSON(): object;
	public abstract prepare(store: StateStorePrepare): Promise<void>;
	protected abstract assetToBytes(): Buffer;
	protected abstract validateAsset(): ReadonlyArray<TransactionError>;
	protected abstract applyAsset(
		store: StateStore,
	): ReadonlyArray<TransactionError>;
	protected abstract undoAsset(
		store: StateStore,
	): ReadonlyArray<TransactionError>;
	protected abstract verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError>;

	public constructor(rawTransaction: TransactionJSON) {
		const valid = validator.validate(schemas.transaction, rawTransaction);
		if (!valid) {
			throw new TransactionMultiError(
				'Invalid field types',
				rawTransaction.id,
				convertToTransactionError(rawTransaction.id || '', validator.errors),
			);
		}

		this.amount = new BigNum(rawTransaction.amount);
		this.fee = new BigNum(rawTransaction.fee);
		this._id = rawTransaction.id;
		this.recipientId = rawTransaction.recipientId || '';
		this.recipientPublicKey = rawTransaction.recipientPublicKey || '';
		this.senderId =
			rawTransaction.senderId ||
			getAddressFromPublicKey(rawTransaction.senderPublicKey);
		this.senderPublicKey = rawTransaction.senderPublicKey;
		this._signature = rawTransaction.signature;
		this.signatures = (rawTransaction.signatures as string[]) || [];
		this._signSignature = rawTransaction.signSignature;
		this.timestamp = rawTransaction.timestamp;
		this.type = rawTransaction.type;
		this.receivedAt = rawTransaction.receivedAt
			? new Date(rawTransaction.receivedAt)
			: undefined;
	}

	public get id(): string {
		if (!this._id) {
			throw new Error('id is required to be set before use');
		}

		return this._id;
	}

	public get signature(): string {
		if (!this._signature) {
			throw new Error('signature is required to be set before use');
		}

		return this._signature;
	}

	public get signSignature(): string | undefined {
		return this._signSignature;
	}

	public toJSON(): TransactionJSON {
		const transaction = {
			id: this.id,
			blockId: this.blockId,
			amount: this.amount.toString(),
			type: this.type,
			timestamp: this.timestamp,
			senderPublicKey: this.senderPublicKey,
			senderId: this.senderId,
			recipientId: this.recipientId,
			recipientPublicKey: this.recipientPublicKey,
			fee: this.fee.toString(),
			signature: this.signature,
			signSignature: this.signSignature ? this.signSignature : undefined,
			signatures: this.signatures,
			asset: this.assetToJSON(),
			receivedAt: this.receivedAt ? this.receivedAt.toISOString() : undefined,
		};

		return transaction;
	}

	public isReady(): boolean {
		return (
			this._multisignatureStatus === MultisignatureStatus.READY ||
			this._multisignatureStatus === MultisignatureStatus.NONMULTISIGNATURE
		);
	}

	public getBytes(): Buffer {
		const transactionBytes = Buffer.concat([
			this.getBasicBytes(),
			this._signature ? hexToBuffer(this._signature) : Buffer.alloc(0),
			this._signSignature ? hexToBuffer(this._signSignature) : Buffer.alloc(0),
		]);

		return transactionBytes;
	}

	public validate(): TransactionResponse {
		const errors = [...this._validateSchema(), ...this.validateAsset()];

		const transactionBytes = this.getBasicBytes();

		const {
			valid: signatureValid,
			error: verificationError,
		} = validateSignature(
			this.senderPublicKey,
			this.signature,
			transactionBytes,
			this.id,
		);

		if (!signatureValid && verificationError) {
			errors.push(verificationError);
		}

		return createResponse(this.id, errors);
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = this.verifyAgainstTransactions(transactions);

		return createResponse(this.id, errors);
	}

	public apply(store: StateStore): TransactionResponse {
		const sender = store.account.getOrDefault(this.senderId);
		const errors = this._verify(sender) as TransactionError[];

		// Verify MultiSignature
		const { errors: multiSigError } = this.processMultisignatures(store);
		if (multiSigError) {
			errors.push(...multiSigError);
		}

		const updatedBalance = new BigNum(sender.balance).sub(this.fee);
		const updatedSender = {
			...sender,
			balance: updatedBalance.toString(),
			publicKey: sender.publicKey || this.senderPublicKey,
		};
		store.account.set(updatedSender.address, updatedSender);
		const assetErrors = this.applyAsset(store);

		errors.push(...assetErrors);

		if (
			this._multisignatureStatus === MultisignatureStatus.PENDING &&
			errors.length === 1 &&
			errors[0] instanceof TransactionPendingError
		) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors,
			};
		}

		return createResponse(this.id, errors);
	}

	public undo(store: StateStore): TransactionResponse {
		const sender = store.account.getOrDefault(this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.fee);
		const updatedAccount = {
			...sender,
			balance: updatedBalance.toString(),
			publicKey: sender.publicKey || this.senderPublicKey,
		};
		const errors = updatedBalance.lte(MAX_TRANSACTION_AMOUNT)
			? []
			: [new TransactionError('Invalid balance amount', this.id)];
		store.account.set(updatedAccount.address, updatedAccount);
		const assetErrors = this.undoAsset(store);
		errors.push(...assetErrors);

		return createResponse(this.id, errors);
	}

	public addMultisignature(
		store: StateStore,
		signatureObject: SignatureObject,
	): TransactionResponse {
		const registerMultisigType = 4;
		// Get the account
		const account = store.account.get(this.senderId);
		// Check if signature is not already there
		if (this.signatures.includes(signatureObject.signature)) {
			return createResponse(this.id, [
				new TransactionError(
					`Signature '${
						signatureObject.signature
					}' already present in transaction.`,
					this.id,
				),
			]);
		}
		// Validate signature PK is part of the multisig account (do not check for registration type=4)
		if (
			this.type !== registerMultisigType &&
			account.membersPublicKeys &&
			!account.membersPublicKeys.includes(signatureObject.publicKey)
		) {
			return createResponse(this.id, [
				new TransactionError(
					`Public Key '${
						signatureObject.publicKey
					}' is not a member for account '${account.address}'.`,
					this.id,
				),
			]);
		}

		// Validate signature key belongs to pending transaction
		// tslint:disable-next-line
		const keysgroup = (this as any).asset.multisignature.keysgroup.map(
			(aKey: string) => aKey.slice(1),
		);
		if (!keysgroup.includes(signatureObject.publicKey)) {
			return createResponse(this.id, [
				new TransactionError(
					`Public Key '${
						signatureObject.publicKey
					}' is not a member for account '${account.address}'.`,
					this.id,
				),
			]);
		}

		// Validate the signature using the signature sender and transaction details
		const trsSignature = validateSignature(
			signatureObject.publicKey,
			signatureObject.signature,
			this.getBasicBytes(),
			this.id,
		);

		// If the signature is valid for the sender push it to the signatures array
		if (trsSignature.valid) {
			this.signatures.push(signatureObject.signature);
			this.processMultisignatures(store);
		}
		// Else pupulate errors
		const errors = trsSignature.valid
			? []
			: [
					new TransactionError(
						`Failed to add signature ${signatureObject.signature}.`,
						this.id,
						'.signatures',
					),
			  ];

		return createResponse(this.id, errors);
	}

	public addVerifiedMultisignature(signature: string): TransactionResponse {
		if (!this.signatures.includes(signature)) {
			this.signatures.push(signature);

			return createResponse(this.id, []);
		}

		return createResponse(this.id, [
			new TransactionError('Failed to add signature.', this.id, '.signatures'),
		]);
	}

	public processMultisignatures(store: StateStore): TransactionResponse {
		const sender = store.account.get(this.senderId);
		const transactionBytes = this.getBasicBytes();

		const { status, errors } = verifyMultiSignatures(
			this.id,
			sender,
			this.signatures,
			transactionBytes,
		);
		this._multisignatureStatus = status;
		if (this._multisignatureStatus === MultisignatureStatus.PENDING) {
			return {
				id: this.id,
				status: Status.PENDING,
				errors,
			};
		}

		return createResponse(this.id, errors);
	}

	public isExpired(date: Date = new Date()): boolean {
		if (!this.receivedAt) {
			this.receivedAt = new Date();
		}
		// tslint:disable-next-line no-magic-numbers
		const timeNow = Math.floor(date.getTime() / 1000);
		const timeOut =
			this._multisignatureStatus === MultisignatureStatus.PENDING ||
			this._multisignatureStatus === MultisignatureStatus.READY
				? UNCONFIRMED_MULTISIG_TRANSACTION_TIMEOUT
				: UNCONFIRMED_TRANSACTION_TIMEOUT;
		const timeElapsed =
			// tslint:disable-next-line no-magic-numbers
			timeNow - Math.floor(this.receivedAt.getTime() / 1000);

		return timeElapsed > timeOut;
	}

	public sign(passphrase: string, secondPassphrase?: string): void {
		this._signature = undefined;
		this._signSignature = undefined;
		this._signature = signData(hash(this.getBytes()), passphrase);
		if (secondPassphrase) {
			this._signSignature = signData(hash(this.getBytes()), secondPassphrase);
		}
		this._id = getId(this.getBytes());
	}

	protected getBasicBytes(): Buffer {
		const transactionType = Buffer.alloc(BYTESIZES.TYPE, this.type);
		const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
		transactionTimestamp.writeIntLE(this.timestamp, 0, BYTESIZES.TIMESTAMP);

		const transactionSenderPublicKey = hexToBuffer(this.senderPublicKey);

		const transactionRecipientID = this.recipientId
			? bigNumberToBuffer(this.recipientId.slice(0, -1), BYTESIZES.RECIPIENT_ID)
			: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

		const transactionAmount = this.amount.toBuffer({
			endian: 'little',
			size: BYTESIZES.AMOUNT,
		});

		return Buffer.concat([
			transactionType,
			transactionTimestamp,
			transactionSenderPublicKey,
			transactionRecipientID,
			transactionAmount,
			this.assetToBytes(),
		]);
	}

	private _verify(sender: Account): ReadonlyArray<TransactionError> {
		const secondSignatureTxBytes = Buffer.concat([
			this.getBasicBytes(),
			hexToBuffer(this.signature),
		]);

		// Verify Basic state
		return [
			verifySenderPublicKey(this.id, sender, this.senderPublicKey),
			verifySenderId(this.id, sender, this.senderId),
			verifyBalance(this.id, sender, this.fee),
			verifySecondSignature(
				this.id,
				sender,
				this.signSignature,
				secondSignatureTxBytes,
			),
		].filter(Boolean) as ReadonlyArray<TransactionError>;
	}

	private _validateSchema(): ReadonlyArray<TransactionError> {
		const transaction = this.toJSON();
		validator.validate(schemas.baseTransaction, transaction);
		const errors = convertToTransactionError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (
			!errors.find(
				(err: TransactionError) => err.dataPath === '.senderPublicKey',
			)
		) {
			// `senderPublicKey` passed format check, safely check equality to senderId
			const senderIdError = validateSenderIdAndPublicKey(
				this.id,
				this.senderId,
				this.senderPublicKey,
			);
			if (senderIdError) {
				errors.push(senderIdError);
			}
		}
		const idError = validateTransactionId(this.id, this.getBytes());
		if (idError) {
			errors.push(idError);
		}

		return errors;
	}
}
