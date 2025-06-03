import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetAccount } from 'src/common/decorators/user-guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sections')
export class SectionController {
    constructor(private readonly sectionService: SectionService) { }

    @Post()
    async createSection(@Body() createSectionDto: CreateSectionDto, @GetAccount() empId: string) {
        createSectionDto.emp = empId;
        return this.sectionService.createSection(createSectionDto);
    }

    @Get('employee/:empId')
    async getSectionsByEmployee(@Param('empId') empId: string) {
        return this.sectionService.getSectionsByEmployee(empId);
    }

    @Get()
    async getMySections(@GetAccount() empId: string) {
        console.log(empId);

        return this.sectionService.getSectionsByEmployee(empId);
    }

    // @Get('recently-assigned')
    // async getRecentlyAssignedSection(@GetAccount() empId: string) {
    //     return this.sectionService.getRecentlySectionId(empId);
    // }

    // @Get(':id')
    // async getSectionById(@Param('id') id: string) {
    //     return this.sectionService.getSectionById(id);
    // }

    @Put(':id')
    async updateSection(
        @Param('id') id: string,
        @Body() updateSectionDto: UpdateSectionDto
    ) {
        return this.sectionService.updateSection(id, updateSectionDto);
    }

    @Delete(':id')
    async deleteSection(@Param('id') id: string) {
        return this.sectionService.deleteSection(id);
    }
}