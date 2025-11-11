import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Layer1RulesDto } from '../layer1-rules.dto';

describe('TldFiltersDto', () => {
  it('should accept valid custom array', () => {
    const dto = plainToClass(Layer1RulesDto, {
      tld_filters: {
        custom: ['.crypto', '.web3'],
      },
    });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept missing custom field', () => {
    const dto = plainToClass(Layer1RulesDto, {
      tld_filters: {
        commercial: ['.com'],
      },
    });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject non-string custom values', () => {
    const dto = plainToClass(Layer1RulesDto, {
      tld_filters: {
        custom: [123, '.crypto'],
      },
    });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
