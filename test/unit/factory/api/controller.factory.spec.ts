import { ApiControllerFactory } from '../../../../src/factory/api/controller.factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateEntityInformation } from '../../../../src/utility/generate-entity-information.utility';
import { analyzeEntityMetadata } from '../../../../src/utility/dto';
import { ErrorException } from '../../../../src/utility/error-exception.utility';
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EApiRouteType } from '../../../../src/enum/decorator/api/route-type.enum';
import {
  ApiControllerApplyDecorators,
  ApiControllerApplyMetadata,
  ApiControllerWriteDtoSwagger,
  ApiControllerWriteMethod,
} from '../../../../src/utility/api';
import { ApiSubscriberExecutor } from '../../../../src/class/api/subscriber/executor.class';
import type { IApiControllerProperties } from '../../../../src/interface/decorator/api/controller/properties.interface';

vi.mock('../../../../src/utility/generate-entity-information.utility');
vi.mock('../../../../src/utility/dto');
vi.mock('../../../../src/utility/api');
vi.mock('../../../../src/class/api/subscriber/executor.class');
vi.mock('@nestjs/common', () => ({
  Controller: vi.fn(() => vi.fn()),
  ConsoleLogger: class ConsoleLogger {},
  Injectable: vi.fn(),
}));
vi.mock('@nestjs/swagger', () => ({
  ApiTags: vi.fn(() => vi.fn()),
}));

describe('ApiControllerFactory', () => {
  const mockEntity = class MockEntity {
    id: string;
  };
  const mockService = {
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getList: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if primary key is not found', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: undefined,
      } as any);

      let errorThrown = false;
      try {
        new ApiControllerFactory(controller, { entity: mockEntity });
      } catch (error) {
        errorThrown = true;
        expect(error.message).toBe(
          '[NestJS-Crud-Automator] Primary key for entity MockEntity not found',
        );
      }
      expect(errorThrown).toBe(true);
    });

    it('should call GenerateEntityInformation and analyzeEntityMetadata', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);

      new ApiControllerFactory(controller, { entity: mockEntity });

      expect(GenerateEntityInformation).toHaveBeenCalledWith(mockEntity);
      expect(analyzeEntityMetadata).toHaveBeenCalledWith(mockEntity);
    });

    it('should call Controller and ApiTags with provided path and name', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);

      new ApiControllerFactory(controller, {
        entity: mockEntity,
        path: 'test-path',
        name: 'TestName',
      });

      expect(Controller).toHaveBeenCalledWith('test-path');
      expect(ApiTags).toHaveBeenCalledWith('TestName');
    });

    it('should call Controller and ApiTags with default path and name', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);

      new ApiControllerFactory(controller, { entity: mockEntity });

      expect(Controller).toHaveBeenCalledWith('mockentity');
      expect(ApiTags).toHaveBeenCalledWith('MockEntity');
    });
  });

  describe('init', () => {
    it('should call createMethod for each route type', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);
      const factory = new ApiControllerFactory(controller, {
        entity: mockEntity,
        routes: {},
      });
      const createMethodSpy = vi.spyOn(factory, 'createMethod');

      factory.init();

      expect(createMethodSpy).toHaveBeenCalledTimes(
        Object.values(EApiRouteType).length,
      );
      Object.values(EApiRouteType).forEach((method) => {
        expect(createMethodSpy).toHaveBeenCalledWith(method);
      });
    });
  });

  describe('createMethod', () => {
    it('should do nothing if the route is disabled', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);
      const factory = new ApiControllerFactory(controller, {
        entity: mockEntity,
        routes: {
          [EApiRouteType.CREATE]: {
            isEnabled: false,
          },
        },
      });

      factory.createMethod(EApiRouteType.CREATE);

      expect(ApiControllerWriteMethod).not.toHaveBeenCalled();
      expect(ApiControllerApplyMetadata).not.toHaveBeenCalled();
      expect(ApiControllerApplyDecorators).not.toHaveBeenCalled();
      expect(ApiControllerWriteDtoSwagger).not.toHaveBeenCalled();
    });

    it('should call the utility functions if the route is enabled', () => {
      const controller = class MockController {};
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
      } as any);
      const factory = new ApiControllerFactory(controller, {
        entity: mockEntity,
        routes: {
          [EApiRouteType.CREATE]: {
            isEnabled: true,
          },
        },
      });

      factory.createMethod(EApiRouteType.CREATE);

      expect(ApiControllerWriteMethod).toHaveBeenCalled();
      expect(ApiControllerApplyMetadata).toHaveBeenCalled();
      expect(ApiControllerApplyDecorators).toHaveBeenCalled();
      expect(ApiControllerWriteDtoSwagger).toHaveBeenCalled();
    });
  });

  describe('generated methods', () => {
    it('should create an entity', async () => {
      const target = {
        service: mockService,
      } as any;

      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const body = { id: 'test-id' };
      mockService.create.mockResolvedValue(body);
      mockService.get.mockResolvedValue(body);

      const result = await (instance as any).__reserved__create(
        body,
        {},
        '::1',
        {},
      );

      expect(mockService.create).toHaveBeenCalledWith(body);
      expect(mockService.get).toHaveBeenCalledWith({
        relations: undefined,
        where: { id: 'test-id' },
      });
      expect(result).toEqual(body);
    });

    it('should delete an entity', async () => {
      const target = {
        service: mockService,
      } as any;
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const params = { id: 'test-id' };
      mockService.delete.mockResolvedValue(undefined);

      await (instance as any).__reserved__delete(params, {}, '::1', {});

      expect(mockService.delete).toHaveBeenCalledWith({ id: 'test-id' });
    });

    it('should get an entity', async () => {
      const target = {
        service: mockService,
      } as any;
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const params = { id: 'test-id' };
      const body = { id: 'test-id' };
      mockService.get.mockResolvedValue(body);

      const result = await (instance as any).__reserved__get(
        params,
        {},
        '::1',
        {},
      );

      expect(mockService.get).toHaveBeenCalledWith({
        relations: undefined,
        where: { id: 'test-id' },
      });
      expect(result).toEqual(body);
    });

    it('should get a list of entities', async () => {
      const target = {
        service: mockService,
      } as any;
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const query = { page: 1, limit: 10 };
      const response = { items: [], total: 0 };
      mockService.getList.mockResolvedValue(response);

      const result = await (instance as any).__reserved__getList(
        query,
        {},
        '::1',
        {},
      );

      expect(mockService.getList).toHaveBeenCalledWith({
        relations: undefined,
        skip: 0,
        take: 10,
        where: {},
      });
      expect(result).toEqual(response);
    });

    it('should update an entity', async () => {
      const target = {
        service: mockService,
      } as any;
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const params = { id: 'test-id' };
      const body = { id: 'test-id' };
      mockService.update.mockResolvedValue(body);

      const result = await (instance as any).__reserved__update(
        params,
        body,
        {},
        '::1',
        {},
      );

      expect(mockService.update).toHaveBeenCalledWith({ id: 'test-id' }, body);
      expect(result).toEqual(body);
    });

    it('should partially update an entity', async () => {
      const target = {
        service: mockService,
      } as any;
      vi.mocked(GenerateEntityInformation).mockReturnValue({
        primaryKey: 'id',
        columns: [{ propertyName: 'id', isPrimary: true }],
      } as any);

      const factory = new ApiControllerFactory(target, {
        entity: mockEntity,
        routes: {},
      });
      factory.init();
      const instance = target;
      const params = { id: 'test-id' };
      const body = { id: 'test-id' };
      mockService.update.mockResolvedValue(body);

      const result = await (instance as any).__reserved__partialUpdate(
        params,
        body,
        {},
        '::1',
        {},
      );

      expect(mockService.update).toHaveBeenCalledWith({ id: 'test-id' }, body);
      expect(result).toEqual(body);
    });
  });
}); 