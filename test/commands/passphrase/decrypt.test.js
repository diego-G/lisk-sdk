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

describe('passphrase:decrypt', () => {
	const defaultEncryptedPassphrase =
		'salt=d3887df959ed2bfe5961a6831da6e177&cipherText=1c08a1&iv=096ede534df9092fd4523ec7&tag=2a055e1c860b3ef76084a6c9aca68ce9&version=1';
	const passphrase = '123';
	const encryptedPassphraseObject = {
		salt: 'salt',
		cipherText: 'cipherText',
		iv: 'iv',
		tag: 'tag',
		version: 1,
	};
	const defaultInputs = {
		password: '456',
		data: `${defaultEncryptedPassphrase}\nshould not be used`,
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				cryptography,
				'parseEncryptedPassphrase',
				sandbox.stub().returns(encryptedPassphraseObject),
			)
			.stub(
				cryptography,
				'decryptPassphraseWithPassword',
				sandbox.stub().returns(passphrase),
			)
			.stub(
				getInputsFromSources,
				'default',
				sandbox.stub().resolves(defaultInputs),
			);

	describe('passphrase:decrypt', () => {
		setupTest()
			.stdout()
			.command(['passphrase:decrypt'])
			.catch(error =>
				expect(error.message).to.contain(
					'No encrypted passphrase was provided.',
				),
			)
			.it('should throw an error');
	});

	describe('passphrase:decrypt encryptedPassphrase', () => {
		setupTest()
			.stdout()
			.command(['passphrase:decrypt', defaultEncryptedPassphrase])
			.it('should decrypt passphrase with arg', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					password: {
						source: undefined,
					},
					data: null,
				});
				expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
					defaultEncryptedPassphrase,
				);
				expect(
					cryptography.decryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					encryptedPassphraseObject,
					defaultInputs.password,
				);
				return expect(printMethodStub).to.be.calledWithExactly({ passphrase });
			});
	});

	describe('passphrase:decrypt --passphrase=file:./path/to/encrypted_passphrase.txt', () => {
		const passphraseSource = 'file:./path/to/encrypted_passphrase.txt';
		setupTest()
			.stdout()
			.command(['passphrase:decrypt', `--passphrase=${passphraseSource}`])
			.it('should decrypt passphrase with passphrase flag', () => {
				expect(getInputsFromSources.default).to.be.calledWithExactly({
					password: {
						source: undefined,
					},
					data: {
						source: passphraseSource,
					},
				});
				expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
					defaultEncryptedPassphrase,
				);
				expect(
					cryptography.decryptPassphraseWithPassword,
				).to.be.calledWithExactly(
					encryptedPassphraseObject,
					defaultInputs.password,
				);
				return expect(printMethodStub).to.be.calledWithExactly({ passphrase });
			});
	});

	describe('passphrase:decrypt --passphrase=filePath --password=pass:456', () => {
		const passphraseSource = 'file:./path/to/encrypted_passphrase.txt';
		setupTest()
			.stdout()
			.command([
				'passphrase:decrypt',
				`--passphrase=${passphraseSource}`,
				'--password=pass:456',
			])
			.it(
				'should decrypt passphrase with passphrase flag and password flag',
				() => {
					expect(getInputsFromSources.default).to.be.calledWithExactly({
						password: {
							source: 'pass:456',
						},
						data: {
							source: passphraseSource,
						},
					});
					expect(cryptography.parseEncryptedPassphrase).to.be.calledWithExactly(
						defaultEncryptedPassphrase,
					);
					expect(
						cryptography.decryptPassphraseWithPassword,
					).to.be.calledWithExactly(
						encryptedPassphraseObject,
						defaultInputs.password,
					);
					return expect(printMethodStub).to.be.calledWithExactly({
						passphrase,
					});
				},
			);
	});
});
