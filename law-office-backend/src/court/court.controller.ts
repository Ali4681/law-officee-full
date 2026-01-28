// src/court/court.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CourtService } from './court.service';
import { CreateCourtDto } from './DTO/create-court.dto';
import { UpdateCourtDto } from './DTO/update-court.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('courts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CourtController {
  constructor(private courtService: CourtService) {}

  // 🔐 ADMIN ONLY
  @Post()
  @Roles('admin')
  create(@Body() dto: CreateCourtDto) {
    return this.courtService.create(dto);
  }

  // 👩‍⚖️ Lawyers + Clients + Admin
  @Get()
  @Roles('admin', 'lawyer', 'client')
  findAll() {
    return this.courtService.findAll();
  }

  @Get(':id/lawyers')
  @Roles('admin', 'lawyer', 'client', 'staff')
  findLawyers(@Param('id') courtId: string) {
    return this.courtService.findLawyersByCourt(courtId);
  }

  // 👩‍⚖️ Lawyers + Clients + Admin
  @Get(':id')
  @Roles('admin', 'lawyer', 'client')
  findOne(@Param('id') id: string) {
    return this.courtService.findOne(id);
  }

  // 🔐 ADMIN ONLY
  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCourtDto) {
    return this.courtService.update(id, dto);
  }

  // 🔐 ADMIN ONLY
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.courtService.remove(id);
  }
}
