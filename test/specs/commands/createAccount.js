/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('createAccount command', () => {
	describe('Given a cryptoInstance', () => {
		beforeEach(given.aCryptoInstance);
		describe('Given there is a Vorpal instance', () => {
			beforeEach(given.aVorpalInstance);
			describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and address "2167422481642255385L"', () => {
				beforeEach(given.aPassphraseWithPrivateKeyAndPublicKeyAndAddress);
				describe('Given a Mnemonic instance', () => {
					beforeEach(given.aMnemonicInstanceStub);
					describe('Given the vorpal instance has the command "create account"', () => {
						beforeEach(given.theVorpalInstanceHasTheCommand);
						it('Then the command should have 0 required arguments', then.theCommandShouldHaveRequiredArguments);

						describe('When the user enters the command', () => {
							beforeEach(when.theUserExecutesTheCommand);
							it('Then it should return an object with the the passphrase, publicKey and address', then.itShouldReturnAnObjectWithThePassphraseAndThePublicKeyAndTheAddress);
							it('Then it should print the result in a table', then.itShouldPrintTheResultInATable);
						});

						describe('When the users enters the command with the "--json" option', () => {
							beforeEach(when.theUserExecutesTheCommandWithOptions);
							it('Then it should return an object with the passphrase, publicKey and address', then.itShouldReturnAnObjectWithThePassphraseAndThePublicKeyAndTheAddress);
							it('Then it should print the result as json', then.itShouldPrintTheResultAsJSON);
						});
					});
				});
			});
		});
	});
});
