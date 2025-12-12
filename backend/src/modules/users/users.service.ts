import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // TODO: Hash password before storing
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: dto.email,
        name: dto.name,
        passwordHash: dto.password, // TODO: Hash this
      })
      .returning();

    return this.toResponse(user);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return user ? this.toResponse(user) : null;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const [user] = await this.db
      .update(schema.users)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  private toResponse(user: schema.User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
