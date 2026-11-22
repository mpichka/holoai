/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`ALTER TABLE "users" ADD COLUMN "spelled_name" TEXT NULL`);
    await knex.raw(`ALTER TABLE "users" ADD COLUMN "gender" TEXT NULL`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw(`ALTER TABLE "users" DROP COLUMN "gender"`);
    await knex.raw(`ALTER TABLE "users" DROP COLUMN "spelled_name"`);
};
