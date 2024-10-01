import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateInternalCommunicationDto } from './dtos/create-internal-communication.dto';
import { GetInternalCommunicationDto } from './dtos/get-internal-communication.dto';
import { InternalCommunications, InternalCommunicationsDocument } from './schema/communications.schema';

@Injectable()
export class InternalCommunicationsService {
    constructor(
        @InjectModel(InternalCommunications.name)
        private internalCommunicationsModel: Model<InternalCommunicationsDocument>,
    ) { }
    async create(createInternalCommunicationDto: CreateInternalCommunicationDto, department_id: string, emp_id: string): Promise<GetInternalCommunicationDto> {
        const communication = new this.internalCommunicationsModel({
            ...createInternalCommunicationDto,
            emp_id: emp_id,
            department_id: department_id
        });

        const savedCommunication = await communication.save();

        const populatedCommunication = await this.internalCommunicationsModel
            .findById(savedCommunication._id)
            .populate('emp_id department_id')
            .exec();
        console.log(populatedCommunication);

        return new GetInternalCommunicationDto(populatedCommunication);
    }


    async findAll(): Promise<GetInternalCommunicationDto[]> {
        const communications = await this.internalCommunicationsModel.find().populate('department_id emp_id').exec();
        return communications.map(communication => new GetInternalCommunicationDto(communication));
    }

    async findOne(id: string): Promise<GetInternalCommunicationDto> {
        const communication = await this.internalCommunicationsModel.findById(id).populate('department_id emp_id').exec();
        if (!communication) {
            throw new NotFoundException('InternalCommunication not found');
        }
        return new GetInternalCommunicationDto(communication);
    }
    async findAllByDepartment(department_id: string): Promise<GetInternalCommunicationDto[]> {
        const communications = await this.internalCommunicationsModel
            .find({ department_id: department_id })
            .populate('department_id emp_id')
            .sort({ createdAt: 1 })
            .exec();

        if (!communications || communications.length === 0) {
            throw new NotFoundException(`No communications found for department ID: ${department_id}`);
        }

        return communications.map(communication => new GetInternalCommunicationDto(communication));
    }


}
