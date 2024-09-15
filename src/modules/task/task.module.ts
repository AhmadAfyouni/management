import { Module } from "@nestjs/common/decorators";
import { MongooseModule } from "@nestjs/mongoose";
import { Task, TaskSchema } from "./schema/task.schema";
import { TasksController } from "./task.controller";
import { TasksService } from "./task.service";

@Module({
    imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
    providers: [TasksService],
    controllers: [TasksController],
    exports: [TasksService],
})
export class TaskModule { }