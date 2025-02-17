import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseObject } from 'src/helper/parse-object';
import { Department } from '../department/schema/department.schema';
import { DepartmentExecution } from '../template/interfaces/transaction-field.interface';
import { Template } from '../template/schema/tamplate.schema';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { Transaction } from './schema/transaction.schema';
import { DepartmentExecutionStatus, DepartmentScheduleStatus, TransactionAction, TransactionStatus } from './types/transaction.enum';

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
                populate: [
                    {
                        path: "departments_execution_ids",
                        model: Department.name,
                        select: "name",
                    },
                    {
                        path: "departments_approval_track",
                        model: Department.name,
                        select: "name",
                    }
                ]
            },
            {
                path: "departments_approval_track.department_id",
                model: Department.name,
                select: "name",
            },
            {
                path: "logs.department_id",
                model: Department.name,
                select: "name",
            },
            {
                path: "template_id.departments_approval_track",
                model: Department.name,
                select: "name",
            },

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
            const departmentsExecution: DepartmentExecution[] = template.departments_execution_ids.map((departmentId, index) => ({
                department_id: departmentId,
                status: DepartmentExecutionStatus.NOT_SEEN
            }));

            const transactionData = {
                ...createTransactionDto,
                departments_approval_track: departmentsApprovalTrack,
                departments_execution: departmentsExecution,
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

    async restart(
        transaction_id: string,
        updateTransactionDto: UpdateTransactionDto,
    ): Promise<Transaction> {
        try {
            const oldTransaction = await this.transactionModel.findById(transaction_id);
            if (!oldTransaction) {
                throw new NotFoundException(`Transaction with ID ${transaction_id} not found`);
            }

            if (!oldTransaction.isArchive) {
                oldTransaction.isArchive = true;
                await oldTransaction.save();
            }

            const template = await this.templateModel.findById(oldTransaction.template_id);
            if (!template) {
                throw new NotFoundException(`Template with ID ${oldTransaction.template_id} not found`);
            }

            const departmentsApprovalTrack = template.departments_approval_track.map((departmentId, index) => ({
                department_id: departmentId,
                status: index === 0 ? DepartmentScheduleStatus.ONGOING : DepartmentScheduleStatus.PENDING,
            }));

            const departmentsExecution: DepartmentExecution[] = template.departments_execution_ids.map((departmentId) => ({
                department_id: departmentId,
                status: DepartmentExecutionStatus.NOT_SEEN,
            }));
            const newTransactionData = {
                template_id: oldTransaction.template_id,
                start_date: updateTransactionDto.start_date,
                departments_approval_track: departmentsApprovalTrack,
                departments_execution: departmentsExecution,
                transaction_owner: oldTransaction.transaction_owner,
                fields: updateTransactionDto.fields,
            };

            const newTransaction = new this.transactionModel(newTransactionData);
            return await newTransaction.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Transaction name must be unique');
            }
            throw error;
        }
    }


    async finishTransaction(transaction_id: string) {
        const objectId = new Types.ObjectId(transaction_id);
        const transaction = await this.transactionModel.findByIdAndUpdate(
            objectId,
            { isArchive: true },
            { new: true }
        ).exec();
    }



    async updateDepartmentExecutionStatus(
        transactionId: string,
        departmentId: string,
        newStatus: DepartmentExecutionStatus,
    ): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(transactionId).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
        }
        const deptExecution = transaction.departments_execution.find(
            (dept) => dept.department_id.toString() === departmentId
        );

        if (!deptExecution) {
            throw new NotFoundException(`Department ${departmentId} not found in the execution list`);
        }
        deptExecution.status = newStatus;

        await transaction.save();

        return this.findOne(transactionId);
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

    async adminApprove(id: string, approveDto: ApproveDepartmentDto): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findById(id)
            .populate(this.populateTemplate())
            .exec() as any;

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        if (!transaction.template?.needAdminApproval) {
            throw new BadRequestException('This transaction does not need admin approval');
        }

        if (transaction.status !== TransactionStatus.FULLY_APPROVED) {
            throw new BadRequestException('Transaction status is not fully approved');
        }

        switch (approveDto.action) {
            case TransactionAction.APPROVE:
                transaction.status = TransactionStatus.ADMIN_APPROVED;
                break;
            case TransactionAction.REJECT:
                transaction.status = TransactionStatus.NOT_APPROVED;
                break;
            case TransactionAction.SEND_BACK:
                if (!Array.isArray(transaction.departments_approval_track) || transaction.departments_approval_track.length === 0) {
                    throw new BadRequestException('No department approval track available to send back');
                }
                const lastIndex = transaction.departments_approval_track.length - 1;
                transaction.departments_approval_track[lastIndex].status = DepartmentScheduleStatus.ONGOING;
                break;
            default:
                throw new BadRequestException('Invalid action provided');
        }

        await transaction.save();
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
        const templateId = new Types.ObjectId(transaction.template_id);

        const template = await this.templateModel.findById(templateId);

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
                if (isLastDepartment) {
                    if (template?.needAdminApproval) {
                        currentDepartment.status = DepartmentScheduleStatus.CHECKING;
                    } else {
                        currentDepartment.status = DepartmentScheduleStatus.DONE;
                    }
                    transaction.status = TransactionStatus.FULLY_APPROVED;
                }
                if (previousDepartment) {
                    previousDepartment.status = DepartmentScheduleStatus.DONE;
                } else {
                    transaction.status = TransactionStatus.PARTIALLY_APPROVED;
                }
                if (nextDepartment) {
                    nextDepartment.status = DepartmentScheduleStatus.ONGOING;
                    currentDepartment.status = DepartmentScheduleStatus.CHECKING;
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
    private async updateTransactionStatus(transaction: Transaction): Promise<void> {
        const allDepartments = transaction.departments_approval_track;
        const approvedCount = allDepartments.filter(
            dep => dep.status === DepartmentScheduleStatus.DONE
        ).length;
        if (approvedCount === allDepartments.length) {
            transaction.status = TransactionStatus.FULLY_APPROVED;
        }
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

    async getMyExecuation(departmentId: string) {
        const objectId = parseObject(departmentId);
        const myTemplateExecuationIds = await this.templateModel.find({
            departments_execution_ids: {
                $in: [objectId]
            },
        }).exec();
        const notNeed = myTemplateExecuationIds.filter(m => !m.needAdminApproval);
        const needAdmin = myTemplateExecuationIds.filter(m => m.needAdminApproval);
        const notNeedAdmin = await this.transactionModel.find({
            template_id: {
                $in: notNeed.map(t => t._id.toString())
            },
            status: TransactionStatus.FULLY_APPROVED
        }).populate(this.populateTemplate()).exec();
        const need = await this.transactionModel.find({
            template_id: {
                $in: needAdmin.map(t => t._id.toString())
            },
            status: TransactionStatus.ADMIN_APPROVED
        }).populate(this.populateTemplate()).exec();
        return [...notNeedAdmin, ...need];
    }

    async getAdminApproval() {
        const needAdminApprovalTemplateIds = await this.templateModel.find({
            needAdminApproval: true
        }).exec();
        return await this.transactionModel.find({
            template_id: {
                $in: needAdminApprovalTemplateIds.map(t => t._id.toString())
            },
            status: TransactionStatus.FULLY_APPROVED
        }).populate(this.populateTemplate()).exec();
    }

    async getMyTransactions(empId: string) {
        return await this.transactionModel.find({ transaction_owner: empId }).populate(this.populateTemplate()).exec();
    }

    async getMyTransactionsArchive(empId: string) {
        return await this.transactionModel.find({ transaction_owner: empId, isArchive: true }).populate(this.populateTemplate()).exec();
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
            action: '',
            note: log.note
        }));
    }

}

