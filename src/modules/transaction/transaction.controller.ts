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
import { DepartmentExecutionStatus, DepartmentScheduleStatus, TransactionStatus } from './types/transaction.enum';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetAccount, GetDepartment, IsAdmin } from 'src/common/decorators/user-guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { UpdateDepartmentExecutionStatusDto } from './dtos/update-department-execuation.dto';
import { isBtcAddress } from 'class-validator';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createTransactionDto: CreateTransactionDto, @GetAccount() empId: string) {
        return this.transactionService.create(createTransactionDto, empId);
    }

    @Post("restart/:id")
    async restartTransaction(@Body() updateTransactionDto: UpdateTransactionDto, @Param("id") transaction_id: string) {
        return await this.transactionService.restart(transaction_id, updateTransactionDto);
    }
    @Get("finish/:id")
    async finishTransaction(@Param("id") transaction_id: string) {
        return await this.transactionService.finishTransaction(transaction_id);
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

    @Get('find-one/:id')
    findOne(@Param('id') id: string) {
        return this.transactionService.findOne(id);
    }

    @Get("department-transactions")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN, UserRole.SECONDARY_USER)
    async getDepartmentTransactions(@GetDepartment() departmentId: string, @GetAccount() empId: string) {
        return await this.transactionService.getDepartmentTransactions(departmentId, empId);
    }


    @Get("my-transactions")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getMyTransactions(@GetAccount() empId: string) {
        return await this.transactionService.getMyTransactions(empId);
    }

    @Get("archived-transactions")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN, UserRole.SECONDARY_USER)
    async getArchivedTransactions(@GetDepartment() departmentId: string, @GetAccount() empId: string) {
        return await this.transactionService.getMyArchiveTransaction(departmentId, empId);
    }

    @Get("archive")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getArchiveTransaction(@GetAccount() empId: string) {
        return await this.transactionService.getMyTransactionsArchive(empId);
    }
    @Get("execution")
    @Roles(UserRole.PRIMARY_USER, UserRole.ADMIN)
    async getMyExecuation(@GetDepartment() departmentId: string, @GetAccount() empId: string) {
        return await this.transactionService.getMyExecution(departmentId, empId);
    }
    @Patch('execution-status/:transactionId')
    updateExecutionStatus(
        @Param('transactionId') transactionId: string,
        @GetDepartment() departmentId: string,
        @Body() updateExecutionDto: UpdateDepartmentExecutionStatusDto,
    ) {
        return this.transactionService.updateDepartmentExecutionStatus(
            transactionId,
            departmentId,
            updateExecutionDto.newStatus,
        );
    }

    @Get("admin-approval")
    @Roles(UserRole.ADMIN)
    async getAdminApproval(@GetAccount() empId: string) {
        return await this.transactionService.getAdminApproval(empId);
    }
    @Patch('update/:id')
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
        @GetDepartment() departmentId: string,
    ) {
        return this.transactionService.trackDepartment(approveDto.transaction_id, approveDto, departmentId);
    }

    @Patch('admin-approve')
    @Roles(UserRole.ADMIN)
    async adminApprove(
        @Body() approveDto: ApproveDepartmentDto,
    ) {
        return await this.transactionService.adminApprove(approveDto.transaction_id, approveDto);
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


}
