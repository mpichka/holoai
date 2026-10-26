/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "users" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "created_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updated_at" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "tgId" INTEGER NOT NULL UNIQUE,
            "is_bot" INTEGER NOT NULL DEFAULT 0,
            "first_name" TEXT,
            "last_name" TEXT,
            "username" TEXT,
            "language_code" TEXT
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_users_updated_at"
        AFTER UPDATE ON "users"
        FOR EACH ROW
            WHEN NEW."updated_at" = OLD."updated_at"
        BEGIN
            UPDATE "users"
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
    await knex.raw(`DROP TRIGGER IF EXISTS "update_users_updated_at"`);

    await knex.raw(`DROP TABLE IF EXISTS "users"`);
};
