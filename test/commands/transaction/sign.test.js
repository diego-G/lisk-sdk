/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { test } from '@oclif/test';
import * as elements from 'lisk-elements';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as inputUtils from '../../../src/utils/input/utils';
import * as getInputsFromSources from '../../../src/utils/input';

describe('transaction:sign', () => {
	const defaultTransaction = {
		amount: '10000000000',
		recipientId: '123L',
		senderPublicKey: null,
		timestamp: 66492418,
		type: 0,
		fee: '10000000',
		recipientPublicKey: null,
		asset: {},
	};
	const invalidTransaction = 'invalid transaction';
	const defaultInputs = {
		passphrase: '123',
		secondPassphrase: '456',
	};

	const defaultSignedTransaction = Object.assign({}, defaultTransaction, {
		signature: 'signed',
	});

	const transactionUtilStub = {
		prepareTransaction: sandbox.stub().returns(defaultSignedTransaction),
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(elements.default.transaction, 'utils', transactionUtilStub)
			.stub(
				getInputsFromSources,
				'default',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('transaction:sign', () => {
		setupTest()
			.stub(
				inputUtils,
				'getRawStdIn',
				sandbox.stub().rejects(new Error('Timeout error')),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error');
	});

	describe('transaction:sign transaction', () => {
		setupTest()
			.command(['transaction:sign', invalidTransaction])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error');

		setupTest()
			.command(['transaction:sign', JSON.stringify(defaultTransaction)])
			.it('should take transaction from arg to sign', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: null,
				});
				expect(transactionUtilStub.prepareTransaction).to.be.calledWithExactly(
					defaultTransaction,
					defaultInputs.passphrase,
					defaultInputs.secondPassphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction:sign transaction --passphrase=pass:123', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
			])
			.it(
				'should take transaction from arg and passphrase from flag to sign',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: null,
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction:sign transaction --passphrase=pass:123 --second-passphrase=pass:456', () => {
		setupTest()
			.command([
				'transaction:sign',
				JSON.stringify(defaultTransaction),
				'--passphrase=pass:123',
				'--second-passphrase=pass:456',
			])
			.it(
				'should take transaction from arg and passphrase and second passphrase from flag to sign',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:456',
							repeatPrompt: true,
						},
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign', () => {
		setupTest()
			.stub(inputUtils, 'getRawStdIn', sandbox.stub().resolves([]))
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain('No transaction was provided.');
			})
			.it('should throw an error when stdin is empty');

		setupTest()
			.stub(
				inputUtils,
				'getRawStdIn',
				sandbox.stub().resolves([invalidTransaction]),
			)
			.command(['transaction:sign'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Could not parse transaction JSON.',
				);
			})
			.it('should throw an error when std is an invalid JSON format');

		setupTest()
			.stub(
				inputUtils,
				'getRawStdIn',
				sandbox.stub().resolves([JSON.stringify(defaultTransaction)]),
			)
			.command(['transaction:sign'])
			.it('should take transaction from stdin and sign', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					secondPassphrase: null,
				});
				expect(transactionUtilStub.prepareTransaction).to.be.calledWithExactly(
					defaultTransaction,
					defaultInputs.passphrase,
					defaultInputs.secondPassphrase,
				);
				return expect(printMethodStub).to.be.calledWithExactly(
					defaultSignedTransaction,
				);
			});
	});

	describe('transaction | transaction:sign --passphrase=pass:123', () => {
		setupTest()
			.stub(
				inputUtils,
				'getRawStdIn',
				sandbox.stub().resolves([JSON.stringify(defaultTransaction)]),
			)
			.command(['transaction:sign', '--passphrase=pass:123'])
			.it(
				'should take transaction from stdin and sign with passphrase from flag',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						secondPassphrase: null,
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});

	describe('transaction | transaction:sign --passphrase=pass:123 --second-passphrase=pass:456', () => {
		setupTest()
			.stub(
				inputUtils,
				'getRawStdIn',
				sandbox.stub().resolves([JSON.stringify(defaultTransaction)]),
			)
			.command([
				'transaction:sign',
				'--passphrase=pass:abc',
				'--second-passphrase=pass:def',
			])
			.it(
				'should take transaction from stdin and sign with passphrase and second passphrase from flag',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:abc',
							repeatPrompt: true,
						},
						secondPassphrase: {
							source: 'pass:def',
							repeatPrompt: true,
						},
					});
					expect(
						transactionUtilStub.prepareTransaction,
					).to.be.calledWithExactly(
						defaultTransaction,
						defaultInputs.passphrase,
						defaultInputs.secondPassphrase,
					);
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultSignedTransaction,
					);
				},
			);
	});
});
