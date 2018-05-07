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
 *
 */

import APIResource from '../../src/api_resource';
import SignaturesResource from '../../src/resources/signatures';

describe('SignaturesResource', () => {
	const defaultBasePath = 'http://localhost:1234';
	const path = '/signatures';

	let apiClient;
	let resource;

	beforeEach(() => {
		apiClient = {
			headers: {},
			currentNode: defaultBasePath,
			hasAvailableSignatures: () => {},
			randomizeSignatures: () => {},
			banActiveSignatureAndSelect: () => {},
		};
		resource = new SignaturesResource(apiClient);
		return Promise.resolve();
	});

	describe('#constructor', () => {
		it('should throw error without apiClient input', () => {
			return expect(() => new SignaturesResource()).to.throw(
				'APIResource requires APIClient instance for initialization.',
			);
		});

		it('should be instance of APIResource', () => {
			return expect(resource).to.be.instanceOf(APIResource);
		});

		it('should have correct full path', () => {
			return expect(resource.resourcePath).to.eql(
				`${defaultBasePath}/api${path}`,
			);
		});

		it('should set resource path', () => {
			return expect(resource.path).to.equal(path);
		});

		it('should have a "broadcast" function', () => {
			return expect(resource)
				.to.have.property('broadcast')
				.which.is.a('function');
		});
	});
});
