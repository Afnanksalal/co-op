import { Global, Module } from '@nestjs/common';
import { RetryService } from './retry.service';

@Global()
@Module({
  providers: [RetryService],
  exports: [RetryService],
})
export class RetryModule {}
