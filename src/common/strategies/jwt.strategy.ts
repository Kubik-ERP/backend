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
  constructor(
    private readonly _jwtConfigService: JwtConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: _jwtConfigService.jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: ICustomRequestHeaders, payload: IValidateJWTStrategy) {
    const storeId = req.store_id;

    const user = await this.prisma.users.findUnique({
      where: {
        id: parseInt(payload.sub),
      },
      include: {
        ...(storeId === undefined
          ? {
              roles: true,
            }
          : // fetch permission wajib ada store_id
            {
              roles: {
                include: {
                  store_role_permissions: {
                    where: { store_id: storeId },
                    include: {
                      permissions: true,
                    },
                  },
                },
              },
            }),
      },
    });
    return user;
  }
}
