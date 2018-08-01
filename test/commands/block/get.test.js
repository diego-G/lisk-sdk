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
import { test } from '../../test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as api from '../../../src/utils/api';
import * as query from '../../../src/utils/query';

describe('block:get', () => {
	const endpoint = 'blocks';
	const apiConfig = {
		nodes: ['http://local.host'],
		network: 'main',
	};
	const printMethodStub = sandbox.stub();
	const apiClientStub = sandbox.stub();
	const setupStub = test
		.stub(print, 'default', sandbox.stub().returns(printMethodStub))
		.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
		.stub(api, 'default', sandbox.stub().returns(apiClientStub));

	setupStub
		.stdout()
		.command(['block:get'])
		.catch(error => expect(error.message).to.contain('Missing 1 required arg'))
		.it('should throw an error when arg is not provided');

	describe('block:get block', () => {
		const block = '3520445367460290306L';
		const queryResult = {
			blockId: block,
			name: 'i am owner',
		};

		setupStub
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['block:get', block])
			.it('should get an block info and display as an object', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, {
					limit: 1,
					blockId: block,
				});
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('block:get blocks', () => {
		const blocks = ['3520445367460290306L', '2802325248134221536L'];
		const queryResult = [
			{
				blockId: blocks[0],
				name: 'i am owner',
			},
			{
				blockId: blocks[1],
				name: 'some name',
			},
		];

		setupStub
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['block:get', blocks.join(',')])
			.it('should get blocks info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						limit: 1,
						blockId: blocks[0],
					},
					{
						limit: 1,
						blockId: blocks[1],
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});
});
