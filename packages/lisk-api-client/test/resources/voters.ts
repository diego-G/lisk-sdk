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
import { expect } from 'chai';
import { APIClient } from '../../src/api_client';
import { APIResource } from '../../src/api_resource';
import { VotersResource } from '../../src/resources/voters';
import { FakeApiClient } from '../types/types';

describe('VotersResource', () => {
	const defaultBasePath = 'http://localhost:1234';
	const path = '/voters';

	let apiClient: FakeApiClient;
	let resource: APIResource;

	beforeEach(() => {
		apiClient = {
			headers: {},
			currentNode: defaultBasePath,
			hasAvailableNodes: () => {},
			randomizeNodes: false,
			banActiveNodeAndSelect: () => {},
		};
		resource = new VotersResource(apiClient as APIClient);
		return Promise.resolve();
	});

	describe('#constructor', () => {
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

		it('should have a "get" function', () => {
			return expect(resource)
				.to.have.property('get')
				.which.is.a('function');
		});
	});
});
