import type { Container } from '../di';

export interface CronTask {
    run(): Promise<void>;
}

export type CronTaskConstructor = new (container: Container) => CronTask;
