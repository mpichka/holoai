/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "messages" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "createdAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updatedAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

            "chatId" INTEGER NOT NULL,
            "userId" INTEGER NOT NULL,

            "messageTgId" INTEGER NOT NULL,
            "threadTgId" INTEGER NULL,
            "replyToId" INTEGER NULL,
            "sentAt INTEGER NULL,
            "text" TEXT NULL
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_messages_updatedAt"
        AFTER UPDATE ON "messages"
        FOR EACH ROW
            WHEN NEW."updatedAt" = OLD."updatedAt"
        BEGIN
            UPDATE "messages"
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
    await knex.raw(`DROP TRIGGER IF EXISTS "update_messages_updatedAt"`);

    await knex.raw(`DROP TABLE IF EXISTS "messages"`);
};
