import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/DTO/user.dto';
// import { EditUserDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  

  async signup(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    console.log('Hashed password:', hashedPassword);
    const verificationStatus =
      createUserDto.role === 'lawyer' ? 'pending' : 'approved';

    return this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
      verificationStatus,
    });
  }

  // ✅ Validate user for login
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // console.log('--- validateUser debug ---');
    // console.log('Email:', email);
    // console.log('User from DB:', user);
    // console.log('Provided password:', password);

    if (!user) {
      console.log('User not found');
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password matches?', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password');
      return null;
    }

    if (
      user.role === 'lawyer' &&
      user.verificationStatus &&
      user.verificationStatus !== 'approved'
    ) {
      throw new UnauthorizedException(
        'Your account is pending approval or has been rejected',
      );
    }

    // console.log('User validated successfully');
    return user;
  }

  // ✅ Login
  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      id:user._id,
      role:user.role,
    };
  }

  // ✅ Refresh tokens
  async refreshTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  // // ✅ Forgot password
  // async forgotPassword(email: string, newPassword: string) {
  //   const user = await this.usersService.findByEmail(email);
  //   if (!user) throw new NotFoundException('User not found');

  //   const hashedPassword = await bcrypt.hash(newPassword, 10);
  //   return this.usersService.update(user._id, { password: hashedPassword });
  // }

  // // ✅ Update user profile
  // async updateProfile(userId: string, editUserDto: EditUserDto) {
  //   const user = await this.usersService.findById(userId);
  //   if (!user) throw new NotFoundException('User not found');

  //   // Update only provided fields
  //   return this.usersService.update(userId, editUserDto);
  // }
}
