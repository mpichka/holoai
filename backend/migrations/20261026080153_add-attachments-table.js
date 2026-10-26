/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "attachments" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "created_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updated_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

            "type" INTEGER NOT NULL,
            "file_tg_uid" TEXT NOT NULL UNIQUE,
            "file_size" INTEGER NULL,
            "mime_type" TEXT NULL,
            "file_name" TEXT NULL,
            "duration" INTEGER NULL,
            "performer" TEXT NULL,

            "ai_description" TEXT NULL
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_attachments_updated_at"
        AFTER UPDATE ON "attachments"
        FOR EACH ROW
            WHEN NEW."updated_at" = OLD."updated_at"
        BEGIN
            UPDATE "attachments"
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
    await knex.raw(`DROP TRIGGER IF EXISTS "update_attachments_updated_at"`);

    await knex.raw(`DROP TABLE IF EXISTS "attachments"`);
};
