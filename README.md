# Company Management System

A comprehensive system for managing company operations, including employee management, task tracking, project management, and more.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - Role-based access control
  - Permission management

- **Employee Management**
  - Comprehensive employee profiles
  - Document management (certifications, legal documents)
  - Performance evaluations
  - Salary and compensation tracking

- **Department Management**
  - Organization structure
  - Department hierarchy

- **Project Management**
  - Project creation and tracking
  - Project status monitoring
  - Assignment to departments

- **Task Management**
  - Task creation and assignment
  - Priority levels and status tracking
  - Due date monitoring
  - Time tracking
  - Recurring tasks
  - Task hierarchy (parent-child relationships)

- **Job Management**
  - Job titles and categories
  - Permission management
  - Access control to departments/employees

- **Internal Communications**
  - Internal messaging system
  - Notifications

- **File Management**
  - AWS S3 integration for file storage
  - Document version control

- **Dashboard**
  - Reporting and analytics

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3
- **Scheduling**: NestJS Schedule module and node-cron
- **Real-time Communication**: WebSockets (Socket.io)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- AWS Account (for S3 storage)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd company-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   MONGO_URI=mongodb://localhost:27017/CompanyManagement
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   JWT_EXPIRATION=7d
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   AWS_S3_BUCKET=your_aws_bucket_name
   ```

4. Run setup script:
   ```bash
   chmod +x setup-complete.sh
   ./setup-complete.sh
   ```

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## Initial Access

After first starting the application, a default admin user will be created:

- **Email**: admin@example.com
- **Password**: Admin@123

## API Documentation

The API is organized around the following main resources:

- `/auth` - Authentication endpoints
- `/emp` - Employee management
- `/department` - Department management
- `/job-titles` - Job titles management
- `/job-category` - Job categories
- `/task` - Task management
- `/project` - Project management
- `/section` - Section management
- `/internal-communications` - Internal communications
- `/template` - Templates
- `/transaction` - Transactions
- `/notification` - Notifications
- `/dashboard` - Dashboard data

## Module Structure

Each module typically contains:

- **Controller**: Handles HTTP requests and returns responses
- **Service**: Contains business logic
- **Schema**: Defines the data structure
- **DTO**: Data Transfer Objects for request validation
- **Enums**: Type definitions

## Deployment

The application can be deployed to any Node.js hosting platform. It includes configuration for Vercel deployment.

### Vercel Deployment

The `vercel.json` file configures the application for Vercel deployment.

### Traditional Deployment

For traditional deployment, you can use the included `deploy.sh` script which:
1. Pulls the latest code
2. Installs dependencies
3. Builds the application
4. Restarts the PM2 process

## License

This project is licensed under the MIT License - see the LICENSE file for details.
