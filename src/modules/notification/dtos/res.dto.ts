import { IsBoolean, IsOptional, IsString } from "class-validator";

export class NotificationResponseDto {
    id: string;
  
    title: string;
  
    message: string;
  
    notificationPushDateTime: string;
  
    isRead: boolean;
  
    userId: string;
  
    createdAt: Date;
  
    updatedAt: Date;
  }
  
  export class NotificationQueryDto {
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;
  
    @IsOptional()
    @IsString()
    userId?: string;
  }
  