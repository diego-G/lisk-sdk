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
 */

'use strict';

const regexpTester = require('../../../helpers/regexp_tester');

/* eslint-disable no-useless-escape */
describe('testNullCharacter', () => {
	const validStrings = [
		'lorem ipsum',
		'lorem\u0001 ipsum',
		'loremU00000001 ipsum',
		'\u0001',
		'\x01',
		'l©rem',
		'❤',
	];

	const invalidStrings = [
		'\0',
		'\0lorem',
		'ipsum\0',
		'lorem\0 ipsum',
		'\x00',
		'\x00lorem',
		'ipsum\x00',
		'lorem\x00 ipsum',
		'\u0000',
		'\u0000lorem',
		'ipsum\u0000',
		'lorem\u0000 ipsum',
		'U00000000',
		'U00000000lorem',
		'ipsumU00000000',
		'loremU00000000 ipsum',
	];

	describe('strings without null character should be return false', () => {
		it('should return false for strings without null character', done => {
			validStrings.forEach(string => {
				const result = regexpTester.testNullCharacter(string);
				expect(result).to.false;
			});
			done();
		});
	});

	describe('strings with null character should be return true', () => {
		it('should return false for strings without null character', done => {
			invalidStrings.forEach(string => {
				const result = regexpTester.testNullCharacter(string);
				expect(result).to.true;
			});
			done();
		});
	});
});
