// src/cases/cases.controller.ts
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
  Query,
} from '@nestjs/common';
import { CasesService } from './cases.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  RequestCaseDto,
  AcceptCaseDto,
  DeclineCaseDto,
  ClientFeeResponseDto,
} from './DTO/case.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // Client submits a case request to a lawyer
  @Post('request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('client')
  async createRequest(@Body() requestDto: RequestCaseDto, @Req() req: any) {
    return this.casesService.createRequest(requestDto, req.user.sub);
  }

  // Lawyer views pending requests
  @Get('requests/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async pending(@Req() req: any) {
    return this.casesService.findPendingRequests(req.user.sub, req.user.role);
  }

  // Client views their submitted requests (pending/declined/info requested)
  @Get('requests/my')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('client')
  async myRequests(@Req() req: any) {
    return this.casesService.findMyRequests(req.user.sub);
  }

  @Patch(':id/fee-response')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('client')
  async respondToFee(
    @Param('id') id: string,
    @Body() responseDto: ClientFeeResponseDto,
    @Req() req: any,
  ) {
    return this.casesService.respondToFee(
      id,
      req.user.sub,
      responseDto.accept,
      responseDto.note,
    );
  }

  // Lawyer accepts a case (can set fee)
  @Patch(':id/accept')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async accept(
    @Param('id') id: string,
    @Body() acceptDto: AcceptCaseDto,
    @Req() req: any,
  ) {
    return this.casesService.acceptCase(
      id,
      req.user.sub,
      req.user.role,
      acceptDto.fee,
    );
  }

  // Lawyer declines a case
  @Patch(':id/decline')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async decline(
    @Param('id') id: string,
    @Body() declineDto: DeclineCaseDto,
    @Req() req: any,
  ) {
    return this.casesService.declineCase(id, req.user.sub, declineDto.reason);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async create(@Body() createCaseDto: CreateCaseDto, @Req() req: any) {
    return this.casesService.create(createCaseDto, req.user.sub, req.user.role);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findAll(
    @Req() req: any,
    @Query('status') status?: string | string[],
    @Query('includeStatus') includeStatus?: string | string[],
  ) {
    const combinedStatuses = [
      ...normalizeStatuses(status),
      ...normalizeStatuses(includeStatus),
    ];
    const uniqueStatuses =
      combinedStatuses.length > 0 ? Array.from(new Set(combinedStatuses)) : undefined;

    return this.casesService.findAll(
      req.user.sub,
      req.user.role,
      uniqueStatuses,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.casesService.findOne(id, req.user.sub, req.user.role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @Req() req: any,
  ) {
    return this.casesService.update(
      id,
      updateCaseDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.casesService.updateStatus(
      id,
      status,
      req.user.sub,
      req.user.role,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.casesService.remove(id, req.user.sub, req.user.role);
  }
}

function normalizeStatuses(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item) => normalizeStatuses(item));
  }
  return input
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
}
