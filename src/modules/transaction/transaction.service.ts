import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseObject } from 'src/helper/parse-object';
import { Department } from '../department/schema/department.schema';
import { Emp } from '../emp/schemas/emp.schema';
import { JobTitles } from '../job-titles/schema/job-ttiles.schema';
import { NotificationService } from '../notification/notification.service';
import { Template } from '../template/schema/tamplate.schema';
import { ApproveDepartmentDto } from './dtos/approve-department.dto';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionLogDto } from './dtos/transaction-log.dto';
import { UpdateTransactionDto } from './dtos/update-transaction.dto';
import { DepartmentExecution, DepartmentsArchive, DepartmentSchedule } from './interfaces/transaction.interface';
import { Transaction } from './schema/transaction.schema';
import {
    DepartmentExecutionStatus,
    DepartmentScheduleStatus,
    TransactionAction,
    TransactionStatus,
} from './types/transaction.enum';

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name)
        private readonly transactionModel: Model<Transaction>,
        @InjectModel(Template.name)
        private readonly templateModel: Model<Template>,
        private readonly notificationService: NotificationService,
    ) { }


    private getPopulateOptions() {
        return [
            {
                path: 'template_id',
                model: Template.name,
                populate: [
                    {
                        path: 'departments_execution_ids',
                        populate: [
                            {
                                path: 'employee',
                                model: Emp.name,
                                select: 'name',
                                populate: {
                                    path: "job_id",
                                    model: JobTitles.name,
                                    select: "title"
                                }
                            },
                            {
                                path: 'department',
                                model: Department.name,
                                select: 'name',
                            },
                        ],
                    },
                    {
                        path: 'departments_approval_track',
                        populate: [
                            {
                                path: 'employee',
                                model: Emp.name,
                                select: 'name',
                                populate: {
                                    path: "job_id",
                                    model: JobTitles.name,
                                    select: "title"
                                }
                            },
                            {
                                path: 'department',
                                model: Department.name,
                                select: 'name',
                            },
                        ],
                    },
                    {
                        path: 'departments_archive',
                        populate: [
                            {
                                path: 'employee',
                                model: Emp.name,
                                select: 'name',
                                populate: {
                                    path: "job_id",
                                    model: JobTitles.name,
                                    select: "title"
                                }
                            },
                            {
                                path: 'department',
                                model: Department.name,
                                select: 'name',
                            },
                        ],
                    },
                ],
            },
            {
                path: 'departments_execution',
                populate: [
                    {
                        path: 'employee',
                        model: Emp.name,
                        select: 'name',
                    },
                    {
                        path: 'department_id',
                        model: Department.name,
                        select: 'name',
                    },
                ],
            },
            {
                path: 'departments_approval_track',
                populate: [
                    {
                        path: 'employee',
                        model: Emp.name,
                        select: 'name',
                    },
                    {
                        path: 'department_id',
                        model: Department.name,
                        select: 'name',
                    },
                ],
            },
            {
                path: 'departments_archive',
                populate: [
                    {
                        path: 'employee',
                        model: Emp.name,
                        select: 'name',
                    },
                    {
                        path: 'department_id',
                        model: Department.name,
                        select: 'name',
                    },
                ],
            },
            {
                path: 'logs.department_id',
                model: Department.name,
                select: 'name',
            },
        ];
    }



    async create(
        createTransactionDto: CreateTransactionDto,
        empId: string,
    ): Promise<Transaction> {
        const template = await this.templateModel.findById(createTransactionDto.template_id);
        if (!template) {
            throw new NotFoundException(
                `Template with ID ${createTransactionDto.template_id} not found`,
            );
        }

        const departmentsApprovalTrack: DepartmentSchedule[] = template.departments_approval_track.map(
            (deptSchedule, index) => ({
                department_id: deptSchedule.department,
                status:
                    index === 0
                        ? DepartmentScheduleStatus.ONGOING
                        : DepartmentScheduleStatus.PENDING,
                employee: deptSchedule.employee,
            }),
        );

        const departmentsExecution: DepartmentExecution[] = template.departments_execution_ids.map(
            (deptExec) => ({
                department_id: deptExec.department,
                status: DepartmentExecutionStatus.NOT_DONE,
                employee: deptExec.employee,
            }),
        );

        const departmentsArchive: DepartmentsArchive[] = template.departments_archive.map(
            (deptArch) => ({
                department_id: deptArch.department,
                employee: deptArch.employee,
            }),
        );


        const transactionData = {
            ...createTransactionDto,
            departments_approval_track: departmentsApprovalTrack,
            departments_execution: departmentsExecution,
            departments_archive: departmentsArchive,
            transaction_owner: empId,
        };

        try {
            const createdTransaction = new this.transactionModel(transactionData);
            const savedTransaction = await createdTransaction.save();
            await this.notificationService.notifyTransactionCreated(savedTransaction, empId);
            return savedTransaction;
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ConflictException('Transaction name must be unique');
            }
            throw error;
        }
    }

    async restart(
        transaction_id: string,
        updateTransactionDto: UpdateTransactionDto,
        empId: string
    ): Promise<Transaction> {
        const oldTransaction = await this.transactionModel.findById(transaction_id).withArchived().exec();
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

        const departmentsApprovalTrack: DepartmentSchedule[] = template.departments_approval_track.map(
            (deptSchedule, index) => ({
                department_id: deptSchedule.department,
                status:
                    index === 0
                        ? DepartmentScheduleStatus.ONGOING
                        : DepartmentScheduleStatus.PENDING,
                employee: deptSchedule.employee,
            }),
        );
        const departmentsExecution: DepartmentExecution[] = template.departments_execution_ids.map(
            (deptExec) => ({
                department_id: deptExec.department,
                status: DepartmentExecutionStatus.NOT_DONE,
                employee: deptExec.employee,
            }),
        );
        const departmentsArchive: DepartmentsArchive[] = template.departments_archive.map(
            (deptArch) => ({
                department_id: deptArch.department,
                employee: deptArch.employee,
            }),
        );


        const newTransactionData = {
            template_id: oldTransaction.template_id,
            start_date: updateTransactionDto.start_date,
            departments_approval_track: departmentsApprovalTrack,
            departments_execution: departmentsExecution,
            departments_archive: departmentsArchive,
            transaction_owner: oldTransaction.transaction_owner,
            fields: updateTransactionDto.fields,
        };

        try {
            const newTransaction = new this.transactionModel(newTransactionData);
            const savedTransaction = await newTransaction.save();
            await this.notificationService.notifyTransactionCreated(savedTransaction, empId);

            return savedTransaction;
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ConflictException('Transaction name must be unique');
            }
            throw error;
        }
    }

    async finishTransaction(transaction_id: string): Promise<Transaction> {
        const updated = await this.transactionModel
            .findByIdAndUpdate(transaction_id, { isArchive: true }, { new: true }).withArchived()
            .exec();
        if (!updated) {
            throw new NotFoundException(`Transaction with ID ${transaction_id} not found`);
        }
        return updated;
    }

    async getMyArchiveTransaction(departmentId: string, empId?: string) {
        const objectId = new Types.ObjectId(departmentId);
        const employeeId = new Types.ObjectId(empId);
        const approvalCondition = () => ({
            department_id: objectId,
            $or: [
                { employee: employeeId },
                { employee: { $exists: false } },
                { employee: null },
            ],
        });

        return this.transactionModel.find({
            isArchive: true,
            departments_archive: { $elemMatch: approvalCondition() },
        }).withArchived().populate(this.getPopulateOptions()).exec();
    }

    async updateDepartmentExecutionStatus(
        transactionId: string,
        departmentId: string,
        empId: string,
        newStatus: DepartmentExecutionStatus,
        note?: string
    ): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(transactionId).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
        }
        const deptExecution = transaction.departments_execution.find(
            (dept) => {
                if (dept.employee) {
                    return dept.employee.toString() === empId
                } else {
                    return dept.department_id.toString() === departmentId
                }
            },
        );
        if (!deptExecution) {
            throw new NotFoundException(
                `Department ${departmentId} not found in the execution list`,
            );
        }
        deptExecution.status = newStatus;
        deptExecution.note = note;
        transaction.logs.push(
            {
                department_id: deptExecution.department_id.toString(),
                finished_at: new Date().toISOString(),
                note: note ?? "",
                action: newStatus,
            }
        );
        const isArchived = transaction.departments_execution.some((a) => a.status === DepartmentExecutionStatus.NOT_DONE)
        transaction.isArchive = !isArchived;
        await transaction.save();
        await this.notificationService.notifyTransactionUpdated(
            transaction,
            empId
        );

        return this.findOne(transactionId);
    }

    async findAll(): Promise<Transaction[]> {
        return this.transactionModel.find().populate(this.getPopulateOptions()).exec();
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(id).populate(this.getPopulateOptions()).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }

    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return this.transactionModel.find({ status }).populate(this.getPopulateOptions()).exec();
    }

    async update(
        id: string,
        updateTransactionDto: UpdateTransactionDto,
    ): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findByIdAndUpdate(id, updateTransactionDto, { new: true })
            .populate(this.getPopulateOptions())
            .exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }

    async addLog(id: string, logDto: TransactionLogDto): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(id).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        transaction.logs.push(logDto);
        return transaction.save();
    }

    async updateStatus(id: string, status: TransactionStatus, updaterId: string): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findByIdAndUpdate(id, { status }, { new: true })
            .exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        const oldStatus = transaction.status;

        await this.notificationService.notifyTransactionStatusChanged(
            transaction,
            updaterId,
            oldStatus
        );

        return transaction;
    }

    async adminApprove(id: string, approveDto: ApproveDepartmentDto): Promise<Transaction> {
        const transaction = await this.transactionModel
            .findById(id)
            .populate(this.getPopulateOptions())
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
        const lastIndex = transaction.departments_approval_track.length - 1;
        switch (approveDto.action) {
            case TransactionAction.APPROVE:
                transaction.status = TransactionStatus.ADMIN_APPROVED;
                transaction.departments_approval_track[lastIndex].status = DepartmentScheduleStatus.DONE;
                break;
            case TransactionAction.REJECT:
                transaction.isArchive = true;
                transaction.status = TransactionStatus.NOT_APPROVED;
                break;
            case TransactionAction.SEND_BACK:
                if (
                    !Array.isArray(transaction.departments_approval_track) ||
                    transaction.departments_approval_track.length === 0
                ) {
                    throw new BadRequestException('No department approval track available to send back');
                }
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

    async trackDepartment(
        id: string,
        approveDto: ApproveDepartmentDto,
        departmentId: string,
        empId: string
    ): Promise<Transaction> {
        const transaction = await this.transactionModel.findById(id).exec();
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }
        const template = await this.templateModel.findById(transaction.template_id);
        if (!template) {
            throw new NotFoundException(`Template with ID ${transaction.template_id} not found`);
        }
        const oldStatus = transaction.status;

        const currentIndex = transaction.departments_approval_track.findIndex(
            (dep) =>
                dep.department_id.toString() === departmentId &&
                dep.status === DepartmentScheduleStatus.ONGOING,
        );
        if (currentIndex === -1) {
            throw new NotFoundException(
                `Department ${departmentId} not found in approval track or cannot act on this transaction`,
            );
        }
        const currentDep = transaction.departments_approval_track[currentIndex];
        const previousDep = currentIndex > 0 ? transaction.departments_approval_track[currentIndex - 1] : null;
        const nextDep =
            currentIndex < transaction.departments_approval_track.length - 1
                ? transaction.departments_approval_track[currentIndex + 1]
                : null;
        const isLast = currentIndex === transaction.departments_approval_track.length - 1;
        switch (approveDto.action) {
            case TransactionAction.APPROVE:
                if (isLast) {
                    currentDep.status = template.needAdminApproval
                        ? DepartmentScheduleStatus.CHECKING
                        : DepartmentScheduleStatus.DONE;
                    transaction.status = TransactionStatus.FULLY_APPROVED;
                }
                if (previousDep) {
                    previousDep.status = DepartmentScheduleStatus.DONE;
                } else {
                    transaction.status = TransactionStatus.PARTIALLY_APPROVED;
                }
                if (nextDep) {
                    nextDep.status = DepartmentScheduleStatus.ONGOING;
                    currentDep.status = DepartmentScheduleStatus.CHECKING;
                }
                break;
            case TransactionAction.REJECT:
                currentDep.status = DepartmentScheduleStatus.ONGOING;
                transaction.status = TransactionStatus.NOT_APPROVED;
                transaction.isArchive = true;
                break;
            case TransactionAction.SEND_BACK:
                currentDep.status = DepartmentScheduleStatus.PENDING;
                if (previousDep) {
                    previousDep.status = DepartmentScheduleStatus.ONGOING;
                }
                break;
            default:
                throw new BadRequestException('Invalid action provided');
        }
        transaction.logs.push({
            department_id: departmentId,
            finished_at: new Date().toISOString(),
            note: approveDto.note,
            action: approveDto.action,
        });
        await this.updateTransactionStatus(transaction);
        const savedTransaction = await transaction.save();
        if (oldStatus !== savedTransaction.status) {
            await this.notificationService.notifyTransactionStatusChanged(
                savedTransaction,
                empId,
                oldStatus
            );
        }

        return savedTransaction;
    }

    private async updateTransactionStatus(transaction: Transaction): Promise<void> {
        const approvedCount = transaction.departments_approval_track.filter(
            (dep) => dep.status === DepartmentScheduleStatus.DONE,
        ).length;
        if (approvedCount === transaction.departments_approval_track.length) {
            transaction.status = TransactionStatus.FULLY_APPROVED;
        }
    }

    async getDepartmentTransactions(
        departmentId: string,
        empId: string,
    ): Promise<{ ongoing: Transaction[]; checking: Transaction[] }> {
        const objectId = parseObject(departmentId);
        const employeeId = parseObject(empId);

        const approvalCondition = (status: DepartmentScheduleStatus) => ({
            department_id: objectId,
            status,
            $or: [
                { employee: employeeId },
                { employee: { $exists: false } },
                { employee: null },
            ],
        });

        const ongoingTransactions = await this.transactionModel
            .find({
                departments_approval_track: { $elemMatch: approvalCondition(DepartmentScheduleStatus.ONGOING) },
            })
            .populate(this.getPopulateOptions())
            .exec();

        const checkingTransactions = await this.transactionModel
            .find({
                departments_approval_track: { $elemMatch: approvalCondition(DepartmentScheduleStatus.CHECKING) },
            })
            .populate(this.getPopulateOptions())
            .exec();

        return { ongoing: ongoingTransactions, checking: checkingTransactions };
    }


    async getMyExecution(departmentId: string, empId: string): Promise<Transaction[]> {
        const objectId = parseObject(departmentId);
        const employeeId = parseObject(empId);
        const executionCondition = {
            $elemMatch: {
                $or: [
                    // حالة وجود employee وتساويه للـ employeeId
                    { employee: employeeId },
                    // حالة عدم وجود employee أو قيمته null: يتم التحقق من department_id فقط
                    {
                        $and: [
                            { $or: [{ employee: { $exists: false } }, { employee: null }] },
                            { department_id: objectId }
                        ]
                    }
                ]
            }
        };
        // Retrieve templates that include the given department in their execution list.
        const templates = await this.templateModel.find({
            departments_execution_ids: executionCondition
        }).exec();

        const notNeed = templates.filter((t) => !t.needAdminApproval);
        const needAdmin = templates.filter((t) => t.needAdminApproval);

        const notNeedAdminTransactions = await this.transactionModel.find({
            template_id: { $in: notNeed.map((t) => t._id.toString()) },
            status: TransactionStatus.FULLY_APPROVED,
            departments_execution: executionCondition,
        })
            .populate(this.getPopulateOptions())
            .exec();

        const needAdminTransactions = await this.transactionModel.find({
            template_id: { $in: needAdmin.map((t) => t._id.toString()) },
            status: TransactionStatus.ADMIN_APPROVED,
            departments_execution: executionCondition,
        })
            .populate(this.getPopulateOptions())
            .exec();

        return [...notNeedAdminTransactions, ...needAdminTransactions];
    }


    async getAdminApproval(empId: string): Promise<Transaction[]> {
        const templatesNeedingAdmin = await this.templateModel.find({
            needAdminApproval: true,
            $or: [
                { admin_approve: { $exists: false } },
                { admin_approve: empId }
            ]
        }).exec();

        return this.transactionModel
            .find({
                template_id: { $in: templatesNeedingAdmin.map((t) => t._id.toString()) },
                status: TransactionStatus.FULLY_APPROVED,
            })
            .populate(this.getPopulateOptions())
            .exec();
    }


    async getMyTransactions(empId: string): Promise<Transaction[]> {
        return this.transactionModel
            .find({ transaction_owner: empId })
            .withArchived()
            .populate(this.getPopulateOptions())
            .exec();
    }

    async getMyTransactionsArchive(empId: string): Promise<Transaction[]> {
        return this.transactionModel
            .find({ transaction_owner: empId, isArchive: true })
            .populate(this.getPopulateOptions())
            .exec();
    }

    async findByDepartmentAndStatus(departmentId: string, status?: DepartmentScheduleStatus): Promise<Transaction[]> {
        const query: any = {
            'departments_approval_track': { $elemMatch: { department_id: departmentId } },
        };
        if (status) {
            query['departments_approval_track.$elemMatch'].status = status;
        }
        return this.transactionModel.find(query).populate('template_id').exec();
    }

    async getCurrentDepartmentTasks(departmentId: string): Promise<Transaction[]> {
        return this.transactionModel
            .find({
                'departments_approval_track': { $elemMatch: { department_id: departmentId, status: DepartmentScheduleStatus.ONGOING } },
            })
            .populate('template_id')
            .exec();
    }
}
