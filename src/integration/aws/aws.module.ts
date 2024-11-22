import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';
import { S3Service } from './services/s3.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [AwsService, S3Service],
  exports: [S3Service],
})
export class AwsModule {}
