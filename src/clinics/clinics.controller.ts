import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClinicEntity } from './entities/clinic.entity.js';
import { ClinicsService } from './clinics.service.js';
import { CreateClinicDto } from './dto/create-clinic.dto.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';

@ApiTags('clinic')
@ApiCookieAuth()
@Controller('clinic')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @ApiCreatedResponse({ type: ClinicEntity })
  @Post()
  create(@Body() createClinicDto: CreateClinicDto) {
    return this.clinicsService.create(createClinicDto);
  }

  @ApiOkResponse({ type: ClinicEntity })
  @Get()
  findMine() {
    return this.clinicsService.findMine();
  }

  @ApiOkResponse({ type: ClinicEntity })
  @Patch()
  update(@Body() updateClinicDto: UpdateClinicDto) {
    return this.clinicsService.update(updateClinicDto);
  }
}
