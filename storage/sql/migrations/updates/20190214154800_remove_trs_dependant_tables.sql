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


/*
 * DESCRIPTION: Remove all trs dependant tables into trs asset field (transfer, signatures, delegates, votes, multisignatures, dapps, intransfer, outtransfer)
 * Note that it will also drop the `full_blocks_list` view as it uses some of these tables
 *
 * PARAMETERS: None
*/

DROP TABLE "transfer", "signatures", "delegates", "votes", "multisignatures", "dapps", "intransfer", "outtransfer" CASCADE;
