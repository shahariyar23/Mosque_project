import { Test, TestingModule } from '@nestjs/testing';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundTransfersController } from './fund-transfers.controller';
import { FundTransfersService } from './fund-transfers.service';
import type { CreateFundTransferDto } from './dto/create-fund-transfer.dto';
import type { FundTransferResponseDto } from './dto/fund-transfer-response.dto';

const ACTOR: AuthenticatedUser = {
  id: '1f8c6cfe-6fe5-11d2-883f-0016d3cca777',
  mosqueId: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: ['fund.manage'],
  deniedPermissions: [],
  isActive: true,
};

describe('FundTransfersController', () => {
  let controller: FundTransfersController;
  let service: { transfer: jest.Mock };

  beforeEach(async () => {
    service = {
      transfer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundTransfersController],
      providers: [{ provide: FundTransfersService, useValue: service }],
    }).compile();

    controller = module.get<FundTransfersController>(FundTransfersController);
  });

  describe('transfer', () => {
    it('delegates transfer request to FundTransfersService', async () => {
      const dto: CreateFundTransferDto = {
        fromFundId: '11111111-1111-1111-1111-111111111111',
        toFundId: '22222222-2222-2222-2222-222222222222',
        amount: '3000.00',
      };

      const response: FundTransferResponseDto = {
        id: '33333333-3333-3333-3333-333333333333',
        transferReference: 'TRF-001',
        fromFundId: '11111111-1111-1111-1111-111111111111',
        fromFundName: 'General Fund',
        toFundId: '22222222-2222-2222-2222-222222222222',
        toFundName: 'Building Fund',
        amount: '3000.00',
        currency: 'BDT',
        description: 'Transfer from General Fund to Building Fund',
        reference: 'TRF-001',
        transactedAt: '2026-08-29T10:00:00.000Z',
        fromFundRemainingBalance: '7000.00',
        toFundNewBalance: '5000.00',
      };

      service.transfer.mockResolvedValue(response);

      const result = await controller.transfer(ACTOR, dto);

      expect(service.transfer).toHaveBeenCalledWith(ACTOR, dto);
      expect(result).toEqual({
        success: true,
        message: 'Fund transfer completed successfully',
        data: response,
      });
    });
  });
});
