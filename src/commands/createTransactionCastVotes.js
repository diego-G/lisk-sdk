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
import getInputsFromSources from '../utils/input';
import { getData } from '../utils/input/utils';
import {
	createCommand,
	prependPlusToPublicKeys,
	prependMinusToPublicKeys,
	validatePublicKeys,
} from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will cast votes (or unvotes) for delegate candidates using their public keys if broadcast to the network.

	Examples:
	- create transaction cast votes --vote 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvote e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba
	- create transaction 3 --vote 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvote e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba
`;

const processInputs = votes => ({ passphrase, secondPassphrase }) =>
	transactions.createVote(passphrase, votes, secondPassphrase);

const processVotesInput = async votes => (votes.includes(':')
	? getData(votes)
	: votes);

const processVotes = votes =>
	votes
		.replace(/\n/g, ',')
		.split(',')
		.filter(Boolean)
		.map(vote => vote.trim());

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		vote,
		unvote,
	} = options;

	if (!vote && !unvote) {
		throw new Error('At least one of vote and/or unvote options must be provided.');
	}

	if (vote === unvote) {
		throw new Error('Vote and unvote sources must not be the same.');
	}

	const votes = vote ? await processVotesInput(vote.toString()) : null;
	const unvotes = unvote ? await processVotesInput(unvote.toString()) : null;

	const validatedVotes = votes ? validatePublicKeys(processVotes(votes)) : null;
	const validatedUnvotes = unvotes ? validatePublicKeys(processVotes(unvotes)) : null;

	const prependedVotes = votes ? prependPlusToPublicKeys(validatedVotes) : [];
	const prependedUnvotes = unvotes ? prependMinusToPublicKeys(validatedUnvotes) : [];

	const allVotes = [...prependedVotes, ...prependedUnvotes];

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
		secondPassphrase: !secondPassphraseSource ? null : {
			source: secondPassphraseSource,
			repeatPrompt: true,
		},
	})
		.then(processInputs(allVotes));
};

const createTransactionCastVotes = createCommand({
	command: 'create transaction cast vote',
	alias: ['create transaction 3', 'create transaction cast votes'],
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
		commonOptions.vote,
		commonOptions.unvote,
	],
	errorPrefix: 'Could not create "cast vote" transaction',
});

export default createTransactionCastVotes;
