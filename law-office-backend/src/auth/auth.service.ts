import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/DTO/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ✅ Fixed signup - now returns tokens
  async signup(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    console.log('Hashed password:', hashedPassword);
    const verificationStatus =
      createUserDto.role === 'lawyer' ? 'pending' : 'approved';

    // Create the user
    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
      verificationStatus,
    });

    console.log('✅ User created successfully:', {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

    // ✅ Generate tokens and return them (just like login does)
    const payload = {
      email: newUser.email,
      sub: newUser._id,
      role: newUser.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      id: newUser._id,
      role: newUser.role,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile,
        avatarUrl: newUser.avatarUrl,
      },
    };
  }

  // ✅ Validate user for login
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

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

    return user;
  }

  // ✅ Login
  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      id: user._id,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        avatarUrl: user.avatarUrl,
      },
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
}
