/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "attachments_to_messages" (
            "message_id" INTEGER NOT NULL REFERENCES "messages" ("id") ON DELETE CASCADE,
            "attachment_id" INTEGER NOT NULL REFERENCES "attachments" ("id") ON DELETE CASCADE,
            "file_tg_id" TEXT NOT NULL,
            "caption" TEXT NULL,
            "media_group_id" TEXT NULL,

            PRIMARY KEY ("message_id", "attachment_id")
        ) WITHOUT ROWID
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw(`DROP TABLE IF EXISTS "attachments_to_messages"`);
};
