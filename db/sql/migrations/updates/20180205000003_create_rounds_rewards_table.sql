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
  DESCRIPTION: Drop existing rounds_fees table with correcponding triggers and functions.
               Create and populate rounds_rewards table.

  PARAMETERS: None
*/

-- Drop existing table, triggers and functions
DROP TABLE IF EXISTS rounds_fees;
DROP FUNCTION IF EXISTS rounds_fees_init();
DROP TRIGGER  IF EXISTS rounds_fees_delete ON "blocks";
DROP FUNCTION IF EXISTS round_fees_delete();
DROP TRIGGER  IF EXISTS rounds_fees_insert ON "blocks";
DROP FUNCTION IF EXISTS round_fees_insert();

-- Create table 'rounds_rewards' for storing rewards
CREATE TABLE IF NOT EXISTS "rounds_rewards"(
	"timestamp" INT    NOT NULL,
	"fees"      BIGINT NOT NULL,
	"reward"    BIGINT NOT NULL,
	"round"     INT    NOT NULL,
	"pk"        BYTEA  NOT NULL
);

-- Compute all rewards for previous rounds and insert them to 'rounds_rewards'
DO $$
	DECLARE
		row record;
	BEGIN
		RAISE NOTICE 'Calculating rewards for rounds, please wait...';
		FOR row IN
			SELECT
				-- Round number
				CEIL(height / 101::float)::int AS round
			FROM blocks
			-- Perform only for rounds that are completed and not present in 'rounds_rewards'
			WHERE height % 101 = 0 AND height NOT IN (SELECT height FROM rounds_rewards)
			-- Group by round
			GROUP BY CEIL(height / 101::float)::int
			-- Order by round
			ORDER BY CEIL(height / 101::float)::int ASC
		LOOP
			WITH
				-- Selecting all blocks of round
				round AS (
					SELECT
						b.timestamp, b.height, b."generatorPublicKey" AS pk, b."totalFee" AS fees,
						b.reward AS reward
					FROM blocks b
					WHERE CEIL(b.height / 101::float)::int = row.round AND b.height > 1
				),
				-- Calculating total fees of round
				fees AS (SELECT SUM(fees) AS total, FLOOR(SUM(fees) / 101) AS single FROM round),
				-- Get last delegate and timestamp of round's last block
				last AS (SELECT pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
			INSERT INTO rounds_rewards
				SELECT
					-- Timestamp of last round's block
					last.timestamp,
					-- Calculating real fee reward for delegate:
					-- Rounded fee per delegate + remaining fees if block is last one of round
					(fees.single + (CASE WHEN last.pk = round.pk AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
					-- Block reward
					round.reward,
					-- Round
					CEIL(round.height / 101::float)::int,
					-- Delegate public key
					round.pk
				FROM last, fees, round
				-- Sort fees by block height
				ORDER BY round.height ASC;
		END LOOP;
	RETURN;
END $$;

-- Create indexes on columns of 'rounds_rewards'
CREATE INDEX IF NOT EXISTS "rounds_rewards_timestamp" ON rounds_rewards (timestamp);
CREATE INDEX IF NOT EXISTS "rounds_rewards_round" ON rounds_rewards (round);
CREATE INDEX IF NOT EXISTS "rounds_rewards_public_key" ON rounds_rewards (pk);
