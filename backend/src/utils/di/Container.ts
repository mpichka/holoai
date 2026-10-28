import type { HoloController } from '../../controllers/HoloController';
import type { FileDescriberService } from '../../services/describer';
import type { HoloAIService } from '../../services/holo/HoloAIService';
import type { HoloService } from '../../services/holo/HoloService';
import type { TriggerService } from '../../services/trigger';
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

    // controllers
    HoloController: HoloController;

    // services
    FileDescriberService: FileDescriberService;
    TriggerService: TriggerService;
    HoloService: HoloService;
    HoloAIService: HoloAIService;
};
