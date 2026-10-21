import type { Database } from '../db';
import type { FileRepository } from '../db/repositories';
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

    // repo
    FileRepository: FileRepository;
};
