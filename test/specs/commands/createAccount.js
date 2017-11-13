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
import { setUpCommandCreateAccount } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create account command', () => {
	beforeEach(setUpCommandCreateAccount);
	describe('Given a crypto instance has been initialised', () => {
		beforeEach(given.aCryptoInstanceHasBeenInitialised);
		describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and address "2167422481642255385L"', () => {
			beforeEach(given.aPassphraseWithPrivateKeyAndPublicKeyAndAddress);
			describe('Given the passphrase is generated by the createMnemonicPassphrase function', () => {
				beforeEach(given.thePassphraseIsGeneratedByTheCreateMnemonicPassphraseFunction);
				describe('Given an action "create account"', () => {
					beforeEach(given.anAction);
					describe('When the action is called', () => {
						beforeEach(when.theActionIsCalled);
						it('Then it should resolve to an object with the passphrase and the publicKey and the address', then.itShouldResolveToAnObjectWithThePassphraseAndThePublicKeyAndTheAddress);
					});
				});
			});
		});
	});
});
