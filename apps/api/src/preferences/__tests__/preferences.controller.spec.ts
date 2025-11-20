import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesController } from '../preferences.controller';
import { PreferencesService } from '../preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import type { UserPreferences } from '@website-scraper/shared';

describe('PreferencesController', () => {
  let controller: PreferencesController;
  let service: PreferencesService;

  const mockUserPreferences: UserPreferences = {
    id: 'pref-1',
    userId: 'test-user-id',
    theme: 'light',
    sidebarCollapsed: false,
    defaultView: 'cards',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPreferencesService = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        {
          provide: PreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    controller = module.get<PreferencesController>(PreferencesController);
    service = module.get<PreferencesService>(PreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(result).toEqual({ data: mockUserPreferences });
      expect(service.getPreferences).toHaveBeenCalledWith('test-user-id');
    });

    it('should use default user id when no user in request', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = {};
      process.env.DEFAULT_USER_ID = 'default-user';

      await controller.getPreferences(request);

      expect(service.getPreferences).toHaveBeenCalledWith('default-user');

      delete process.env.DEFAULT_USER_ID;
    });

    it('should use fallback user id when env var not set', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = {};
      delete process.env.DEFAULT_USER_ID;

      await controller.getPreferences(request);

      expect(service.getPreferences).toHaveBeenCalledWith('test-user-id');
    });

    it('should return preferences with correct structure', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('theme');
      expect(result.data).toHaveProperty('sidebarCollapsed');
      expect(result.data).toHaveProperty('defaultView');
      expect(result.data).toHaveProperty('createdAt');
      expect(result.data).toHaveProperty('updatedAt');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      mockPreferencesService.getPreferences.mockRejectedValue(error);

      const request = { user: { id: 'test-user-id' } };

      await expect(controller.getPreferences(request)).rejects.toThrow('Database error');
    });

    it('should handle service returning null', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(null);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(result.data).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    const updateDto: UpdatePreferencesDto = {
      theme: 'dark',
      sidebarCollapsed: true,
    };

    const updatedPreferences: UserPreferences = {
      ...mockUserPreferences,
      theme: 'dark',
      sidebarCollapsed: true,
      updatedAt: new Date('2025-01-02'),
    };

    it('should update user preferences', async () => {
      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.updatePreferences(request, updateDto);

      expect(result).toEqual({ data: updatedPreferences });
      expect(service.updatePreferences).toHaveBeenCalledWith('test-user-id', updateDto);
    });

    it('should use default user id when updating without auth', async () => {
      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const request = {};
      process.env.DEFAULT_USER_ID = 'default-user';

      await controller.updatePreferences(request, updateDto);

      expect(service.updatePreferences).toHaveBeenCalledWith('default-user', updateDto);

      delete process.env.DEFAULT_USER_ID;
    });

    it('should pass update dto to service', async () => {
      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const request = { user: { id: 'test-user-id' } };
      const updateData: UpdatePreferencesDto = {
        theme: 'dark',
        sidebarCollapsed: true,
        defaultView: 'table',
      };

      await controller.updatePreferences(request, updateData);

      expect(service.updatePreferences).toHaveBeenCalledWith('test-user-id', updateData);
    });

    it('should return updated preferences with correct structure', async () => {
      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.updatePreferences(request, updateDto);

      expect(result).toHaveProperty('data');
      expect(result.data.theme).toBe('dark');
      expect(result.data.sidebarCollapsed).toBe(true);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdatePreferencesDto = {
        theme: 'dark',
      };

      const partiallyUpdated: UserPreferences = {
        ...mockUserPreferences,
        theme: 'dark',
      };

      mockPreferencesService.updatePreferences.mockResolvedValue(partiallyUpdated);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.updatePreferences(request, partialUpdate);

      expect(result.data.theme).toBe('dark');
      expect(result.data.sidebarCollapsed).toBe(mockUserPreferences.sidebarCollapsed);
    });

    it('should propagate service errors on update', async () => {
      const error = new Error('Update failed');
      mockPreferencesService.updatePreferences.mockRejectedValue(error);

      const request = { user: { id: 'test-user-id' } };

      await expect(controller.updatePreferences(request, updateDto)).rejects.toThrow('Update failed');
    });

    it('should validate update dto structure', async () => {
      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const request = { user: { id: 'test-user-id' } };
      const invalidDto = {
        theme: 'dark',
        // Missing required properties if any
      };

      // Service should be called with the provided dto
      await controller.updatePreferences(request, invalidDto as any);

      expect(service.updatePreferences).toHaveBeenCalledWith('test-user-id', invalidDto);
    });

    it('should handle updating single field', async () => {
      const singleFieldUpdate: UpdatePreferencesDto = {
        sidebarCollapsed: true,
      };

      const singleFieldUpdated: UserPreferences = {
        ...mockUserPreferences,
        sidebarCollapsed: true,
      };

      mockPreferencesService.updatePreferences.mockResolvedValue(singleFieldUpdated);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.updatePreferences(request, singleFieldUpdate);

      expect(result.data.sidebarCollapsed).toBe(true);
      expect(service.updatePreferences).toHaveBeenCalledWith('test-user-id', singleFieldUpdate);
    });

    it('should handle updating multiple fields', async () => {
      const multiFieldUpdate: UpdatePreferencesDto = {
        theme: 'dark',
        sidebarCollapsed: true,
        defaultView: 'table',
      };

      const multiFieldUpdated: UserPreferences = {
        ...mockUserPreferences,
        ...multiFieldUpdate,
      };

      mockPreferencesService.updatePreferences.mockResolvedValue(multiFieldUpdated);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.updatePreferences(request, multiFieldUpdate);

      expect(result.data.theme).toBe('dark');
      expect(result.data.sidebarCollapsed).toBe(true);
      expect(result.data.defaultView).toBe('table');
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have getPreferences method', () => {
      expect(controller.getPreferences).toBeDefined();
      expect(typeof controller.getPreferences).toBe('function');
    });

    it('should have updatePreferences method', () => {
      expect(controller.updatePreferences).toBeDefined();
      expect(typeof controller.updatePreferences).toBe('function');
    });
  });

  describe('userId resolution', () => {
    it('should prioritize authenticated user over defaults', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      process.env.DEFAULT_USER_ID = 'default-user';

      const request = { user: { id: 'authenticated-user' } };
      await controller.getPreferences(request);

      expect(service.getPreferences).toHaveBeenCalledWith('authenticated-user');

      delete process.env.DEFAULT_USER_ID;
    });

    it('should handle empty user object', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      process.env.DEFAULT_USER_ID = 'default-user';

      const request = { user: {} };
      await controller.getPreferences(request);

      expect(service.getPreferences).toHaveBeenCalledWith('default-user');

      delete process.env.DEFAULT_USER_ID;
    });

    it('should handle null user property', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      process.env.DEFAULT_USER_ID = 'default-user';

      const request = { user: null };
      await controller.getPreferences(request);

      expect(service.getPreferences).toHaveBeenCalledWith('default-user');

      delete process.env.DEFAULT_USER_ID;
    });
  });

  describe('response format', () => {
    it('should wrap response in data property', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(Object.keys(result)).toEqual(['data']);
    });

    it('should maintain preference object structure in response', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue(mockUserPreferences);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(result.data).toEqual(mockUserPreferences);
    });

    it('should return same data object from service', async () => {
      const customPrefs = {
        ...mockUserPreferences,
        theme: 'system' as const,
      };

      mockPreferencesService.getPreferences.mockResolvedValue(customPrefs);

      const request = { user: { id: 'test-user-id' } };
      const result = await controller.getPreferences(request);

      expect(result.data).toBe(customPrefs);
    });
  });
});
