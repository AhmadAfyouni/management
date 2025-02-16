import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpStatus,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { DepartmentScheduleStatus, TransactionStatus } from './types/transaction.enum';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createTransactionDto: CreateTransactionDto,@GetAccount() empId:string) {
        return this.transactionService.create(createTransactionDto,empId);
    }

    @Get()
    findAll(
        @Query('status') status?: TransactionStatus
    ) {

        if (status) {
            return this.transactionService.findByStatus(status);
        }
        return this.transactionService.findAll();
    }
    // اظهار المعاملات ل صدير القسم  أي ان نفحص المفصوفة و يجب ان يكون ongoin

    @Get('find-one/:id')
    findOne(@Param('id') id: string) {
        return this.transactionService.findOne(id);
    }

    @Get("department-transactions")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getDepartmentTransactions(@GetDepartment() departmentId: string) {
        return await this.transactionService.getDepartmentTransactions(departmentId);
    }

    
    @Get("my-transactions")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getMyTransactions(@GetAccount() empId: string) {
        return await this.transactionService.getMyTransactions(empId);
    }
    @Get("execution")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getMyExecuation(@GetDepartment() departmentId: string) {
        return await this.transactionService.getMyExecuation(departmentId);
    }
    @Get("admin-approval")
    @Roles(UserRole.ADMIN)
    async getAdminApproval() {
        return await this.transactionService.getAdminApproval();
    }
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateTransactionDto: UpdateTransactionDto,
    ) {
        return this.transactionService.update(id, updateTransactionDto);
    }

    @Post('logs/:id')
    addLog(
        @Param('id') id: string,
        @Body() logDto: TransactionLogDto,
    ) {
        return this.transactionService.addLog(id, logDto);
    }

    @Patch('status/:id')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: TransactionStatus,
    ) {
        return this.transactionService.updateStatus(id, status);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.transactionService.remove(id);
    }

    @Post('departments-track')
    async approveDepartment(
        @Body() approveDto: ApproveDepartmentDto,
        @GetDepartment() departmentId: string
    ) {
        return this.transactionService.trackDepartment(approveDto.transaction_id, approveDto, departmentId);
    }

    @Get('department/:departmentId/tasks')
    async getDepartmentTasks(
        @Param('departmentId') departmentId: string,
        @Query('status') status?: DepartmentScheduleStatus
    ) {
        if (status) {
            return this.transactionService.findByDepartmentAndStatus(departmentId, status);
        }
        return this.transactionService.getCurrentDepartmentTasks(departmentId);
    }

    @Get(':id/progress')
    async getProgress(@Param('id') id: string) {
        return this.transactionService.getDepartmentProgress(id);
    }

    @Get(':id/history')
    async getHistory(@Param('id') id: string) {
        return this.transactionService.getTransactionHistory(id);
    }

}
