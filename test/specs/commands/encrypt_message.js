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
import { setUpCommandEncryptMessage } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('encrypt message command', () => {
	beforeEach(setUpCommandEncryptMessage);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given(
				'a crypto instance has been initialised',
				given.aCryptoInstanceHasBeenInitialised,
				() => {
					Given('an action "encrypt message"', given.anAction, () => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'a recipient "31919b459d28b1c611afb4db3de95c5769f4891c3f771c7dbcb53a45c452cc25"',
									given.aRecipient,
									() => {
										Given(
											'a message "Some secret message\nthat spans multiple\n lines"',
											given.aMessage,
											() => {
												Given(
													'an empty options object',
													given.anEmptyOptionsObject,
													() => {
														When(
															'the action is called with the recipient and the options',
															when.theActionIsCalledWithTheRecipientAndTheOptions,
															() => {
																Then(
																	'it should reject with validation error and message "No message was provided."',
																	then.itShouldRejectWithValidationErrorAndMessage,
																);
															},
														);
														Given(
															'an error "Unknown data source type." occurs retrieving the inputs from their sources',
															given.anErrorOccursRetrievingTheInputsFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient, the message and the options',
																	when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions,
																	() => {
																		Then(
																			'it should reject with the error message',
																			then.itShouldRejectWithTheErrorMessage,
																		);
																	},
																);
															},
														);
														Given(
															'the passphrase can be retrieved from its source',
															given.thePassphraseCanBeRetrievedFromItsSource,
															() => {
																When(
																	'the action is called with the recipient, the message and the options',
																	when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions,
																	() => {
																		Then(
																			'it should get the inputs from sources using the Vorpal instance',
																			then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																		);
																		Then(
																			'it should get the inputs from sources using the passphrase source with a repeating prompt',
																			then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																		);
																		Then(
																			'it should not get the inputs from sources using the message source',
																			then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																		);
																		Then(
																			'it should encrypt the message with the passphrase for the recipient',
																			then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient,
																		);
																		Then(
																			'it should resolve to the result of encrypting the message',
																			then.itShouldResolveToTheResultOfEncryptingTheMessage,
																		);
																	},
																);
															},
														);
													},
												);
												Given(
													'an options object with passphrase set to "passphraseSource"',
													given.anOptionsObjectWithPassphraseSetToAndMessageSetTo,
													() => {
														Given(
															'an error "Unknown data source type." occurs retrieving the inputs from their sources',
															given.anErrorOccursRetrievingTheInputsFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient, the message and the options',
																	when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions,
																	() => {
																		Then(
																			'it should reject with the error message',
																			then.itShouldRejectWithTheErrorMessage,
																		);
																	},
																);
															},
														);
														Given(
															'the passphrase can be retrieved from its source',
															given.thePassphraseCanBeRetrievedFromItsSource,
															() => {
																When(
																	'the action is called with the recipient, the message and the options',
																	when.theActionIsCalledWithTheRecipientTheMessageAndTheOptions,
																	() => {
																		Then(
																			'it should get the inputs from sources using the Vorpal instance',
																			then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																		);
																		Then(
																			'it should get the inputs from sources using the passphrase source with a repeating prompt',
																			then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																		);
																		Then(
																			'it should not get the inputs from sources using the message source',
																			then.itShouldNotGetTheInputsFromSourcesUsingTheMessageSource,
																		);
																		Then(
																			'it should encrypt the message with the passphrase for the recipient',
																			then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient,
																		);
																		Then(
																			'it should resolve to the result of encrypting the message',
																			then.itShouldResolveToTheResultOfEncryptingTheMessage,
																		);
																	},
																);
															},
														);
													},
												);
												Given(
													'an options object with message set to "messageSource"',
													given.anOptionsObjectWithMessageSetTo,
													() => {
														Given(
															'an error "Unknown data source type." occurs retrieving the inputs from their sources',
															given.anErrorOccursRetrievingTheInputsFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient and the options',
																	when.theActionIsCalledWithTheRecipientAndTheOptions,
																	() => {
																		Then(
																			'it should reject with the error message',
																			then.itShouldRejectWithTheErrorMessage,
																		);
																	},
																);
															},
														);
														Given(
															'the passphrase and message can be retrieved from their sources',
															given.thePassphraseAndMessageCanBeRetrievedFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient and the options',
																	when.theActionIsCalledWithTheRecipientAndTheOptions,
																	() => {
																		Then(
																			'it should get the inputs from sources using the Vorpal instance',
																			then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																		);
																		Then(
																			'it should get the inputs from sources using the passphrase source with a repeating prompt',
																			then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																		);
																		Then(
																			'it should get the inputs from sources using the message source',
																			then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																		);
																		Then(
																			'it should encrypt the message with the passphrase for the recipient',
																			then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient,
																		);
																		Then(
																			'it should resolve to the result of encrypting the message',
																			then.itShouldResolveToTheResultOfEncryptingTheMessage,
																		);
																	},
																);
															},
														);
													},
												);
												Given(
													'an options object with passphrase set to "passphraseSource" and message set to "messageSource"',
													given.anOptionsObjectWithPassphraseSetToAndMessageSetTo,
													() => {
														Given(
															'an error "Unknown data source type." occurs retrieving the inputs from their sources',
															given.anErrorOccursRetrievingTheInputsFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient and the options',
																	when.theActionIsCalledWithTheRecipientAndTheOptions,
																	() => {
																		Then(
																			'it should reject with the error message',
																			then.itShouldRejectWithTheErrorMessage,
																		);
																	},
																);
															},
														);
														Given(
															'the passphrase and message can be retrieved from their sources',
															given.thePassphraseAndMessageCanBeRetrievedFromTheirSources,
															() => {
																When(
																	'the action is called with the recipient and the options',
																	when.theActionIsCalledWithTheRecipientAndTheOptions,
																	() => {
																		Then(
																			'it should get the inputs from sources using the Vorpal instance',
																			then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
																		);
																		Then(
																			'it should get the inputs from sources using the passphrase source with a repeating prompt',
																			then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
																		);
																		Then(
																			'it should get the inputs from sources using the message source',
																			then.itShouldGetTheInputsFromSourcesUsingTheMessageSource,
																		);
																		Then(
																			'it should encrypt the message with the passphrase for the recipient',
																			then.itShouldEncryptTheMessageWithThePassphraseForTheRecipient,
																		);
																		Then(
																			'it should resolve to the result of encrypting the message',
																			then.itShouldResolveToTheResultOfEncryptingTheMessage,
																		);
																	},
																);
															},
														);
													},
												);
											},
										);
									},
								);
							},
						);
					});
				},
			);
		},
	);
});
