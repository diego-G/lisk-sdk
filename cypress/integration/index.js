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
describe('Browser tests', () => {
	it('should pass without minification', () => {
		cy.visit('http://localhost:8000/browsertest.html');
		cy.get('#result').should('contain', 0);
	});
	it('should pass with minification', () => {
		cy.visit('http://localhost:8000/browsertest.min.html');
		cy.get('#result').should('contain', 0);
	});
});
