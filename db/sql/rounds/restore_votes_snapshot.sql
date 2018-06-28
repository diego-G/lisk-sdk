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
  DESCRIPTION: ?

  PARAMETERS: ?
*/

UPDATE mem_accounts accounts
SET vote = snapshot.vote, "missedBlocks" = snapshot."missedBlocks", "producedBlocks" = snapshot."producedBlocks"
FROM mem_votes_snapshot snapshot
WHERE accounts.address = snapshot.address;
