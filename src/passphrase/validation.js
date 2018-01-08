/*
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
import Mnemonic from 'bip39';

export const countPassphraseWhitespaces = passphrase => {
	const whitespaceMatches = passphrase.match(/\s/g);
	return whitespaceMatches ? whitespaceMatches.length : 0;
};

export const countPassphraseWords = passphrase =>
	passphrase.split(' ').filter(Boolean).length;

export const countUppercaseCharacters = passphrase => {
	const uppercaseCharacterMatches = passphrase.match(/[A-Z]/g);
	return uppercaseCharacterMatches ? uppercaseCharacterMatches.length : 0;
};

export const validatePassphrase = (passphrase, wordlist) => {
	const expectedWords = 12;
	const expectedWhitespaces = 11;
	const expectedUppercaseCharacters = 0;
	const wordsInPassphrase = countPassphraseWords(passphrase);
	const whiteSpacesInPassphrase = countPassphraseWhitespaces(passphrase);
	const uppercaseCharacterInPassphrase = countUppercaseCharacters(passphrase);

	if (wordsInPassphrase !== expectedWords) {
		throw new Error(
			`Passphrase contains ${wordsInPassphrase} words instead of expected ${expectedWords}. Please check the passphrase.`,
		);
	}
	if (whiteSpacesInPassphrase !== expectedWhitespaces) {
		throw new Error(
			`Passphrase contains ${whiteSpacesInPassphrase} whitespaces instead of expected ${expectedWhitespaces}. Please check the passphrase.`,
		);
	}
	if (uppercaseCharacterInPassphrase !== expectedUppercaseCharacters) {
		throw new Error(
			`Passphrase contains ${uppercaseCharacterInPassphrase} uppercase character instead of expected ${expectedUppercaseCharacters}. Please check the passphrase.`,
		);
	}
	if (
		!Mnemonic.validateMnemonic(
			passphrase,
			wordlist || Mnemonic.wordlists.english,
		)
	) {
		throw new Error(
			'Passphrase is not a valid mnemonic passphrase. Please check the passphrase.',
		);
	}

	return true;
};
