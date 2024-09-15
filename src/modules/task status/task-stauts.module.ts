import { Module } from "@nestjs/common/decorators";
import { MongooseModule } from "@nestjs/mongoose";
import { TaskStatus, TaskStatusSchema } from "./schema/task-status.schema";
import { TaskStatusController } from "./task-stauts.controller";
import { TaskStatusService } from "./task-stauts.service";

@Module({
    imports: [MongooseModule.forFeature([{ name: TaskStatus.name, schema: TaskStatusSchema }])],
    providers: [TaskStatusService],
    controllers: [TaskStatusController],
    exports: [TaskStatusService],
})
export class TaskStatusModule { }