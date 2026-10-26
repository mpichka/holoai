/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "messages" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "created_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updated_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

            "chat_id" INTEGER NOT NULL,
            "user_id" INTEGER NOT NULL,

            "message_tg_id" INTEGER NOT NULL UNIQUE,
            "thread_tg_id" INTEGER NULL,
            "reply_to_id" INTEGER NULL,
            "sent_at" INTEGER NULL,
            "text" TEXT NULL
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_messages_updated_at"
        AFTER UPDATE ON "messages"
        FOR EACH ROW
            WHEN NEW."updated_at" = OLD."updated_at"
        BEGIN
            UPDATE "messages"
            SET "updated_at" = strftime('%s', 'now')
            WHERE "id" = NEW."id";
        END
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw(`DROP TRIGGER IF EXISTS "update_messages_updated_at"`);

    await knex.raw(`DROP TABLE IF EXISTS "messages"`);
};
