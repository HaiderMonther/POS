import { Injectable, BadRequestException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.clerkClient.users.getUserList();
    return users.data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.emailAddresses[0]?.emailAddress,
      role: user.publicMetadata.role || 'CASHIER',
      active: user.lastActiveAt !== null,
      lastActive: user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'Never',
    }));
  }

  async create(data: any) {
    try {
      console.log('Attempting to create Clerk user with data:', { ...data, password: '***' });
      const user = await this.clerkClient.users.createUser({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        password: data.password,
        // Generating a dummy email since Clerk often requires an identifier
        emailAddress: [`${data.username}@pos.com`],
        publicMetadata: {
          role: data.role || 'CASHIER',
        },
      });

      // Sync to local database so login works
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await this.prisma.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          role: data.role === 'ADMIN' ? 'ADMIN' : 'CASHIER',
        },
      });

      return user;
    } catch (error: any) {
      console.error('Clerk Create User Error:', error);
      if (error.clerkError) {
        throw new BadRequestException(
          error.errors.map((e: any) => e.message).join(', ')
        );
      }
      // If it's a 400 error but not a standard Clerk error, show the message
      if (error.status === 400 || error.statusCode === 400) {
        throw new BadRequestException(error.message || 'بيانات غير مكتملة');
      }
      throw error;
    }
  }

  async updateRole(id: string, role: string) {
    const user = await this.clerkClient.users.updateUser(id, {
      publicMetadata: {
        role: role,
      },
    });

    // Sync role update to Prisma database using username
    if (user.username) {
      try {
        await this.prisma.user.update({
          where: { username: user.username },
          data: { role: role === 'ADMIN' ? 'ADMIN' : 'CASHIER' }
        });
      } catch (e) {
        console.error('Failed to sync role update to Prisma:', e);
      }
    }

    return user;
  }

  async remove(id: string) {
    const user = await this.clerkClient.users.getUser(id);
    const deletedUser = await this.clerkClient.users.deleteUser(id);

    // Sync deletion to Prisma database
    if (user && user.username) {
      try {
        await this.prisma.user.delete({
          where: { username: user.username }
        });
      } catch (e) {
        console.error('Failed to sync user deletion to Prisma:', e);
      }
    }

    return deletedUser;
  }
}
