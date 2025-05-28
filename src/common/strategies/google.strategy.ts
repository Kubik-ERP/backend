import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from 'src/prisma/prisma.service';
import { jakartaTime } from '../helpers/common.helpers';
import { SALT_OR_ROUND } from '../constants/common.constant';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID?.toString() || 'GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
      callbackURL:
        process.env.CALLBACK_URL ||
        'http://localhost:1337/api/authentication/google/redirect',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails, name, photos } = profile;

    const email = emails[0].value;
    const fullName = `${name.givenName} ${name.familyName}`;
    const photo = photos?.[0]?.value;

    // Cari user di DB
    let user = await this.prisma.users.findUnique({ where: { email } });
    console.log(user);
    // Kalau belum ada, buat baru
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email: email,
          password: 'google-auth', // Password dummy, bisa diubah sesuai kebutuhan
          username: email.split('@')[0], // Ambil username dari email
          pin: await bcrypt.hash('000000', SALT_OR_ROUND),
          fullname: fullName,
          phone: '0',
          verified_at: jakartaTime().toUnixInteger(),
          created_at: jakartaTime().toUnixInteger(),
          updated_at: jakartaTime().toUnixInteger(),
        },
      });
    }

    // Kembalikan user ke Passport (akan masuk ke req.user)
    done(null, user);
  }
}
