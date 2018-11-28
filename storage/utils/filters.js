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

const { NonSupportedFilterTypeError } = require('../errors');
const filterTypes = require('./filter_types');
const inputSerializers = require('./inputSerialzers');

function filterGenerator(
	filterType,
	alias,
	fieldName,
	valueSerializer,
	rawCondition
) {
	const filters = {};
	const serializer = valueSerializer || inputSerializers.default;
	const getValue = filterAlias =>
		serializer.call(null, null, 'select', filterAlias, fieldName);

	switch (filterType) {
		case filterTypes.BOOLEAN:
			filters[alias] = `"${fieldName}" = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${getValue(`${alias}_eql`)}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${getValue(`${alias}_ne`)}`;
			break;

		case filterTypes.TEXT:
			filters[alias] = `"${fieldName}" = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${getValue(`${alias}_eql`)}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${getValue(`${alias}_ne`)}`;

			filters[`${alias}_in`] = `"${fieldName}" IN ($\{${alias}_in:csv})`;
			filters[`${alias}_like`] = `"${fieldName}" LIKE ($\{${alias}_like})`;
			break;

		case filterTypes.NUMBER:
			filters[alias] = `"${fieldName}" = ${getValue(alias)}`;
			filters[`${alias}_eql`] = `"${fieldName}" = ${getValue(`${alias}_eql`)}`;
			filters[`${alias}_ne`] = `"${fieldName}" <> ${getValue(`${alias}_ne`)}`;

			filters[`${alias}_gt`] = `"${fieldName}" > ${getValue(`${alias}_gt`)}`;
			filters[`${alias}_gte`] = `"${fieldName}" >= ${getValue(`${alias}_gte`)}`;
			filters[`${alias}_lt`] = `"${fieldName}" < ${getValue(`${alias}_lt`)}`;
			filters[`${alias}_lte`] = `"${fieldName}" <= ${getValue(`${alias}_lte`)}`;
			filters[`${alias}_in`] = `"${fieldName}" IN ($\{${alias}_in:csv})`;
			break;

		case filterTypes.CUSTOM:
			if (rawCondition) {
				filters[alias] = rawCondition;
			} else {
				filters[alias] = `"${fieldName}" = ${serializer.call(
					null,
					null,
					'select',
					alias,
					fieldName
				)}`;
			}
			break;

		default:
			throw new NonSupportedFilterTypeError(filterType);
	}

	return filters;
}

module.exports = {
	filterGenerator,
};
