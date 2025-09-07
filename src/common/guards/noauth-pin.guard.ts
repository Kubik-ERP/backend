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
export class NoAuthPinGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const email = req.body.email;
    const pinHeader = req.headers['pin'];

    const user = await this.prisma.users.findUnique({
      where: { email: email },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (!user.pin) return true; // Jika user belum set PIN, tidak perlu cek

    const match = await bcrypt.compare(pinHeader || '', user.pin);
    if (!match) throw new BadRequestException('Pin is not valid');

    req.user = user;
    return true;
  }
}
