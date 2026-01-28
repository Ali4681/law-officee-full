  // src/hearings/hearings.controller.ts
  import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
  } from '@nestjs/common';
  import { HearingsService } from './hearings.service';
  import { CreateHearingDto, UpdateHearingDto } from './DTO/hearing.dto';
  import { AuthGuard } from '@nestjs/passport';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorator/roles.decorator';

  @Controller('hearings')
  export class HearingsController {
    constructor(private readonly hearingsService: HearingsService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer', 'staff')
    async create(@Body() createHearingDto: CreateHearingDto, @Req() req: any) {
      return this.hearingsService.create(
        createHearingDto,
        req.user.sub,
        req.user.role,
      );
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer', 'staff', 'client')
    async findAll(@Req() req: any) {
      return this.hearingsService.findAll(req.user.sub, req.user.role);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer', 'staff', 'client')
    async findOne(@Param('id') id: string, @Req() req: any) {
      return this.hearingsService.findOne(id, req.user.sub, req.user.role);
    }

    @Get('case/:caseId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer', 'staff', 'client')
    async findByCase(@Param('caseId') caseId: string, @Req() req: any) {
      return this.hearingsService.findByCase(caseId, req.user.sub, req.user.role);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer', 'staff')
    async update(
      @Param('id') id: string,
      @Body() updateHearingDto: UpdateHearingDto,
      @Req() req: any,
    ) {
      return this.hearingsService.update(
        id,
        updateHearingDto,
        req.user.sub,
        req.user.role,
      );
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('lawyer')
    async remove(@Param('id') id: string, @Req() req: any) {
      return this.hearingsService.remove(id, req.user.sub, req.user.role);
    }
  }
