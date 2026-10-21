import { join } from 'path';
import winston from 'winston';

const LOCAL = true;

export class LoggerFactory {
    // Should be sorted by amount of logs.
    // More logs -> lower priority (higher number)
    static levels = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4,
        sql: 10,
    };

    static colors = {
        error: 'bold red',
        warn: 'bold yellow',
        info: 'green',
        debug: 'magenta',
        trace: 'grey',
        sql: 'blue',
    };

    /**
     * @static
     * @private
     */
    static logFormatter = winston.format.printf((info) => {
        const { timestamp, label, level } = info;
        let { message, meta = '' } = info;

        if (message instanceof Error) {
            return `${timestamp} [${label}] ${level}: ${message.stack}`;
        }

        if (typeof message === 'object') {
            message = JSON.stringify(message);
        }

        if (typeof meta === 'object') {
            meta = JSON.stringify(meta);
        }

        return `${timestamp} [${label}] ${level}: ${message} ${meta}`;
    });

    static filter = (...levels: string[]) => winston.format((log) => (levels.includes(log.level) ? log : false))();

    static createLogger(label = 'Log') {
        const consoleFormat = winston.format.combine(
            winston.format.colorize(),
            winston.format.label({ label }),
            winston.format.timestamp(),
            LoggerFactory.logFormatter,
        );

        const jsonFormat = winston.format.combine(
            winston.format.label({ label }),
            winston.format.timestamp(),
            winston.format.json(),
        );

        if (LOCAL) {
            winston.addColors(LoggerFactory.colors);
        }

        let transports: winston.transport[] = [
            new winston.transports.Console({
                format: LOCAL ? consoleFormat : jsonFormat,
            }),
        ];

        if (LOCAL) {
            transports = transports.concat([
                new winston.transports.File({
                    filename: join('logs', 'error.log'),
                    level: 'error',
                    format: winston.format.combine(LoggerFactory.filter('error'), jsonFormat),
                }),
                new winston.transports.File({
                    filename: join('logs', 'warn.log'),
                    level: 'warn',
                    format: winston.format.combine(LoggerFactory.filter('warn'), jsonFormat),
                }),
            ]);
        }

        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'sql',
            levels: LoggerFactory.levels,
            exitOnError: false,
            transports,
        });
    }
}
