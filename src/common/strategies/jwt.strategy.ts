// NestJS Libraries
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    let ownerId = payload.sub;

    // Jika yang login adalah staff
    if (payload.is_staff) {
      const accessToken = req.headers.authorization?.split(' ')[1];
      // pastikan tokennya ada dan valid
      const validToken = await this.prisma.employee_login_sessions.findFirst({
        where: {
          employee_id: payload.employeeId,
          expires_at: {
            gt: new Date(),
          },
          access_token: accessToken,
        },
      });

      if (!validToken) {
        throw new UnauthorizedException('Invalid token');
      }

      // pastikan staff tidak mengakses store yang tidak diberi izin
      const storeEmployee = await this.prisma.stores_has_employees.findFirst({
        where: {
          employees_id: payload.employeeId,
          stores_id: storeId,
        },
      });
      if (!storeEmployee) {
        throw new ForbiddenException(
          'You are not authorized to access this store',
        );
      }

      ownerId = payload.ownerId;
    }

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
                    where: {
                      store_id: storeId,
                      // hide permission yang tidak sesuai dengan paket langganan yang dimiliki user
                      permissions: {
                        key: {
                          // list ini gak bakal / gak butuh di tampilkan di UI
                          notIn: ['self_order'],
                        },
                        sub_package_access: {
                          some: {
                            subs_package: {
                              users: {
                                some: {
                                  id: parseInt(ownerId),
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    include: {
                      permissions: true,
                    },
                  },
                },
              },
            }),
      },
    });
    return {
      ...user,
      ownerId,
    };
  }
}
