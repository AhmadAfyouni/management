import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { GetDepartment } from 'src/common/decorators/user-guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { InternalCommunicationsService } from './communications.service';
import { CreateInternalCommunicationDto } from './dtos/create-internal-communication.dto';
import { GetInternalCommunicationDto } from './dtos/get-internal-communication.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('internal-communications')
export class InternalCommunicationsController {
  constructor(private readonly internalCommunicationsService: InternalCommunicationsService) { }

  // @Post()
  // async create(@Body() createInternalCommunicationDto: CreateInternalCommunicationDto) {
  //   return this.internalCommunicationsService.create(createInternalCommunicationDto);
  // }

  @Get()
  async findAll(): Promise<GetInternalCommunicationDto[]> {
    return this.internalCommunicationsService.findAll();
  }

  // @Get('messa/:id')
  // async findOne(@Param('id') id: string): Promise<GetInternalCommunicationDto> {
  //   return this.internalCommunicationsService.findOne(id);
  // }

  @Get('/chats')
  async findByDepartment(@GetDepartment() department): Promise<GetInternalCommunicationDto[]> {
    return this.internalCommunicationsService.findAllByDepartment(department);
  }
}
