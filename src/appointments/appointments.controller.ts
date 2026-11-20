import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppointmentDetailEntity,
  AppointmentEntity,
  AppointmentPageEntity,
} from './entities/appointment.entity.js';
import { AppointmentsService } from './appointments.service.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { FindAppointmentsDto } from './dto/find-appointments.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

@ApiTags('appointments')
@ApiCookieAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiCreatedResponse({ type: AppointmentEntity })
  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @ApiOkResponse({ type: AppointmentPageEntity })
  @Get()
  findAll(@Query() query: FindAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @ApiOkResponse({ type: AppointmentDetailEntity })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findOne(id);
  }

  @ApiOkResponse({ type: AppointmentEntity })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @ApiOkResponse({ type: AppointmentDetailEntity })
  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.confirm(id);
  }

  @ApiOkResponse({ type: AppointmentDetailEntity })
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelAppointmentDto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(id, cancelAppointmentDto);
  }

  @ApiOkResponse({ type: AppointmentDetailEntity })
  @Post(':id/no-show')
  @HttpCode(200)
  markNoShow(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.markNoShow(id);
  }

  @ApiOkResponse({ type: AppointmentDetailEntity })
  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeAppointmentDto: CompleteAppointmentDto,
  ) {
    return this.appointmentsService.complete(id, completeAppointmentDto);
  }
}
