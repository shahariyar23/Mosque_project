import { Module } from '@nestjs/common';

import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';

/**
 * Wires the salary endpoints.
 *
 * No `imports`: `PrismaModule` is `@Global()`, so `PrismaService` is already injectable here, and the guards that
 * enforce `salary.view`, `salary.viewOwn` and `salary.manage` are registered globally in `AppModule`.
 *
 * Nothing is exported. The financial reports read the `salary_records` table through Prisma directly rather than
 * through `SalariesService`, because they need aggregates over many rows and this service returns paginated
 * response DTOs — one page of `SalaryRecordResponseDto` is the wrong shape to sum, and summing in memory is what
 * the reports are written to avoid.
 */
@Module({
  controllers: [SalariesController],
  providers: [SalariesService],
})
export class SalariesModule {}
