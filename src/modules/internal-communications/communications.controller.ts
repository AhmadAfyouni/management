import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InternalCommunicationsService } from './communications.service';
import { CreateInternalCommunicationDto } from './dtos/create-internal-communication.dto';
import { GetInternalCommunicationDto } from './dtos/get-internal-communication.dto';

@Controller('internal-communications')
export class InternalCommunicationsController {
  constructor(private readonly internalCommunicationsService: InternalCommunicationsService) {}

  @Post()
  async create(@Body() createInternalCommunicationDto: CreateInternalCommunicationDto) {
    return this.internalCommunicationsService.create(createInternalCommunicationDto);
  }
  
  @Get()
  async findAll(): Promise<GetInternalCommunicationDto[]> {
    return this.internalCommunicationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GetInternalCommunicationDto> {
    return this.internalCommunicationsService.findOne(id);
  }
}
