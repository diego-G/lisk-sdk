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
import * as BigNum from 'browserify-bignum';
import { expect } from 'chai';
import {
	verifySenderPublicKey,
	verifySenderId,
	verifyBalance,
	verifySecondSignatureWhenNotNeeded,
	verifySecondSignature,
	verifyMultiSignature,
} from '../../src/utils';
import * as validator from '../../src/utils/sign_and_verify';
import { TransactionError, TransactionPendingError } from '../../src/errors';
import { MultisignatureStatus } from '../../src/transactions';

describe('#verify', () => {
	const defaultId = '4838520211125422557';

	describe('#verifySenderPublicKey', () => {
		it('should return undefined when sender public key and public key is the same', async () => {
			const publicKey = 'sender-public-key';
			expect(verifySenderPublicKey(defaultId, { publicKey } as any, publicKey))
				.to.be.undefined;
		});

		it('should return TransactionError when sender public key and account public key is not the same', async () => {
			const publicKey = 'sender-public-key';
			expect(
				verifySenderPublicKey(
					defaultId,
					{ publicKey } as any,
					'different public key',
				),
			)
				.to.be.instanceOf(TransactionError)
				.and.have.property('dataPath', '.senderPublicKey');
		});
	});

	describe('#verifySenderId', () => {
		const defaultAddress = '15610000000000000000L';

		it('should return undefined when sender id and address is the same', async () => {
			const address = '15610000000000000000L';
			expect(
				verifySenderId(defaultId, { address: defaultAddress } as any, address),
			).to.be.undefined;
		});

		it('should return undefined when sender id has lower case', async () => {
			const address = '15610000000000000000l';
			expect(
				verifySenderId(defaultId, { address: defaultAddress } as any, address),
			).to.be.undefined;
		});

		it('should return TransactionError when sender id and account address is not the same', async () => {
			const address = '15610000000000005555L';
			expect(
				verifySenderId(defaultId, { address: defaultAddress } as any, address),
			)
				.to.be.instanceOf(TransactionError)
				.and.have.property('dataPath', '.senderId');
		});
	});

	describe('#verifyBalance', () => {
		const defaultAccount = { balance: '1000000000' } as any;
		it('should return undefined when sender has exact amount', async () => {
			expect(verifyBalance(defaultId, defaultAccount, new BigNum('1000000000')))
				.to.be.undefined;
		});

		it('should return undefined when sender has enoguh balance', async () => {
			expect(verifyBalance(defaultId, defaultAccount, new BigNum('100'))).to.be
				.undefined;
		});

		it('should return TransactionError when sender does not have enoguh balance', async () => {
			expect(verifyBalance(defaultId, defaultAccount, new BigNum('1000000001')))
				.to.be.instanceOf(TransactionError)
				.and.have.property('dataPath', '.balance');
		});
	});

	describe('#verifySecondSignatureWhenNotNeeded', () => {
		const defaultAccount = { balance: '1000000000' } as any;
		it('should return undefined when sender has no second signature and signSignature is undefined', async () => {
			expect(
				verifySecondSignatureWhenNotNeeded(
					defaultId,
					defaultAccount,
					undefined,
				),
			).to.be.undefined;
		});

		it('should return undefined when sender has second signature and signSignature is not undefined', async () => {
			expect(
				verifySecondSignatureWhenNotNeeded(
					defaultId,
					{ ...defaultAccount, secondPublicKey: 'second-public-key' },
					'second-public-key',
				),
			).to.be.undefined;
		});

		it('should return TransactionError when sender does not have second signature but signSignature is provided', async () => {
			expect(
				verifySecondSignatureWhenNotNeeded(
					defaultId,
					defaultAccount,
					'second-public-key',
				),
			)
				.to.be.instanceOf(TransactionError)
				.and.have.property('dataPath', '.signSignature');
		});
	});

	describe('#verifySecondSignature', () => {
		const defaultAccount = { balance: '1000000000' } as any;
		const defaultPublicKey = 'default-public-key';
		const defaultSignSignature = 'default-sign-signature';
		const fakeTransactionBuffer = Buffer.from(
			'fake transaction buffer',
			'utf8',
		);
		const successResult = { valid: true, error: undefined };
		const failResult = { valid: false, error: new TransactionError('fail') };

		beforeEach(async () => {
			sandbox.stub(validator, 'validateSignature').returns(successResult);
		});

		afterEach(() => sandbox.restore());

		it('should return undefined when sender does not have second public key', async () => {
			expect(
				verifySecondSignature(
					defaultId,
					defaultAccount,
					defaultSignSignature,
					fakeTransactionBuffer,
				),
			).to.be.undefined;
		});

		it('should call validateSignature with currect arguments', async () => {
			verifySecondSignature(
				defaultId,
				{ ...defaultAccount, secondPublicKey: defaultPublicKey },
				defaultSignSignature,
				fakeTransactionBuffer,
			);
			expect(validator.validateSignature).to.be.calledWithExactly(
				defaultPublicKey,
				defaultSignSignature,
				fakeTransactionBuffer,
				defaultId,
			);
		});

		it('should return undefined when valid', async () => {
			expect(
				verifySecondSignature(
					defaultId,
					{ ...defaultAccount, secondPublicKey: defaultPublicKey },
					defaultSignSignature,
					fakeTransactionBuffer,
				),
			).to.be.undefined;
		});

		it('should return error from validateSignature when not valid', async () => {
			(validator.validateSignature as any).returns(failResult);
			expect(
				verifySecondSignature(
					defaultId,
					{ ...defaultAccount, secondPublicKey: defaultPublicKey },
					defaultSignSignature,
					fakeTransactionBuffer,
				),
			).to.equal(failResult.error);
		});

		it('should return TransactionError when sender have second public key but signSignature is not provided', async () => {
			expect(
				verifySecondSignature(
					defaultId,
					{ ...defaultAccount, secondPublicKey: defaultPublicKey },
					undefined,
					fakeTransactionBuffer,
				),
			)
				.to.be.instanceOf(TransactionError)
				.and.have.property('dataPath', '.signSignature');
		});
	});

	describe('#verifyMultiSignature', () => {
		const defaultAccount = {
			address: '123L',
			multisignatures: [
				'c465d74511c2bfd136cf9764172acd3c1514fa7ad76475e03bc91cf679757a5a',
				'c465d74511c2bfd136cf9764172acd3c1514fa7ad76475e03bc91cf679757a5b',
				'c465d74511c2bfd136cf9764172acd3c1514fa7ad76475e03bc91cf679757a5c',
			],
			multimin: 3,
		};
		const signatures = [
			'00ef8fcf4e1815def245ad32d0d0e3e86993a4029c41e8ca1dc2674c9794d31cefc2226ac539dea8049c7085fdcb29768389b96104ac05a0ddabfb8b523af409',
			'00ef8fcf4e1815def245ad32d0d0e3e86993a4029c41e8ca1dc2674c9794d31cefc2226ac539dea8049c7085fdcb29768389b96104ac05a0ddabfb8b523af400',
			'00ef8fcf4e1815def245ad32d0d0e3e86993a4029c41e8ca1dc2674c9794d31cefc2226ac539dea8049c7085fdcb29768389b96104ac05a0ddabfb8b523af401',
		];
		const successResult = { valid: true, errors: [] };
		const pendingResult = {
			valid: false,
			errors: [new TransactionPendingError('fail')],
		};
		const failResult = { valid: false, errors: [new TransactionError('fail')] };
		const fakeTransactionBuffer = Buffer.from(
			'fake transaction buffer',
			'utf8',
		);

		beforeEach(async () => {
			sandbox.stub(validator, 'validateMultisignatures').returns(successResult);
		});

		afterEach(() => sandbox.restore());

		it('should return NONMULTISIGNATURE status without error if sender is not multi-signature account', async () => {
			const { status, errors } = verifyMultiSignature(
				defaultId,
				{} as any,
				signatures,
				fakeTransactionBuffer,
			);
			expect(status).to.equal(MultisignatureStatus.NONMULTISIGNATURE);
			expect(errors).to.be.empty;
		});

		it('should call validateMultisignature with correct argument', async () => {
			verifyMultiSignature(
				defaultId,
				defaultAccount as any,
				signatures,
				fakeTransactionBuffer,
			);
			expect(validator.validateMultisignatures).to.be.calledWithExactly(
				defaultAccount.multisignatures,
				signatures,
				defaultAccount.multimin,
				fakeTransactionBuffer,
				defaultId,
			);
		});

		it('should return READY status without error if transaction is valid', async () => {
			const { status, errors } = verifyMultiSignature(
				defaultId,
				defaultAccount as any,
				signatures,
				fakeTransactionBuffer,
			);
			expect(status).to.equal(MultisignatureStatus.READY);
			expect(errors).to.be.empty;
		});

		it('should return PENDING status with pending error if only error is the pending error', async () => {
			(validator.validateMultisignatures as any).returns(pendingResult);
			const { status, errors } = verifyMultiSignature(
				defaultId,
				defaultAccount as any,
				signatures,
				fakeTransactionBuffer,
			);
			expect(status).to.equal(MultisignatureStatus.PENDING);
			expect(errors).not.to.be.empty;
			expect(errors[0]).to.be.instanceOf(TransactionPendingError);
		});

		it('should return FAIL status with errors', async () => {
			(validator.validateMultisignatures as any).returns(failResult);
			const { status, errors } = verifyMultiSignature(
				defaultId,
				defaultAccount as any,
				signatures,
				fakeTransactionBuffer,
			);
			expect(status).to.equal(MultisignatureStatus.FAIL);
			expect(errors).to.eql(failResult.errors);
		});
	});
});
