import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction, TransactionSchema } from './schema/transaction.schema';
import { Template, TemplateSchema } from '../template/schema/tamplate.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Transaction.name, schema: TransactionSchema },
            { name: Template.name, schema: TemplateSchema },
        ]),
        NotificationModule
    ],
    controllers: [TransactionController],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule { }
