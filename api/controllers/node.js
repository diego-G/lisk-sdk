'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class NodeController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function NodeController (scope) {
	modules = scope.modules;
}

NodeController.getConstants = function (context, next) {
	modules.node.shared.getConstants(null, function (err, data) {
		try {
			if (err) { return next(err); }

			data = _.cloneDeep(data);

			// Perform required typecasts for integer or bignum attributes when returning a response to the API
			data.supply = data.supply.toString();
			data.milestone = data.milestone.toString();
			data.reward = data.reward.toString();
			data.fees.dappDeposit = data.fees.dappDeposit.toString();
			data.fees.dappWithdrawal = data.fees.dappWithdrawal.toString();
			data.fees.dappRegistration = data.fees.dappRegistration.toString();
			data.fees.multisignature = data.fees.multisignature.toString();
			data.fees.delegate = data.fees.delegate.toString();
			data.fees.secondSignature = data.fees.secondSignature.toString();
			data.fees.vote = data.fees.vote.toString();
			data.fees.send = data.fees.send.toString();
			data.fees.data = data.fees.data.toString();

			next(null, data);

		} catch (error) {
			next(error);
		}
	});
};

NodeController.getStatus = function (context, next) {
	modules.node.shared.getStatus(null, function (err, data) {
		try {
			if (err) { return next(err); }

			data = _.cloneDeep(data);

			// Check if attributes are null, then set it to 0
			// as per schema defined for these attributes in swagger
			data.networkHeight = data.networkHeight || 0;
			data.consensus = data.consensus || 0;

			next(null, data);
		} catch (error) {
			next(error);
		}
	});
};

module.exports = NodeController;
