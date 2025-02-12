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
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { DepartmentScheduleStatus, TransactionStatus } from './types/transaction.enum';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';

@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createTransactionDto: CreateTransactionDto) {
        return this.transactionService.create(createTransactionDto);
    }

    @Get()
    findAll(
        @Query('departmentId') departmentId?: string,
        @Query('status') status?: TransactionStatus
    ) {
        if (departmentId) {
            return this.transactionService.findByDepartment(departmentId);
        }
        if (status) {
            return this.transactionService.findByStatus(status);
        }
        return this.transactionService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionService.findOne(id);
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

    @Post(':id/departments/:departmentId/approve')
    async approveDepartment(
        @Param('id') id: string,
        @Body() approveDto: ApproveDepartmentDto
    ) {
        return this.transactionService.approveDepartment(id, approveDto);
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
