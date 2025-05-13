import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from 'src/prisma/prisma.service';
import { jakartaTime } from '../helpers/common.helpers';

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

    // Kalau belum ada, buat baru
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          password: 'google-auth', // Password dummy, bisa diubah sesuai kebutuhan
          username: email.split('@')[0], // Ambil username dari email
          pin: '000000',
          created_at: jakartaTime().toSeconds(),
          updated_at: jakartaTime().toSeconds(),
        },
      });
    }

    // Kembalikan user ke Passport (akan masuk ke req.user)
    done(null, user);
  }
}
