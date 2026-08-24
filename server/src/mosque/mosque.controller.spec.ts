import { Test, TestingModule } from '@nestjs/testing';
import { MosqueController } from './mosque.controller';
import { MosqueService } from './mosque.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { Role } from '@prisma/client';

describe('MosqueController', () => {
  let controller: MosqueController;
  let service: MosqueService;

  const mockMosqueId = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
  const mockUser = {
    id: 'user-id',
    email: 'user@example.com',
    mosqueId: mockMosqueId,
    role: Role.mosque_admin,
    sessionId: 'session-id',
  } as unknown as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MosqueController],
      providers: [
        {
          provide: MosqueService,
          useValue: {
            getMosque: jest.fn(),
            updateMosque: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            getFacilities: jest.fn(),
            createFacility: jest.fn(),
            getFacility: jest.fn(),
            updateFacility: jest.fn(),
            deleteFacility: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MosqueController>(MosqueController);
    service = module.get<MosqueService>(MosqueService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMosque', () => {
    it('should call getMosque on the service with user mosqueId', async () => {
      const mockResult = { id: mockMosqueId, name: 'Test' };
      (service.getMosque as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.getMosque(mockUser);
      expect(result).toEqual(mockResult);
      expect(service.getMosque).toHaveBeenCalledWith(mockMosqueId);
    });
  });

  describe('facilities', () => {
    it('should create facility using user mosqueId', async () => {
      const dto = { name: 'Hall' };
      const created = { id: 'facility-id', ...dto, mosqueId: mockMosqueId };
      (service.createFacility as jest.Mock).mockResolvedValue(created);

      const result = await controller.createFacility(mockUser, dto);
      expect(result).toEqual(created);
      expect(service.createFacility).toHaveBeenCalledWith(mockMosqueId, dto);
    });
  });
});
