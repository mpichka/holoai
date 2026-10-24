/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "chats" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "createdAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updatedAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "tgId" INTEGER NOT NULL UNIQUE,
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
        CREATE TRIGGER "update_chats_updatedAt"
        AFTER UPDATE ON "chats"
        FOR EACH ROW
            WHEN NEW."updatedAt" = OLD."updatedAt"
        BEGIN
            UPDATE "chats"
            SET "updatedAt" = strftime('%s', 'now')
            WHERE "id" = NEW."id";
        END
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw(`DROP TRIGGER IF EXISTS "update_chats_updatedAt"`);

    await knex.raw(`DROP TABLE IF EXISTS "chats"`);
};
