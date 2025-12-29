import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { RagModule } from '@/common/rag/rag.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [RagModule, SupabaseModule, forwardRef(() => UsersModule)],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService, AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminModule {}
