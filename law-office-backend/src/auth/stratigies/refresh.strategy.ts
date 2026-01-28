import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const token = req.headers['authorization']?.replace('Bearer ', '');
          console.log('Refresh token received:', token);
          return token;
        },
      ]),
      secretOrKey: 'mohammed123', // refresh token secret
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (!payload) throw new UnauthorizedException();
    return payload; // attached to req.user
  }
}
