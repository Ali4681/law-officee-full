// src/documents/documents.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './DTO/document.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateDocumentDto,
    @Req() req: any,
  ) {
    const uploaderId = req.user.sub;
    const userRole = req.user.role;

    return this.documentsService.create(
      {
        ...createDto,
        uploaderId,
        fileUrl: file.path,
        fileType: file.mimetype,
      },
      uploaderId,
      userRole,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findAll(@Req() req: any) {
    return this.documentsService.findAll(req.user.sub, req.user.role);
  }
  @Get('case/:caseId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findByCase(@Param('caseId') caseId: string, @Req() req: any) {
    return this.documentsService.findByCase(
      caseId,
      req.user.sub,
      req.user.role,
    );
  }
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.findOne(id, req.user.sub, req.user.role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.update(
      id,
      updateDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.remove(id, req.user.sub, req.user.role);
  }

  @Post('save-extracted')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff')
  async saveExtractedDocument(
    @Body()
    data: {
      caseId: string;
      fileUrl: string;
      fileType: string;
      extractedData: any;
      documentType: 'court_decision' | 'contract';
    },
    @Req() req: any,
  ) {
    return this.documentsService.createWithExtractedData(
      {
        ...data,
        uploaderId: req.user.sub,
      },
      req.user.sub,
      req.user.role,
    );
  }
}
