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
  DESCRIPTION: Recreate 'trs_list' view, normalize addresses, add indexes.

  PARAMETERS: None
*/

DROP VIEW IF EXISTS trs_list;

CREATE OR REPLACE VIEW trs_list AS

SELECT t."id" AS "t_id",
	   t."rowId" AS "t_rowid",
       b."height" AS "b_height",
       t."blockId" AS "t_blockId",
       t."type" AS "t_type",
       t."timestamp" AS "t_timestamp",
       t."senderPublicKey" AS "t_senderPublicKey",
       m."publicKey" AS "m_recipientPublicKey",
       UPPER(t."senderId") AS "t_senderId",
       UPPER(t."recipientId") AS "t_recipientId",
       t."amount" AS "t_amount",
       t."fee" AS "t_fee",
       ENCODE(t."signature", 'hex') AS "t_signature",
       ENCODE(t."signSignature", 'hex') AS "t_SignSignature",
       t."signatures" AS "t_signatures",
       (SELECT height + 1 FROM blocks ORDER BY height DESC LIMIT 1) - b."height" AS "confirmations"

FROM trs t

LEFT JOIN blocks b ON t."blockId" = b."id"
LEFT JOIN mem_accounts m ON t."recipientId" = m."address";

CREATE INDEX IF NOT EXISTS "trs_upper_sender_id" ON "trs"(UPPER("senderId"));
CREATE INDEX IF NOT EXISTS "trs_upper_recipient_id" ON "trs"(UPPER("recipientId"));
