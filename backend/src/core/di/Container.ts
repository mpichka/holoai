import type { FileDescriberService } from '../../shared/describer';
import type { DatabaseService } from '../../shared/database';
import type { CronFactory } from '../cron';
import type { Database } from '../db';
import type { Llama } from '../llama';
import type { LoggerFactory } from '../logger';
import type { Router } from '../router';
import type { TelegramBot } from '../tg';

export type Container = {
    LoggerFactory: typeof LoggerFactory;
    Database: Database;
    Router: Router;
    Llama: Llama;
    TelegramBot: TelegramBot;
    CronFactory: CronFactory;

    // shared services
    DatabaseService: DatabaseService;
    FileDescriberService: FileDescriberService;
};
