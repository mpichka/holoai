const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '../.env' });

function ensureDatabaseFile(filename) {
    if (fs.existsSync(filename)) return;

    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, '');
}

const dbFilename = process.env.BACKEND_SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'database.sqlite3');

ensureDatabaseFile(dbFilename);

/** @type {import('knex').Knex.Config} */
const config = {
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
        filename: dbFilename,
    },
    migrations: {
        directory: path.join(__dirname, 'migrations'),
        extension: 'js',
    },
};

module.exports = config;
