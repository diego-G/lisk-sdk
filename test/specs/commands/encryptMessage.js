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
import { setUpCommandEncryptMessage } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('encrypt message command', () => {
	beforeEach(setUpCommandEncryptMessage);
	describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
		beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);
		describe('Given a crypto instance has been initialised', () => {
			beforeEach(given.aCryptoInstanceHasBeenInitialised);
			describe('Given an action "encrypt message"', () => {
				beforeEach(given.anAction);
				describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
					beforeEach(given.aPassphrase);
					describe('Given a recipient "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"', () => {
						beforeEach(given.aRecipient);
						describe('Given a message "Some secret message\nthat spans multiple\n lines"', () => {
							beforeEach(given.aMessage);
							describe('Given an empty options object', () => {
								beforeEach(given.anEmptyOptionsObject);
								describe('When the action is called with the recipient and the options', () => {
									beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
									it('Then it should reject with message "No message was provided."', then.itShouldRejectWithMessage);
								});
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase and message can be retrieved from their sources', () => {
									beforeEach(given.thePassphraseAndMessageCanBeRetrievedFromTheirSources);
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should not get the inputs from sources using the message source', then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
							});
							describe('Given an options object with passphrase set to "passphraseSource"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase can be retrieved from its source', () => {
									beforeEach(given.thePassphraseCanBeRetrievedFromItsSource);
									describe('When the action is called with the recipient, the message and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should not get the inputs from sources using the message source', then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
							});
							describe('Given an options object with message set to "messageSource"', () => {
								beforeEach(given.anOptionsObjectWithMessageSetTo);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase and message can be retrieved from their sources', () => {
									beforeEach(given.thePassphraseAndMessageCanBeRetrievedFromTheirSources);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should get the inputs from sources using the message source', then.itShouldGetTheInputsFromSourcesUsingTheMessageSource);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
							});
							describe('Given an options object with passphrase set to "passphraseSource" and message set to "messageSource"', () => {
								beforeEach(given.anOptionsObjectWithPassphraseSetToAndMessageSetTo);
								describe('Given an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', () => {
									beforeEach(given.anErrorOccursRetrievingTheInputsFromTheirSources);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
									});
								});
								describe('Given the passphrase and message can be retrieved from their sources', () => {
									beforeEach(given.thePassphraseAndMessageCanBeRetrievedFromTheirSources);
									describe('When the action is called with the recipient and the options', () => {
										beforeEach(when.theActionIsCalledWithTheRecipientAndTheOptions);
										it('Then it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
										it('Then it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
										it('Then it should get the inputs from sources using the message source', then.itShouldGetTheInputsFromSourcesUsingTheMessageSource);
										it('Then it should encrypt the message with the passphrase for the recipient', then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient);
										it('Then it should resolve to the result of encrypting the message', then.itShouldResolveToTheResultOfEncryptingTheMessage);
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
