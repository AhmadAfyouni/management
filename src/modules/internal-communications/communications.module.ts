import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InternalCommunicationsController } from './communications.controller';
import { InternalCommunicationsService } from './communications.service';
import { InternalCommunications, InternalCommunicationsSchema } from './schema/communications.schema';
import { InternalCommunicationsGateway } from './internal-communications.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InternalCommunications.name, schema: InternalCommunicationsSchema },
    ]),
  ],
  controllers: [InternalCommunicationsController],
  providers: [InternalCommunicationsService, InternalCommunicationsGateway],
})
export class InternalCommunicationsModule {}
