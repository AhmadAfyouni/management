import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompanyProfileService } from '../../modules/company-profile/company-profile.service';

@Injectable()
export class CompanySetupMiddleware implements NestMiddleware {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip setup check for setup routes and auth routes
    const skipRoutes = [
      '/company-profile',
      '/company-settings', 
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/company-profile/setup-status',
      '/company-profile/business-types'
    ];

    const shouldSkip = skipRoutes.some(route => req.path.startsWith(route));
    
    if (shouldSkip) {
      return next();
    }

    try {
      const isSetupCompleted = await this.companyProfileService.isSetupCompleted();
      
      if (!isSetupCompleted) {
        return res.status(HttpStatus.PRECONDITION_REQUIRED).json({
          status: false,
          message: 'Company setup required. Please complete the company profile setup first.',
          redirectTo: '/company-profile/setup',
          setupRequired: true
        });
      }

      next();
    } catch (error) {
      // If there's an error checking setup status, allow the request to proceed
      // This prevents the middleware from blocking the entire application
      next();
    }
  }
}
