import {
  toGrams,
  fromGrams,
  convertWeight,
  formatWeight,
  formatWeightFromGrams,
  WEIGHT_CONVERSION_FACTORS,
  WeightUnit,
} from './weight-conversion';

describe('Weight Conversion Utilities', () => {
  describe('toGrams', () => {
    it('should convert grams to grams (identity)', () => {
      expect(toGrams(100, 'GRAM')).toBe(100);
    });

    it('should convert kilograms to grams', () => {
      expect(toGrams(1, 'KILOGRAM')).toBe(1000);
      expect(toGrams(2.5, 'KILOGRAM')).toBe(2500);
    });

    it('should convert tola to grams', () => {
      expect(toGrams(1, 'TOLA')).toBeCloseTo(11.6638, 4);
      expect(toGrams(10, 'TOLA')).toBeCloseTo(116.638, 4);
    });

    it('should convert laal to grams', () => {
      expect(toGrams(1, 'LAAL')).toBeCloseTo(0.116638, 6);
      expect(toGrams(100, 'LAAL')).toBeCloseTo(11.6638, 4); // 100 laal = 1 tola
    });

    it('should convert troy ounce to grams', () => {
      expect(toGrams(1, 'OUNCE')).toBeCloseTo(31.1035, 4);
    });

    it('should convert pounds to grams', () => {
      expect(toGrams(1, 'POUND')).toBeCloseTo(453.59237, 5);
    });

    it('should throw error for invalid value', () => {
      expect(() => toGrams(NaN, 'GRAM')).toThrow('Invalid weight value');
    });

    it('should throw error for unknown unit', () => {
      expect(() => toGrams(1, 'INVALID' as WeightUnit)).toThrow('Unknown weight unit');
    });
  });

  describe('fromGrams', () => {
    it('should convert grams to grams (identity)', () => {
      expect(fromGrams(100, 'GRAM')).toBe(100);
    });

    it('should convert grams to kilograms', () => {
      expect(fromGrams(1000, 'KILOGRAM')).toBe(1);
      expect(fromGrams(2500, 'KILOGRAM')).toBe(2.5);
    });

    it('should convert grams to tola', () => {
      expect(fromGrams(11.6638, 'TOLA')).toBeCloseTo(1, 4);
      expect(fromGrams(116.638, 'TOLA')).toBeCloseTo(10, 4);
    });

    it('should convert grams to laal', () => {
      expect(fromGrams(11.6638, 'LAAL')).toBeCloseTo(100, 2); // 1 tola = 100 laal
    });

    it('should convert grams to troy ounce', () => {
      expect(fromGrams(31.1035, 'OUNCE')).toBeCloseTo(1, 4);
    });

    it('should convert grams to pounds', () => {
      expect(fromGrams(453.59237, 'POUND')).toBeCloseTo(1, 5);
    });

    it('should throw error for invalid value', () => {
      expect(() => fromGrams(NaN, 'GRAM')).toThrow('Invalid weight value');
    });

    it('should throw error for unknown unit', () => {
      expect(() => fromGrams(1, 'INVALID' as WeightUnit)).toThrow('Unknown weight unit');
    });
  });

  describe('convertWeight', () => {
    it('should convert between the same unit (identity)', () => {
      expect(convertWeight(100, 'GRAM', 'GRAM')).toBe(100);
      expect(convertWeight(5, 'TOLA', 'TOLA')).toBe(5);
    });

    it('should convert tola to grams', () => {
      expect(convertWeight(1, 'TOLA', 'GRAM')).toBeCloseTo(11.6638, 4);
    });

    it('should convert grams to tola', () => {
      expect(convertWeight(11.6638, 'GRAM', 'TOLA')).toBeCloseTo(1, 4);
    });

    it('should convert laal to tola', () => {
      // 100 laal = 1 tola
      expect(convertWeight(100, 'LAAL', 'TOLA')).toBeCloseTo(1, 4);
    });

    it('should convert tola to laal', () => {
      expect(convertWeight(1, 'TOLA', 'LAAL')).toBeCloseTo(100, 2);
    });

    it('should convert ounce to grams', () => {
      expect(convertWeight(1, 'OUNCE', 'GRAM')).toBeCloseTo(31.1035, 4);
    });

    it('should convert kilograms to pounds', () => {
      expect(convertWeight(1, 'KILOGRAM', 'POUND')).toBeCloseTo(2.2046, 4);
    });

    it('should handle round-trip conversions', () => {
      const original = 10;
      const converted = convertWeight(original, 'TOLA', 'GRAM');
      const backConverted = convertWeight(converted, 'GRAM', 'TOLA');
      expect(backConverted).toBeCloseTo(original, 6);
    });
  });

  describe('formatWeight', () => {
    it('should format grams with symbol', () => {
      expect(formatWeight(100.5, 'GRAM')).toBe('100.5 g');
    });

    it('should format tola with symbol', () => {
      expect(formatWeight(1.25, 'TOLA')).toBe('1.25 tola');
    });

    it('should format without symbol when disabled', () => {
      expect(formatWeight(100.5, 'GRAM', { showSymbol: false })).toBe('100.5');
    });

    it('should respect decimal places from config', () => {
      // LAAL has 1 decimal place
      expect(formatWeight(10.999, 'LAAL')).toBe('11 laal');
      // KILOGRAM has 3 decimal places
      expect(formatWeight(1.5555, 'KILOGRAM')).toBe('1.556 kg');
    });

    it('should throw error for unknown unit', () => {
      expect(() => formatWeight(1, 'INVALID' as WeightUnit)).toThrow('Unknown weight unit');
    });
  });

  describe('formatWeightFromGrams', () => {
    it('should convert from grams and format', () => {
      // 11.6638 grams = 1 tola
      expect(formatWeightFromGrams(11.6638, 'TOLA')).toBe('1 tola');
    });

    it('should show grams equivalent when enabled', () => {
      const result = formatWeightFromGrams(11.6638, 'TOLA', { showGramsEquivalent: true });
      expect(result).toContain('tola');
      expect(result).toContain('g');
    });

    it('should not show equivalent when display unit is GRAM', () => {
      const result = formatWeightFromGrams(100, 'GRAM', { showGramsEquivalent: true });
      expect(result).toBe('100 g');
    });
  });

  describe('Conversion factors validation', () => {
    it('should have all required units defined', () => {
      const requiredUnits: WeightUnit[] = ['GRAM', 'KILOGRAM', 'TOLA', 'LAAL', 'OUNCE', 'POUND'];
      requiredUnits.forEach(unit => {
        expect(WEIGHT_CONVERSION_FACTORS[unit]).toBeDefined();
        expect(WEIGHT_CONVERSION_FACTORS[unit]).toBeGreaterThan(0);
      });
    });

    it('should have GRAM factor as 1 (base unit)', () => {
      expect(WEIGHT_CONVERSION_FACTORS['GRAM']).toBe(1);
    });

    it('should verify tola-laal relationship (100 laal = 1 tola)', () => {
      const tolaFactor = WEIGHT_CONVERSION_FACTORS['TOLA'];
      const laalFactor = WEIGHT_CONVERSION_FACTORS['LAAL'];
      expect(tolaFactor / laalFactor).toBeCloseTo(100, 4);
    });
  });
});
