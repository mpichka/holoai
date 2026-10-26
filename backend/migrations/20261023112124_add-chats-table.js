/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "chats" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "created_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updated_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "tg_id" INTEGER NOT NULL UNIQUE,
            "type" TEXT NOT NULL,
            "title" TEXT,
            "first_name" TEXT,
            "last_name" TEXT,
            "username" TEXT,
            "is_forum" INTEGER NOT NULL DEFAULT 0,
            "is_direct_messages" INTEGER NOT NULL DEFAULT 0
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_chats_updated_at"
        AFTER UPDATE ON "chats"
        FOR EACH ROW
            WHEN NEW."updated_at" = OLD."updated_at"
        BEGIN
            UPDATE "chats"
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
    await knex.raw(`DROP TRIGGER IF EXISTS "update_chats_updated_at"`);

    await knex.raw(`DROP TABLE IF EXISTS "chats"`);
};
