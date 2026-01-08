// Composition validation for RFQ
// Re-exports from shared package with API-specific additions

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  mandatoryLabels: string[];
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  messageKey: string;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  messageKey: string;
}

// Build method types
type BuildMethod = 'METHOD_A' | 'METHOD_B' | 'METHOD_C' | 'METHOD_D';

// Multi-metal patterns
type MultiMetalPattern = 'TOP_PLATE' | 'INLAY' | 'OUTER_SLEEVE' | 'TWO_TONE_SPLIT';

// Multi-metal modes
type MultiMetalMode = 'MODE_D1' | 'MODE_D2' | 'MODE_D3';

// Mandatory labels by method
const MANDATORY_LABELS: Record<BuildMethod, string[]> = {
  METHOD_A: [],
  METHOD_B: [],
  METHOD_C: ['Not solid gold'],
  METHOD_D: ['Multi-metal construction. Not solid gold unless 100% gold is selected.'],
};

/**
 * Validate composition based on build method
 */
export function validateComposition(composition: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const method = composition.method as BuildMethod;

  if (!method) {
    errors.push({
      code: 'MISSING_METHOD',
      field: 'method',
      message: 'Build method is required',
      messageKey: 'validation.missingMethod',
    });
    return { isValid: false, errors, warnings, mandatoryLabels: [] };
  }

  switch (method) {
    case 'METHOD_A':
      validateMethodA(composition, errors, warnings);
      break;
    case 'METHOD_B':
      validateMethodB(composition, errors, warnings);
      break;
    case 'METHOD_C':
      validateMethodC(composition, errors, warnings);
      break;
    case 'METHOD_D':
      validateMethodD(composition, errors, warnings);
      break;
    default:
      errors.push({
        code: 'INVALID_METHOD',
        field: 'method',
        message: 'Invalid build method',
        messageKey: 'validation.invalidMethod',
      });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mandatoryLabels: MANDATORY_LABELS[method] || [],
  };
}

/**
 * Validate Method A: Solid Precious Metal
 */
function validateMethodA(
  composition: any,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (!composition.preciousMetal) {
    errors.push({
      code: 'METHOD_A_MISSING_METAL',
      field: 'preciousMetal',
      message: 'Precious metal is required for solid metal construction',
      messageKey: 'validation.methodA.missingMetal',
    });
  }

  // Validate it's a valid precious metal
  const validMetals = [
    'GOLD_24K', 'GOLD_22K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K',
    'SILVER_999', 'SILVER_925',
    'PLATINUM_950', 'PLATINUM_900',
    'PALLADIUM_950',
  ];

  if (composition.preciousMetal && !validMetals.includes(composition.preciousMetal)) {
    errors.push({
      code: 'METHOD_A_INVALID_METAL',
      field: 'preciousMetal',
      message: 'Selected metal is not a valid precious metal',
      messageKey: 'validation.methodA.invalidMetal',
    });
  }
}

/**
 * Validate Method B: Standard Alloy
 */
function validateMethodB(
  composition: any,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const validAlloys = ['GOLD_18K', 'GOLD_14K', 'GOLD_10K', 'STERLING_SILVER_925'];

  if (!composition.standardAlloy) {
    errors.push({
      code: 'METHOD_B_MISSING_ALLOY',
      field: 'standardAlloy',
      message: 'Standard alloy must be selected',
      messageKey: 'validation.methodB.missingAlloy',
    });
  }

  if (composition.standardAlloy && !validAlloys.includes(composition.standardAlloy)) {
    errors.push({
      code: 'METHOD_B_INVALID_ALLOY',
      field: 'standardAlloy',
      message: 'Only preset standard alloys are allowed. Custom percentages not permitted.',
      messageKey: 'validation.methodB.invalidAlloy',
    });
  }
}

/**
 * Validate Method C: Core Metal + Finish
 */
function validateMethodC(
  composition: any,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const validCoreMetals = [
    'BRASS', 'BRONZE', 'COPPER', 'STAINLESS_STEEL_316L',
    'TITANIUM', 'TUNGSTEN_CARBIDE', 'COBALT_CHROME',
    'SILVER_925', // Sterling silver can be core for vermeil
  ];

  if (!composition.coreMetal) {
    errors.push({
      code: 'METHOD_C_MISSING_CORE',
      field: 'coreMetal',
      message: 'Core metal is required',
      messageKey: 'validation.methodC.missingCore',
    });
  }

  if (composition.coreMetal && !validCoreMetals.includes(composition.coreMetal)) {
    errors.push({
      code: 'METHOD_C_INVALID_CORE',
      field: 'coreMetal',
      message: 'Invalid core metal',
      messageKey: 'validation.methodC.invalidCore',
    });
  }

  // If gold plating is enabled, plating tier is required
  if (composition.addGoldPlating && !composition.platingTier) {
    errors.push({
      code: 'METHOD_C_MISSING_TIER',
      field: 'platingTier',
      message: 'Plating tier is required when gold plating is enabled',
      messageKey: 'validation.methodC.missingTier',
    });
  }

  const validTiers = ['LIGHT', 'STANDARD', 'PREMIUM'];
  if (composition.platingTier && !validTiers.includes(composition.platingTier)) {
    errors.push({
      code: 'METHOD_C_INVALID_TIER',
      field: 'platingTier',
      message: 'Invalid plating tier',
      messageKey: 'validation.methodC.invalidTier',
    });
  }

  // Vermeil validation
  if (composition.isVermeil && composition.coreMetal !== 'SILVER_925') {
    errors.push({
      code: 'METHOD_C_VERMEIL_INVALID',
      field: 'isVermeil',
      message: 'Vermeil is only valid when core metal is Sterling Silver (925)',
      messageKey: 'validation.methodC.vermeilInvalid',
    });
  }
}

/**
 * Validate Method D: Multi-Metal Construction
 */
function validateMethodD(
  composition: any,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const validPatterns: MultiMetalPattern[] = ['TOP_PLATE', 'INLAY', 'OUTER_SLEEVE', 'TWO_TONE_SPLIT'];
  const validModes: MultiMetalMode[] = ['MODE_D1', 'MODE_D2', 'MODE_D3'];

  // Pattern is required
  if (!composition.multiMetalPattern) {
    errors.push({
      code: 'METHOD_D_MISSING_PATTERN',
      field: 'multiMetalPattern',
      message: 'Multi-metal pattern is required for Method D',
      messageKey: 'validation.methodD.missingPattern',
    });
  }

  if (composition.multiMetalPattern && !validPatterns.includes(composition.multiMetalPattern)) {
    errors.push({
      code: 'METHOD_D_INVALID_PATTERN',
      field: 'multiMetalPattern',
      message: 'Invalid multi-metal pattern',
      messageKey: 'validation.methodD.invalidPattern',
    });
  }

  // Mode is required
  if (!composition.multiMetalMode) {
    errors.push({
      code: 'METHOD_D_MISSING_MODE',
      field: 'multiMetalMode',
      message: 'Multi-metal mode is required for Method D',
      messageKey: 'validation.methodD.missingMode',
    });
  }

  if (composition.multiMetalMode && !validModes.includes(composition.multiMetalMode)) {
    errors.push({
      code: 'METHOD_D_INVALID_MODE',
      field: 'multiMetalMode',
      message: 'Invalid multi-metal mode',
      messageKey: 'validation.methodD.invalidMode',
    });
  }

  // Mode-specific validation
  if (composition.modeConfig) {
    switch (composition.multiMetalMode) {
      case 'MODE_D1':
        validateModeD1(composition.modeConfig, errors);
        break;
      case 'MODE_D2':
        validateModeD2(composition.modeConfig, errors);
        break;
      case 'MODE_D3':
        validateModeD3(composition.modeConfig, errors, warnings);
        break;
    }
  }
}

function validateModeD1(config: any, errors: ValidationError[]): void {
  if (config.goldPercentByWeight === undefined) {
    errors.push({
      code: 'MODE_D1_MISSING_PERCENT',
      field: 'goldPercentByWeight',
      message: 'Gold percent by weight is required for Mode D1',
      messageKey: 'validation.modeD1.missingPercent',
    });
  } else if (config.goldPercentByWeight < 10 || config.goldPercentByWeight > 90) {
    errors.push({
      code: 'MODE_D1_INVALID_PERCENT',
      field: 'goldPercentByWeight',
      message: 'Gold percent must be between 10% and 90%',
      messageKey: 'validation.modeD1.invalidPercent',
    });
  }

  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D1_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD1.missingPurity',
    });
  }

  if (!config.baseMetal) {
    errors.push({
      code: 'MODE_D1_MISSING_BASE',
      field: 'baseMetal',
      message: 'Base metal is required',
      messageKey: 'validation.modeD1.missingBase',
    });
  }
}

function validateModeD2(config: any, errors: ValidationError[]): void {
  if (!config.targetGoldWeightG || config.targetGoldWeightG <= 0) {
    errors.push({
      code: 'MODE_D2_MISSING_GOLD_WEIGHT',
      field: 'targetGoldWeightG',
      message: 'Target gold weight is required and must be positive',
      messageKey: 'validation.modeD2.missingGoldWeight',
    });
  }

  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D2_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD2.missingPurity',
    });
  }

  if (!config.baseMetal) {
    errors.push({
      code: 'MODE_D2_MISSING_BASE',
      field: 'baseMetal',
      message: 'Base metal is required',
      messageKey: 'validation.modeD2.missingBase',
    });
  }
}

function validateModeD3(
  config: any,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (!config.dimensions) {
    errors.push({
      code: 'MODE_D3_MISSING_DIMENSIONS',
      field: 'dimensions',
      message: 'Part dimensions are required for Mode D3',
      messageKey: 'validation.modeD3.missingDimensions',
    });
  }

  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D3_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD3.missingPurity',
    });
  }

  if (!config.baseMetal) {
    errors.push({
      code: 'MODE_D3_MISSING_BASE',
      field: 'baseMetal',
      message: 'Base metal is required',
      messageKey: 'validation.modeD3.missingBase',
    });
  }

  // Always add weight confirmation warning for D3
  warnings.push({
    code: 'MODE_D3_WEIGHT_CONFIRMATION',
    field: 'weight',
    message: 'Final weight subject to confirmation',
    messageKey: 'validation.modeD3.weightConfirmation',
  });
}

/**
 * Check if Method D has all required weight specifications
 */
export function validateMethodDRequirements(composition: any): boolean {
  if (!composition.multiMetalPattern || !composition.multiMetalMode) {
    return false;
  }

  const config = composition.modeConfig;
  if (!config) return false;

  const hasTargetTotal = config.targetTotalWeightG !== undefined;
  const hasGoldWeight = config.targetGoldWeightG !== undefined;
  const hasGoldPercent = config.goldPercentByWeight !== undefined;

  return hasTargetTotal || hasGoldWeight || hasGoldPercent;
}
