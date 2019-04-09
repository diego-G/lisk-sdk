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

const wsRPC = require('./rpc/ws_rpc').wsRPC;
const slaveRPCStub = require('./rpc/ws_rpc').slaveRPCStub;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.ws
 * @see Parent: {@link api.ws}
 * @param {Object} transportModule
 * @todo Add description for the function and the params
 */
function TransportWSApi(transportModule) {
	wsRPC.getServer().registerRPCEndpoints({
		blocksCommon: transportModule.shared.blocksCommon,
		blocks: transportModule.shared.blocks,
		getTransactions: transportModule.shared.getTransactions,
		getSignatures: transportModule.shared.getSignatures,
	});

	wsRPC.getServer().registerEventEndpoints({
		postBlock: transportModule.shared.postBlock,
		postSignatures: transportModule.shared.postSignatures,
		postTransactions: transportModule.shared.postTransactions,
	});

	wsRPC.getServer().registerRPCEndpoints(slaveRPCStub);
}

module.exports = TransportWSApi;
