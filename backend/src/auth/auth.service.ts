import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await this.prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('Seed: Default admin created (admin / admin123)');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
