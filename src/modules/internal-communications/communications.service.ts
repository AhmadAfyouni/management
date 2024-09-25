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

    async create(createInternalCommunicationDto: CreateInternalCommunicationDto): Promise<GetInternalCommunicationDto> {
        const communication = new this.internalCommunicationsModel(createInternalCommunicationDto);
        const savedCommunication = await (await communication.save()).populate("emp_id department_id");
        return new GetInternalCommunicationDto(savedCommunication);
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
}
