/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        CREATE TABLE "users" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "createdAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "updatedAt" INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            "tgId" INTEGER NOT NULL UNIQUE,
            "is_bot" INTEGER NOT NULL DEFAULT 0,
            "first_name" TEXT,
            "last_name" TEXT,
            "username" TEXT,
            "language_code" TEXT
        )
    `);

    await knex.raw(`
        CREATE TRIGGER "update_users_updatedAt"
        AFTER UPDATE ON "users"
        FOR EACH ROW
            WHEN NEW."updatedAt" = OLD."updatedAt"
        BEGIN
            UPDATE "users"
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
    await knex.raw(`DROP TRIGGER IF EXISTS "update_users_updatedAt"`);

    await knex.raw(`DROP TABLE IF EXISTS "users"`);
};
