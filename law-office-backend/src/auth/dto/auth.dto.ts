import { IsEmail,  IsString } from 'class-validator';

export class AuthDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class PayloadDto {
  @IsString()
  @IsEmail()
  email?: string;
  @IsString()
  _id: unknown;
  @IsString()
  username: string;
  @IsString()
  user_type: string;
}

// export class EditUserDto {
//   @IsOptional()
//   @IsString()
//   username?: string;

//   @IsOptional()
//   @IsEmail()
//   email?: string;

//   @IsOptional()
//   @IsString()
//   phone?: string;

//   @IsOptional()
//   @IsString()
//   profile_image?: string;


// }

// export class ForgotPasswordDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   newPassword: string;
// }