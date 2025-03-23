import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {

  private googleClient: OAuth2Client;
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client("244958252159-hl1ir8a7isdhpletnuuvbdobtdcfjebk.apps.googleusercontent.com");
  }

  async register(registerDto: RegisterUserDto) {
    const { username, password, email } = registerDto;
    const newUser = new this.userModel({ username, email, password });
    return newUser.save();
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).exec();
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async verifyGoogleTokenAndLogin(token: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: "244958252159-hl1ir8a7isdhpletnuuvbdobtdcfjebk.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Google token is invalid');
    }

    let user = await this.userService.findOne(payload.email);
    if (!user) {
      user = await this.userService.create({
        username: payload.name,
        email: payload.email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    }

    return this.generateJwtToken(user);
  }
  async generateJwtToken(user: User) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUserByJwt(payload: JwtPayload): Promise<User> {
    return this.userModel.findOne({ _id: payload.sub }).exec();
  }
}
