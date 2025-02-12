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
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
    constructor(private readonly templateService: TemplateService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createTemplateDto: CreateTemplateDto) {
        return this.templateService.create(createTemplateDto);
    }

    @Get()
    findAll(
        @Query('type') type?: string,
        @Query('departmentId') departmentId?: string
    ) {
        if (departmentId) {
            return this.templateService.findByDepartmentId(departmentId);
        }
        if (type) {
            return this.templateService.findByType(type);
        }
        return this.templateService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.templateService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateTemplateDto: UpdateTemplateDto,
    ) {
        return this.templateService.update(id, updateTemplateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.templateService.remove(id);
    }
}
