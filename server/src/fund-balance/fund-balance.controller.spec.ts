import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceController } from './fund-balance.controller';
import { FundBalanceService } from './fund-balance.service';

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const FUND_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

describe('FundBalanceController', () => {
  let controller: FundBalanceController;
  let service: {
    getAllFundBalances: jest.Mock;
    getFundBalance: jest.Mock;
    getFundFinancialSummary: jest.Mock;
    checkSufficientFunds: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAllFundBalances: jest.fn(),
      getFundBalance: jest.fn(),
      getFundFinancialSummary: jest.fn(),
      checkSufficientFunds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundBalanceController],
      providers: [{ provide: FundBalanceService, useValue: service }],
    }).compile();

    controller = module.get<FundBalanceController>(FundBalanceController);
  });

  it('findAll returns summary envelope', async () => {
    const summaryData = {
      funds: [
        {
          fundId: FUND_ID,
          fundName: 'Zakat',
          openingBalance: '1000.00',
          totalIncome: '5000.00',
          totalExpenses: '2000.00',
          incomingTransfers: '0.00',
          outgoingTransfers: '0.00',
          availableBalance: '4000.00',
        },
      ],
      totalAvailableBalance: '4000.00',
    };
    service.getAllFundBalances.mockResolvedValue(summaryData);

    const result = await controller.findAll(ACTOR);

    expect(result).toEqual({
      success: true,
      message: 'Fund balances retrieved successfully',
      data: summaryData,
    });
    expect(service.getAllFundBalances).toHaveBeenCalledWith(ACTOR);
  });

  it('findOne returns single fund balance envelope', async () => {
    const fundData = {
      fundId: FUND_ID,
      fundName: 'Zakat',
      openingBalance: '1000.00',
      totalIncome: '5000.00',
      totalExpenses: '2000.00',
      incomingTransfers: '0.00',
      outgoingTransfers: '0.00',
      availableBalance: '4000.00',
    };
    service.getFundBalance.mockResolvedValue(fundData);

    const result = await controller.findOne(ACTOR, FUND_ID);

    expect(result).toEqual({
      success: true,
      message: 'Fund balance retrieved successfully',
      data: fundData,
    });
    expect(service.getFundBalance).toHaveBeenCalledWith(ACTOR, FUND_ID);
  });

  it('checkSufficient returns sufficient check envelope', async () => {
    const checkData = {
      fundId: FUND_ID,
      fundName: 'Zakat',
      availableBalance: '4000.00',
      requestedAmount: '2000.00',
      sufficient: true,
    };
    service.checkSufficientFunds.mockResolvedValue(checkData);

    const result = await controller.checkSufficient(ACTOR, FUND_ID, '2000.00');

    expect(result).toEqual({
      success: true,
      message: 'Fund sufficient funds check completed',
      data: checkData,
    });
    expect(service.checkSufficientFunds).toHaveBeenCalledWith(ACTOR, FUND_ID, '2000.00');
  });

  it('getSummary returns financial summary envelope', async () => {
    const summaryData = {
      fundId: FUND_ID,
      fundName: 'Zakat',
      openingBalance: '1000.00',
      currency: 'BDT',
      income: { total: '5000.00', count: 2, byStatus: [], byPaymentMethod: [] },
      expenses: { total: '2000.00', count: 1, byStatus: [], byCategory: [] },
      transfersIn: { total: '0.00', count: 0, byStatus: [] },
      transfersOut: { total: '0.00', count: 0, byStatus: [] },
      availableBalance: '4000.00',
    };
    service.getFundFinancialSummary.mockResolvedValue(summaryData);

    const result = await controller.getSummary(ACTOR, FUND_ID, {});

    expect(result).toEqual({
      success: true,
      message: 'Fund financial summary retrieved successfully',
      data: summaryData,
    });
    expect(service.getFundFinancialSummary).toHaveBeenCalledWith(ACTOR, FUND_ID, {});
  });
});
