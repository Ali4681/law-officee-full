// src/court/court.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Court, CourtDocument } from './court.schema';
import { CreateCourtDto } from './DTO/create-court.dto';
import { UpdateCourtDto } from './DTO/update-court.dto';
import { User, UserDocument } from '../users/user.schema';
import { UserRole } from '../users/DTO/user.dto';

@Injectable()
export class CourtService {
  constructor(
    @InjectModel(Court.name)
    private courtModel: Model<CourtDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateCourtDto): Promise<Court> {
    const court = new this.courtModel(dto);
    return court.save();
  }

  async findAll(): Promise<Court[]> {
    return this.courtModel.find().sort({ name: 1 });
  }

  async findOne(id: string): Promise<Court> {
    const court = await this.courtModel.findById(id);
    if (!court) throw new NotFoundException('Court not found');
    return court;
  }

  async update(id: string, dto: UpdateCourtDto): Promise<Court> {
    const updated = await this.courtModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Court not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.courtModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Court not found');
  }

  async findLawyersByCourt(_courtId: string): Promise<User[]> {
    return this.userModel
      .find({
        role: UserRole.LAWYER,
        verificationStatus: 'approved',
      })
      .select('_id email profile avatarUrl specialization verificationStatus')
      .sort({ 'profile.firstName': 1, 'profile.lastName': 1 })
      .lean();
  }
}
