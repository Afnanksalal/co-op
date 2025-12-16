import { Global, Module } from '@nestjs/common';
import { StreamingService } from './streaming.service';

@Global()
@Module({
  providers: [StreamingService],
  exports: [StreamingService],
})
export class StreamingModule {}
