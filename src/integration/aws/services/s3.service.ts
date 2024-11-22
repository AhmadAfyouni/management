import { Injectable } from '@nestjs/common';
import { AwsService } from '../aws.service';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Lable } from '../types/lable.type';
import { Types } from 'mongoose';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service extends AwsService {
	private readonly bucketName: string;

	constructor(configService: ConfigService) {
		super(configService);
		const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
		if (!bucketName) {
			throw new Error(
				'AWS_S3_BUCKET is not defined in the configuration'
			);
		}
		this.bucketName = bucketName;
	}

	async getUploadUrl(
		key: string,
		contentType: string,
		expiresInSeconds = 3600
	): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			ContentType: contentType,
		});

		return getSignedUrl(this.s3Client, command, {
			expiresIn: expiresInSeconds,
		});
	}

	async getDownloadUrl(
		key: string,
		expiresInSeconds = 3600
	): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});

		return getSignedUrl(this.s3Client, command, {
			expiresIn: expiresInSeconds,
		});
	}
	async uploadPdf(pdfFile: string, key: string): Promise<string> {
		const fileBuffer = Buffer.from(pdfFile, 'base64');
		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: fileBuffer,
			ContentType: 'application/pdf',
			ACL: 'public-read',
		});
		await this.s3Client.send(command);
		return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;
	}

	async uploadLable(
		labels: Lable[],
		accountId: Types.ObjectId,
		shipmentId: Types.ObjectId
	): Promise<string[]> {
		const uploadResults: string[] = [];
		if (labels && labels.length > 0) {
			for (const [index, label] of labels.entries()) {
				const fileBuffer = Buffer.from(label.Base64, 'base64');
				let contentType: string;

				switch (label.format.toLowerCase()) {
					case 'pdf':
						contentType = 'application/pdf';
						break;
					case 'gif':
						contentType = 'image/gif';
						break;
					case 'png':
						contentType = 'image/png';
						break;
					case 'jpeg':
					case 'jpg':
						contentType = 'image/jpeg';
						break;
					default:
						throw new Error(
							`Unsupported file format: ${label.format}`
						);
				}

				// Generate a unique key for each file in S3
				const date = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

				const key = `account:${accountId}/shipment:${shipmentId}/labels/${date}/label-${index + 1}.${label.format.toLowerCase()}`;

				// Upload the decoded file to S3
				const resultUrl = await this.uploadFile(
					fileBuffer,
					key,
					contentType
				);

				// Push the result URL to the array
				uploadResults.push(resultUrl);
			}
		} else {
			// ! handel not lables provided or error here can be when provider did not return any lable
		}
		return uploadResults;
	}

	async uploadFile(
		file: Uint8Array,
		key: string,
		contentType: string
	): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: file,
			ContentType: contentType,
			ACL: 'public-read',
		});
		await this.s3Client.send(command);
		return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;
	}
}
