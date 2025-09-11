import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PinGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const pinHeader = req.headers['pin'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded: any;

    try {
      decoded = this.jwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (!user.pin) return true; // Jika user belum set PIN, tidak perlu cek

    // const match = await bcrypt.compare(pinHeader || '', user.pin);
    // if (!match) throw new BadRequestException('Pin is not valid');

    req.user = user;
    return true;
  }
}
