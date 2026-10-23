/** @type {{ apps: import('pm2').StartOptions[] }} */
module.exports = {
    apps: [
        {
            name: 'holoai-backend',
            script: 'backend/dist/main.js',
            autorestart: true,
            watch: false,
            max_restarts: 10,
            min_uptime: 5000,
            kill_timeout: 15000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'llama-cpp',
            script: process.env.LLAMA_PATH,
            interpreter: 'bash',
            autorestart: true,
            watch: false,
            max_restarts: 5,
            min_uptime: 10000,
            kill_timeout: 15000,
        },
    ],
};
