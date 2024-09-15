import { Module } from "@nestjs/common/decorators";
import { MongooseModule } from "@nestjs/mongoose";
import { TaskType, TaskTypeSchema } from "./schema/task.-type.schema";
import { TaskTypeController } from "./task-type.controller";
import { TaskTypeService } from "./task-type.service";

@Module({
    imports: [MongooseModule.forFeature([{ name: TaskType.name, schema: TaskTypeSchema }])],
    providers: [TaskTypeService],
    controllers: [TaskTypeController],
    exports: [TaskTypeService],
})
export class TaskTypeModule {}