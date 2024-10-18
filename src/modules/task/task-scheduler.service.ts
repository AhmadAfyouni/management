import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { TasksService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TaskSchedulerService {
    private readonly logger = new Logger(TaskSchedulerService.name);

    constructor(private readonly taskService: TasksService) {
        this.scheduleRecurringTasks();
    }

    scheduleRecurringTasks() {
        cron.schedule('0 0 * * *', async () => {
            this.logger.log('Checking for tasks to create...');
            await this.createScheduledTasks();
        });
    }

    private async createScheduledTasks() {
        try {
            const recurringTasks = await this.taskService.getRecurringTasks();
            const today = new Date();

            for (const task of recurringTasks) {
                const nextDueDate = new Date(task.due_date);
                const intervalInDays = task.intervalInDays || 1;

                while (nextDueDate <= task.end_date!) {
                    if (nextDueDate.getTime() === today.getTime()) {
                        const taskData: CreateTaskDto = {
                            name: task.name,
                            description: task.description,
                            task_type: task.task_type.toString(),
                            priority: task.priority,
                            emp: task.emp?.toString(),
                            status: task.status.toString(),
                            due_date: new Date(),
                            files: task.files,
                        };

                        await this.taskService.create(taskData);
                        break;
                    }
                    nextDueDate.setDate(nextDueDate.getDate() + intervalInDays);
                }
            }

            this.logger.log('Scheduled tasks created successfully.');
        } catch (error) {
            this.logger.error('Failed to create scheduled tasks', error);
        }
    }
}
