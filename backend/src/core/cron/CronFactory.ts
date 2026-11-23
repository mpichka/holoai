import cron, { type ScheduledTask, type TaskOptions } from 'node-cron';
import type winston from 'winston';
import type { Container } from '../di';
import type { CronTaskConstructor } from './CronTask';

export class CronFactory {
    logger: winston.Logger;
    options: TaskOptions = {
        timezone: 'UTC',
        noOverlap: true,
    };
    tasks: Record<string, ScheduledTask> = {};

    constructor(private readonly container: Container) {
        this.logger = this.container.LoggerFactory.createLogger('Cron');
    }

    registerTask(Task: CronTaskConstructor, expression: string, name: string = Task.name) {
        if (this.tasks[name]) {
            this.logger.warn(`Task with name "${name}" already registered`);
            return;
        }

        if (!cron.validate(expression)) {
            this.logger.error(`Invalid cron expression "${expression}" for task "${name}"`);
            return;
        }

        const task = new Task(this.container);
        const scheduled = cron.createTask(expression, task.run.bind(task), { ...this.options, name });

        scheduled.on('execution:failed', ({ execution }) => {
            this.logger.error(`Cron task "${name}" failed: ${execution?.error?.stack ?? execution?.error}`);
        });

        this.tasks[name] = scheduled;

        this.logger.info(`Task has been registered: "${name}"`);
    }

    startTask(name: string) {
        const task = this.tasks[name];

        if (task) {
            task.start();
            this.logger.info(`Cron task "${name}" is started`);
        } else {
            this.logger.warn(`Cron task "${name}" was not found`);
        }
    }

    stopTask(name: string) {
        const task = this.tasks[name];

        if (task) {
            task.stop();
            this.logger.info(`Cron task "${name}" is stopped`);
        } else {
            this.logger.warn(`Cron task "${name}" was not found`);
        }
    }

    startAll() {
        Object.keys(this.tasks).forEach((name) => this.startTask(name));
    }

    stopAll() {
        Object.keys(this.tasks).forEach((name) => this.stopTask(name));
    }
}
