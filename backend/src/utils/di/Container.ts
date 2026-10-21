import type { Database } from '../db';
import type { LoggerFactory } from '../logger';
import type { Router } from '../router';

export type Container = {
    LoggerFactory: typeof LoggerFactory;
    Database: Database;
    Router: Router;
};
