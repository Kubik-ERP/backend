// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { Strategy } from 'passport-local';

// Services
import { AuthenticationService } from '../../modules/authentication/services/authentication.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local-auth') {
  constructor(private readonly _authenticationService: AuthenticationService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this._authenticationService.validateUser(
      username,
      password,
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    const subExpiredAt = user.sub_expired_at
      ? new Date(user.sub_expired_at)
      : null;

    if (subExpiredAt && subExpiredAt <= new Date()) {
      throw new UnauthorizedException('Subscription has expired');
    }

    // if (!user.verified_at) {
    //   throw new UnauthorizedException('Please verify your email address');
    // }

    return user;
  }
}
