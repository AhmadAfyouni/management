import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { Transaction } from './schema/transaction.schema';
import { DepartmentScheduleStatus, TransactionStatus } from './types/transaction.enum';

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name)
        private readonly transactionModel: Model<Transaction>,
    ) { }

    async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
        try {
            const createdTransaction = new this.transactionModel(createTransactionDto);
            return await createdTransaction.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Transaction name must be unique');
            }
            throw error;
        }
    }

    async findAll(): Promise<Transaction[]> {
        return this.transactionModel
            .find()
            .exec();
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findById(id)
            .exec();

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }

    async findByDepartment(departmentId: string): Promise<Transaction[]> {
        return this.transactionModel
            .find({ current_department_id: departmentId })
            .exec();
    }

    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return this.transactionModel
            .find({ status })
            .exec();
    }

    async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findByIdAndUpdate(id, updateTransactionDto, { new: true })
            .exec();

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }

    async addLog(id: string, logDto: TransactionLogDto): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findById(id)
            .exec();

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        transaction.logs.push(logDto);
        return transaction.save();
    }

    async updateStatus(id: string, status: TransactionStatus): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findByIdAndUpdate(id, { status }, { new: true })
            .exec();

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }

    async remove(id: string): Promise<void> {
        const result = await this.transactionModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
    }

    async approveDepartment(id: string, approveDto: ApproveDepartmentDto): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(id).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        // Find and update department status
        const departmentSchedule = transaction.departments_approval_track.find(
            dep => dep.department_id.toString() === approveDto.department_id
        );

        if (!departmentSchedule) {
            throw new NotFoundException(`Department ${approveDto.department_id} not found in approval track`);
        }

        departmentSchedule.status = approveDto.status;

        // Add log entry
        transaction.logs.push({
            department_id: approveDto.department_id,
            finished_at: new Date().toISOString(),
            note: approveDto.note
        });

        // Update overall transaction status
        await this.updateTransactionStatus(transaction);

        return transaction.save();
    }

    private async updateTransactionStatus(transaction: Transaction): Promise<void> {
        const allDepartments = transaction.departments_approval_track;
        const approvedCount = allDepartments.filter(
            dep => dep.status === DepartmentScheduleStatus.DONE
        ).length;

        if (allDepartments.some(dep => dep.status === DepartmentScheduleStatus.PENDING)) {
            transaction.status = TransactionStatus.NOT_APPROVED;
        } else if (approvedCount === 0) {
            transaction.status = TransactionStatus.NOT_APPROVED;
        } else if (approvedCount === allDepartments.length) {
            transaction.status = TransactionStatus.FULLY_APPROVED;
        } else {
            transaction.status = TransactionStatus.PARTIALLY_APPROVED;
        }
    }

    async findByDepartmentAndStatus(
        departmentId: string,
        status?: DepartmentScheduleStatus
    ): Promise<Transaction[]> {
        const query: any = {
            'departments_approval_track': {
                $elemMatch: {
                    department_id: departmentId
                }
            }
        };

        if (status) {
            query['departments_approval_track.$elemMatch'].status = status;
        }

        return this.transactionModel
            .find(query)
            .populate('template_id')
            .exec();
    }

    async getDepartmentProgress(id: string): Promise<{
        departmentId: string;
        status: DepartmentScheduleStatus;
        approvedAt?: string;
    }[]> {
        const transaction = await this.findOne(id);

        return transaction.departments_approval_track.map(dep => {
            const log = transaction.logs.find(
                l => l.department_id.toString() === dep.department_id.toString() &&
                    dep.status === DepartmentScheduleStatus.DONE
            );

            return {
                departmentId: dep.department_id,
                status: dep.status,
                approvedAt: log?.finished_at
            };
        });
    }

    async getCurrentDepartmentTasks(departmentId: string): Promise<Transaction[]> {
        return this.transactionModel
            .find({
                'departments_approval_track': {
                    $elemMatch: {
                        department_id: departmentId,
                        status: DepartmentScheduleStatus.PENDING
                    }
                }
            })
            .populate('template_id')
            .exec();
    }

    async getTransactionHistory(id: string): Promise<{
        timestamp: string;
        department: string;
        action: string;
        note: string;
    }[]> {
        const transaction = await this.findOne(id);
        return transaction.logs.map(log => ({
            timestamp: log.finished_at,
            department: log.department_id.toString(),
            action: 'Department Action',
            note: log.note
        }));
    }

}

