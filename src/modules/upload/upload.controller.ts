// import { Controller, Post, Body, UseGuards } from '@nestjs/common';
// import { UploadService } from './upload.service';

// import { UploadFileDto } from './dto/upload-file.dto';

// @Controller('upload')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

  
//   @Post()
//   async create(
//     @Body() createUpload: UploadFileDto,
//   ) {
//     return await this.uploadService.generateUploadAndDownloadURL(
//       createUpload,
//     );
//   }
// }
