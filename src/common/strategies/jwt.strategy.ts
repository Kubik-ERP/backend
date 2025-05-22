// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { ExtractJwt, Strategy } from 'passport-jwt';

// Services
import { JwtConfigService } from 'src/configurations/jwt/jwt-configuration.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly _jwtConfigService: JwtConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: _jwtConfigService.jwtSecret,
    });
  }

  async validate(payload: IValidateJWTStrategy) {
    const user = await this.prisma.users.findUnique({
      where: {
        id: parseInt(payload.sub),
      }
    });
    return user;
  }
}
