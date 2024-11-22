import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromEnv } from '@aws-sdk/credential-providers';
import { S3Client } from "@aws-sdk/client-s3";
@Injectable()
export class AwsService {
  protected s3Client: S3Client;

  constructor(protected configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: fromEnv(),
    });
  }
}
