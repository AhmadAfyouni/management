import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseObject } from 'src/helper/parse-object';
import { Department } from '../department/schema/department.schema';
import { Template } from '../template/schema/tamplate.schema';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { Transaction } from './schema/transaction.schema';
import { DepartmentScheduleStatus, TransactionAction, TransactionStatus } from './types/transaction.enum';

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name)
        private readonly transactionModel: Model<Transaction>,
        @InjectModel(Template.name)
        private readonly templateModel: Model<Template>,
    ) { }



    populateTemplate() {
        return [
            {
                path: 'template_id',
                model: Template.name,
            },
            {
                path: "departments_approval_track.department_id",
                model: Department.name,
                select: "name",
            }
        ];
    }

    async create(createTransactionDto: CreateTransactionDto, empId: string): Promise<Transaction> {
        try {
            const template = await this.templateModel.findById(createTransactionDto.template_id);
            if (!template) {
                throw new NotFoundException(`Template with ID ${createTransactionDto.template_id} not found`);
            }
            const departmentsApprovalTrack = template.departments_approval_track.map((departmentId, index) => ({
                department_id: departmentId,
                status: index == 0 ? DepartmentScheduleStatus.ONGOING : DepartmentScheduleStatus.PENDING
            }));
            const transactionData = {
                ...createTransactionDto,
                departments_approval_track: departmentsApprovalTrack,
                transaction_owner: empId
            };
            const createdTransaction = new this.transactionModel(transactionData);
            return await createdTransaction.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Transaction name must be unique');
            }
            throw error;
        }
    }

    async findAll(): Promise<Transaction[]> {
        return await this.transactionModel
            .find()
            .populate(this.populateTemplate())
            .exec();
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findById(id)
            .populate(this.populateTemplate())
            .exec();

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }



    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return this.transactionModel
            .find({ status })
            .populate(this.populateTemplate())
            .exec();
    }

    async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findByIdAndUpdate(id, updateTransactionDto, { new: true })
            .populate(this.populateTemplate())
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
    async trackDepartment(id: string, approveDto: ApproveDepartmentDto, department_id: string): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(id).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        const currentDepartmentIndex = transaction.departments_approval_track.findIndex(
            dep => dep.department_id.toString() === department_id && dep.status === DepartmentScheduleStatus.ONGOING
        );

        if (currentDepartmentIndex === -1) {
            throw new NotFoundException(`Department ${department_id} not found in approval track or can not action on this transaction`);
        }

        const currentDepartment = transaction.departments_approval_track[currentDepartmentIndex];
        const previousDepartment = currentDepartmentIndex > 0
            ? transaction.departments_approval_track[currentDepartmentIndex - 1]
            : null;
        const nextDepartment = currentDepartmentIndex < transaction.departments_approval_track.length - 1
            ? transaction.departments_approval_track[currentDepartmentIndex + 1]
            : null;

        const isLastDepartment = currentDepartmentIndex === transaction.departments_approval_track.length - 1;


        switch (approveDto.action) {
            case TransactionAction.APPROVE:
                currentDepartment.status = DepartmentScheduleStatus.CHECKING;
                if (previousDepartment) {
                    previousDepartment.status = DepartmentScheduleStatus.DONE;
                } else {
                    transaction.status = TransactionStatus.PARTIALLY_APPROVED;
                }
                if (nextDepartment) {
                    nextDepartment.status = DepartmentScheduleStatus.ONGOING;
                }
                if (isLastDepartment) {
                    transaction.status = TransactionStatus.FULLY_APPROVED;
                }
                break;
            case TransactionAction.REJECT:
                currentDepartment.status = DepartmentScheduleStatus.ONGOING;
                transaction.status = TransactionStatus.NOT_APPROVED;
                break;
            case TransactionAction.SEND_BACK:
                currentDepartment.status = DepartmentScheduleStatus.PENDING;
                if (previousDepartment) {
                    previousDepartment.status = DepartmentScheduleStatus.ONGOING;
                }
                break;
        }

        transaction.logs.push({
            department_id: department_id,
            finished_at: new Date().toISOString(),
            note: approveDto.note,
            action: approveDto.action
        });

        await this.updateTransactionStatus(transaction);

        return transaction.save();
    }

    async getDepartmentTransactions(departmentId: string): Promise<{
        ongoing: Transaction[];
        checking: Transaction[];
    }> {

        const objectId = parseObject(departmentId);
        const ongoingTransactions = await this.transactionModel.find({
            'departments_approval_track': {
                $elemMatch: {
                    'department_id': objectId,
                    'status': DepartmentScheduleStatus.ONGOING
                }
            }
        }).populate(this.populateTemplate()).exec();
        const checkingTransactions = await this.transactionModel.find({
            'departments_approval_track': {
                $elemMatch: {
                    'department_id': objectId,
                    'status': DepartmentScheduleStatus.CHECKING
                }
            }
        }).populate(this.populateTemplate()).exec();

        return {
            ongoing: ongoingTransactions,
            checking: checkingTransactions
        };
    }


    async getMyTransactions(empId: string) {
        return await this.transactionModel.find({ transaction_owner: empId }).populate(this.populateTemplate()).lean().exec();
    }


    private async updateTransactionStatus(transaction: Transaction): Promise<void> {
        const allDepartments = transaction.departments_approval_track;
        const approvedCount = allDepartments.filter(
            dep => dep.status === DepartmentScheduleStatus.DONE
        ).length;
        if (approvedCount === allDepartments.length) {
            transaction.status = TransactionStatus.FULLY_APPROVED;
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
                        status: DepartmentScheduleStatus.ONGOING
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

