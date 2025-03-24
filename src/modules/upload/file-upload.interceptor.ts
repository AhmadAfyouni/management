import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Observable } from 'rxjs';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export function FileUploadFieldsInterceptor(
  fieldConfigs: { name: string; maxCount?: number }[],
  multerOptions: MulterOptions = {},
) {
  @Injectable()
  class FileInterceptor implements NestInterceptor {
    public readonly interceptor: NestInterceptor;

    constructor() {
      // Default options for memory storage
      const defaultOptions: MulterOptions = {
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB default
        },
      };

      // Create the interceptor with merged options
      this.interceptor = new (FileFieldsInterceptor(
        fieldConfigs,
        { ...defaultOptions, ...multerOptions },
      ))();
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      // Handle Promise<Observable> by using switchMap to ensure we always return Observable
      const result = this.interceptor.intercept(context, next);
      
      // If result is a Promise (of Observable), convert it to Observable using from() and switchMap
      if (result instanceof Promise) {
        return from(result).pipe(
          switchMap(obs => obs)
        );
      }
      
      return result;
    }
  }

  return mixin(FileInterceptor);
}