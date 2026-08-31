import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { env, type AppConfig } from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { buildLoggerOptions } from './config/logger.config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { MosqueModule } from './mosque/mosque.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { PrayerTimesModule } from './prayer-times/prayer-times.module';
import { JumuahModule } from './jumuah/jumuah.module';
import { RamadanModule } from './ramadan/ramadan.module';
import { IftarSponsorshipModule } from './iftar-sponsorship/iftar-sponsorship.module';
import { DonationFundsModule } from './donation-funds/donation-funds.module';
import { DonationCampaignsModule } from './donation-campaigns/donation-campaigns.module';
import { DonationsModule } from './donations/donations.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BudgetsModule } from './budgets/budgets.module';
import { SalariesModule } from './salaries/salaries.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { FundBalanceModule } from './fund-balance/fund-balance.module';
import { FundTransfersModule } from './fund-transfers/fund-transfers.module';
import { FundsModule } from './funds/funds.module';
import { ContributionsModule } from './contributions/contributions.module';
import { MailModule } from './mail/mail.module';

/**
 * The composition root.
 *
 * A modular monolith: one deployable, with each domain a Nest module that owns its controllers,
 * services and DTOs. Feature modules are registered here as the phases land.
 *
 * The rate-limit guard is bound globally rather than per-controller so an endpoint added later is
 * protected by default; auth-specific routes tighten it further with their own `@Throttle`.
 *
 * The three request guards are global, and the order they appear in below is the order Nest runs them:
 * authenticate, then check the role, then check the permission. That sequence is the point —
 * `RolesGuard` and `PermissionsGuard` read `request.user`, and only `JwtAuthGuard` puts it there.
 *
 * `JwtAuthGuard` first means closed by default: a route is authenticated unless it says `@Public()`, so a
 * new endpoint added in a later phase is protected by omission rather than exposed by it. The health
 * probes and the three credential routes carry that marker; nothing else should.
 *
 * The two authorization guards then pass through when a handler carries no `@Roles()` or `@Permissions()`
 * metadata — a route asks for authority by declaring it, and a route that declares none is refused
 * nothing. What they will not do is *assume* authority: with no `request.user`, a route that declares a
 * permission answers 401 rather than running.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Validated before any provider is constructed, so a bad secret is a startup failure.
      validate: validateEnvironment,
      envFilePath: ['.env'],
    }),

    LoggerModule.forRootAsync({
      // `inject` names the token that supplies the instance; the parameter type is only a
      // compile-time view over `get()`. Declaring `AppConfig` here is what lets `env.*` infer a real
      // type from the validated schema — the generic cannot be attached to the token itself, and
      // asserting one ConfigService shape onto the other is not a conversion TypeScript will accept.
      inject: [ConfigService],
      useFactory: (config: AppConfig) => buildLoggerOptions(config),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfig) => ({
        // The window is configured in seconds because that is how an operator thinks about it;
        // Nest wants milliseconds.
        throttlers: [{ ttl: env.throttleTtl(config) * 1000, limit: env.throttleLimit(config) }],
      }),
    }),

    PrismaModule,
    // Global, like `PrismaModule`, and registered beside it for the same reason: every module after this
    // line is a potential writer to the audit trail, and none of them should have to remember to ask.
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    MosqueModule,
    VolunteersModule,
    PrayerTimesModule,
    JumuahModule,
    RamadanModule,
    IftarSponsorshipModule,
    // Funds first, then campaigns: a campaign is filed under a fund, and reading them in that order is
    // the same order the two tables relate in. Donations come after both, because a donation names one of
    // each. Expenses next — money out reads after money in, and it references neither of the others.
    DonationFundsModule,
    DonationCampaignsModule,
    DonationsModule,
    ExpensesModule,
    ReceiptsModule,
    TransactionsModule,
    FundBalanceModule,
    FundTransfersModule,
    FundsModule,
    ContributionsModule,
    MailModule,

    // Then what the money was meant for and who it went to. Budgets and salaries are independent of each
    // other and of the three above; reports come last because they read all four tables and nothing reads
    // them. Registration order does not affect resolution — Nest builds the graph from the dependencies —
    // so this ordering is for whoever reads the list.
    BudgetsModule,
    SalariesModule,
    FinancialReportsModule,
    // Approvals is a peer of the business modules, not a layer over them: it records that a decision was asked for
    // and made, and holds no reference to any of the tables above. Reports and the dashboard come last because they
    // read everything and nothing reads them.
    ApprovalsModule,
    ReportsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
