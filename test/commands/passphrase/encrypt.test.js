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
import { expect, test } from '@oclif/test';
import { cryptography } from 'lisk-elements';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as getInputsFromSources from '../../../src/utils/input';

describe('passphrase:encrypt', () => {
	const encryptedPassphraseString =
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1';
	const defaultKeys = {
		publicKey:
			'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
	};
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: 1,
	};
	const defaultInputs = {
		passphrase: '123',
		password: '456',
	};

	const printMethodStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({}))
		.stub(cryptography, 'getKey', sandbox.stub().returns(defaultKeys))
		.stub(
			cryptography,
			'encryptPassphraseWithPassword',
			sandbox.stub().returns(encryptedPassphraseObject),
		)
		.stub(
			cryptography,
			'stringifyEncryptedPassphrase',
			sandbox.stub().returns(encryptedPassphraseString),
		)
		.stub(
			getInputsFromSources,
			'default',
			sandbox.stub().resolves(defaultInputs),
		);

	describe('passphrase:encrypt', () => {
		setupStub
			.stdout()
			.command(['passphrase:encrypt'])
			.it('should encrypt passphrase', () => {
				expect(
					cryptography.encryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(
					cryptography.stringifyEncryptedPassphrase,
				).to.be.calledWithExactly(encryptedPassphraseObject);
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					password: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				return expect(printMethodStub).to.be.calledWithExactly({
					encryptedPassphrase: encryptedPassphraseString,
				});
			});
	});

	describe('passphrase:encrypt --outputPublicKey', () => {
		setupStub
			.stdout()
			.command(['passphrase:encrypt', '--outputPublicKey'])
			.it('should encrypt passphrase and output public key', () => {
				expect(
					cryptography.encryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(
					cryptography.stringifyEncryptedPassphrase,
				).to.be.calledWithExactly(encryptedPassphraseObject);
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: undefined,
						repeatPrompt: true,
					},
					password: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				return expect(printMethodStub).to.be.calledWithExactly({
					encryptedPassphrase: encryptedPassphraseString,
					...defaultKeys,
				});
			});
	});

	describe('passphrase:encrypt --passphrase=pass:123', () => {
		setupStub
			.stdout()
			.command(['passphrase:encrypt', '--passphrase=pass:123'])
			.it('should call print with the user config', () => {
				expect(
					cryptography.encryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					defaultInputs.passphrase,
					defaultInputs.password,
				);
				expect(
					cryptography.stringifyEncryptedPassphrase,
				).to.be.calledWithExactly(encryptedPassphraseObject);
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					passphrase: {
						source: 'pass:123',
						repeatPrompt: true,
					},
					password: {
						source: undefined,
						repeatPrompt: true,
					},
				});
				return expect(printMethodStub).to.be.calledWithExactly({
					encryptedPassphrase: encryptedPassphraseString,
				});
			});
	});

	describe('passphrase:encrypt --passphrase=pass:123 --password=pass:456', () => {
		setupStub
			.stdout()
			.command([
				'passphrase:encrypt',
				'--passphrase=pass:123',
				'--password=pass:456',
			])
			.it(
				'should encrypt passphrase from passphrase and password flags',
				() => {
					expect(
						cryptography.encryptPassphraseWithPassword,
					).to.be.calledWithExactly(
						defaultInputs.passphrase,
						defaultInputs.password,
					);
					expect(
						cryptography.stringifyEncryptedPassphrase,
					).to.be.calledWithExactly(encryptedPassphraseObject);
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						passphrase: {
							source: 'pass:123',
							repeatPrompt: true,
						},
						password: {
							source: 'pass:456',
							repeatPrompt: true,
						},
					});
					return expect(printMethodStub).to.be.calledWithExactly({
						encryptedPassphrase: encryptedPassphraseString,
					});
				},
			);
	});
});
