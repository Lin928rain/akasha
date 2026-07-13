-- Migration: Add card batching support to deck options
-- Date: 2026-03-01
-- Description: Add support for card batching and grouping in deck options

-- Note: This migration is informational. The deck.options JSONB column already
-- supports storing the new card batching configuration without schema changes.

-- New fields in deck.options JSONB:
-- - enableCardBatching (boolean): Whether card batching is enabled for this deck
-- - cardGroups (array): Array of card group objects with the following structure:
--   - id (string): Unique group identifier
--   - name (string): Group name
--   - cardIds (array): Array of card IDs belonging to this group
--   - order (number, optional): Group display order
--   - createdAt (timestamp, optional): Group creation timestamp

-- Example deck.options structure with card batching:
-- {
--   "newToReviewRatio": 0.5,
--   "dailyNewCards": 20,
--   "autoReadOnCard": false,
--   "enableCardBatching": true,
--   "cardGroups": [
--     {
--       "id": "group-1234567890-abcdef",
--       "name": "重点词汇",
--       "cardIds": ["card1", "card2", "card3"],
--       "order": 1,
--       "createdAt": "2026-03-01T00:00:00Z"
--     }
--   ]
-- }

-- No actual schema changes needed since options is JSONB
SELECT NOW() as migration_applied;
