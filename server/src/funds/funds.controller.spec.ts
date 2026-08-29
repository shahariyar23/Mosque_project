import { Test, TestingModule } from '@nestjs/testing';
import { FundStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import type { FundDetailsResponseDto } from './dto/fund-details-response.dto';
import type { FundsSummaryResponseDto } from './dto/funds-summary-response.dto';

const ACTOR: AuthenticatedUser = {
  id: '1f8c6cfe-6fe5-11d2-883f-0016d3cca777',
  mosqueId: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: ['fund.view', 'finance.view'],
  deniedPermissions: [],
  isActive: true,
};

const SAMPLE_FUND: FundDetailsResponseDto = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'General Fund',
  slug: 'general-fund',
  description: 'General fund',
  status: FundStatus.active,
  currency: 'BDT',
  openingBalance: '1000.00',
  totalIncome: '5000.00',
  totalExpenses: '2000.00',
  incomingTransfers: '1000.00',
  outgoingTransfers: '500.00',
  availableBalance: '4500.00',
  targetAmount: null,
  startDate: null,
  endDate: null,
  isPublic: true,
  campaignCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('FundsController', () => {
  let controller: FundsController;
  let service: {
    getAllFunds: jest.Mock;
    getFundById: jest.Mock;
    getFundBalance: jest.Mock;
    getFundsSummary: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAllFunds: jest.fn(),
      getFundById: jest.fn(),
      getFundBalance: jest.fn(),
      getFundsSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundsController],
      providers: [{ provide: FundsService, useValue: service }],
    }).compile();

    controller = module.get<FundsController>(FundsController);
  });

  describe('getAllFunds', () => {
    it('returns all funds with balances', async () => {
      service.getAllFunds.mockResolvedValue([SAMPLE_FUND]);

      const result = await controller.getAllFunds(ACTOR);

      expect(service.getAllFunds).toHaveBeenCalledWith(ACTOR);
      expect(result).toEqual({
        success: true,
        message: 'Funds retrieved successfully',
        data: [SAMPLE_FUND],
      });
    });
  });

  describe('getFundById', () => {
    it('returns single fund with balance details', async () => {
      service.getFundById.mockResolvedValue(SAMPLE_FUND);

      const result = await controller.getFundById(ACTOR, SAMPLE_FUND.id);

      expect(service.getFundById).toHaveBeenCalledWith(ACTOR, SAMPLE_FUND.id);
      expect(result).toEqual({
        success: true,
        message: 'Fund retrieved successfully',
        data: SAMPLE_FUND,
      });
    });
  });

  describe('getFundBalance', () => {
    it('returns balance breakdown for a fund', async () => {
      const balanceData = {
        fundId: SAMPLE_FUND.id,
        fundName: SAMPLE_FUND.name,
        currency: 'BDT',
        openingBalance: '1000.00',
        totalIncome: '5000.00',
        totalExpenses: '2000.00',
        incomingTransfers: '1000.00',
        outgoingTransfers: '500.00',
        availableBalance: '4500.00',
      };
      service.getFundBalance.mockResolvedValue(balanceData);

      const result = await controller.getFundBalance(ACTOR, SAMPLE_FUND.id);

      expect(service.getFundBalance).toHaveBeenCalledWith(ACTOR, SAMPLE_FUND.id);
      expect(result).toEqual({
        success: true,
        message: 'Fund balance retrieved successfully',
        data: balanceData,
      });
    });
  });

  describe('getFundsSummary', () => {
    it('returns overall funds summary', async () => {
      const summary: FundsSummaryResponseDto = {
        currency: 'BDT',
        totalAvailableBalance: '4500.00',
        totalOpeningBalance: '1000.00',
        totalIncome: '5000.00',
        totalExpenses: '2000.00',
        totalTransfers: '1000.00',
        fundCount: 1,
        funds: [SAMPLE_FUND],
      };
      service.getFundsSummary.mockResolvedValue(summary);

      const result = await controller.getFundsSummary(ACTOR);

      expect(service.getFundsSummary).toHaveBeenCalledWith(ACTOR);
      expect(result).toEqual({
        success: true,
        message: 'Funds summary retrieved successfully',
        data: summary,
      });
    });
  });
});
