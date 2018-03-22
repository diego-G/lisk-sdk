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
import getAPIClient from './api';

export default (endpoint, parameters, { testnet } = {}) =>
	// prettier-ignore
	getAPIClient(testnet)[endpoint].get(parameters)
		.then(res => {
			if (res.data) {
				if (Array.isArray(res.data)) {
					if (res.data.length === 0) {
						throw new Error('Data was not found with specified parameters.');
					}
					return res.data[0];
				}
				return res.data;
			}
			throw new Error('Data was not found with specified parameters.');
		});
