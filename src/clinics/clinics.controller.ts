import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service.js';
import { CreateClinicDto } from './dto/create-clinic.dto.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';

@ApiTags('clinic')
@ApiCookieAuth()
@Controller('clinic')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  create(@Body() createClinicDto: CreateClinicDto) {
    return this.clinicsService.create(createClinicDto);
  }

  @Get()
  findMine() {
    return this.clinicsService.findMine();
  }

  @Patch()
  update(@Body() updateClinicDto: UpdateClinicDto) {
    return this.clinicsService.update(updateClinicDto);
  }
}
