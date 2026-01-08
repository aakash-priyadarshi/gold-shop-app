// ══════════════════════════════════════════════════════════════════════════════
// GOLD SHOP MARKETPLACE - MANUFACTURING METHOD VALIDATION
// VALIDATION RULES (HARD FAIL)
// ══════════════════════════════════════════════════════════════════════════════

import {
  BuildMethod,
  MultiMetalPattern,
  MultiMetalMode,
  ModeD1Config,
  ModeD2Config,
  ModeD3Config,
  MethodAComposition,
  MethodBComposition,
  MethodCComposition,
  MethodDComposition,
  Composition,
  StandardAlloy,
  MANDATORY_LABELS,
} from '../enums/manufacturing-methods';
import {
  PreciousMetal,
  BaseMetal,
  FinishType,
  PlatingTier,
  PRECIOUS_METAL_PURITY,
  materialSupportsMethod,
} from '../enums/materials';

// ──────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT TYPE
// ──────────────────────────────────────────────────────────────────────────────
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
  messageKey: string;  // For i18n
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  messageKey: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD A VALIDATION: SOLID PRECIOUS METAL
// ──────────────────────────────────────────────────────────────────────────────
export function validateMethodA(composition: MethodAComposition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate precious metal is specified
  if (!composition.preciousMetal) {
    errors.push({
      code: 'METHOD_A_MISSING_METAL',
      field: 'preciousMetal',
      message: 'Precious metal is required for solid metal construction',
      messageKey: 'validation.methodA.missingMetal',
    });
  }
  
  // Validate metal is actually precious
  if (composition.preciousMetal && !Object.values(PreciousMetal).includes(composition.preciousMetal)) {
    errors.push({
      code: 'METHOD_A_INVALID_METAL',
      field: 'preciousMetal',
      message: 'Selected metal is not a valid precious metal',
      messageKey: 'validation.methodA.invalidMetal',
    });
  }
  
  // Validate at least one target is specified
  if (!composition.targetTotalWeightG && !composition.budgetNpr) {
    warnings.push({
      code: 'METHOD_A_NO_TARGET',
      field: 'targetTotalWeightG',
      message: 'Either target weight or budget should be specified',
      messageKey: 'validation.methodA.noTarget',
    });
  }
  
  // Validate weight is positive
  if (composition.targetTotalWeightG !== undefined && composition.targetTotalWeightG <= 0) {
    errors.push({
      code: 'METHOD_A_INVALID_WEIGHT',
      field: 'targetTotalWeightG',
      message: 'Target weight must be greater than 0',
      messageKey: 'validation.methodA.invalidWeight',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mandatoryLabels: [],  // No special label for solid metal
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD B VALIDATION: STANDARD ALLOY
// NO custom percentages allowed
// ──────────────────────────────────────────────────────────────────────────────
export function validateMethodB(composition: MethodBComposition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate standard alloy is specified
  if (!composition.standardAlloy) {
    errors.push({
      code: 'METHOD_B_MISSING_ALLOY',
      field: 'standardAlloy',
      message: 'Standard alloy must be selected',
      messageKey: 'validation.methodB.missingAlloy',
    });
  }
  
  // Validate it's a valid standard alloy (not custom)
  if (composition.standardAlloy && !Object.values(StandardAlloy).includes(composition.standardAlloy)) {
    errors.push({
      code: 'METHOD_B_INVALID_ALLOY',
      field: 'standardAlloy',
      message: 'Only preset standard alloys are allowed. Custom percentages not permitted.',
      messageKey: 'validation.methodB.invalidAlloy',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mandatoryLabels: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD C VALIDATION: CORE METAL + FINISH
// NOT eligible for hallmarking
// Vermeil ONLY if core = Sterling Silver
// ──────────────────────────────────────────────────────────────────────────────
export function validateMethodC(composition: MethodCComposition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate core metal is specified
  if (!composition.coreMetal) {
    errors.push({
      code: 'METHOD_C_MISSING_CORE',
      field: 'coreMetal',
      message: 'Core metal is required',
      messageKey: 'validation.methodC.missingCore',
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
  
  // Validate plating tier is valid
  if (composition.platingTier && !Object.values(PlatingTier).includes(composition.platingTier)) {
    errors.push({
      code: 'METHOD_C_INVALID_TIER',
      field: 'platingTier',
      message: 'Invalid plating tier',
      messageKey: 'validation.methodC.invalidTier',
    });
  }
  
  // Vermeil validation: Only if core = Sterling Silver
  if (composition.isVermeil && composition.coreMetal !== PreciousMetal.SILVER_925) {
    errors.push({
      code: 'METHOD_C_VERMEIL_INVALID',
      field: 'isVermeil',
      message: 'Vermeil is only valid when core metal is Sterling Silver (925)',
      messageKey: 'validation.methodC.vermeilInvalid',
    });
  }
  
  // If core is sterling silver with gold plating, it should be marked as vermeil
  if (
    composition.coreMetal === PreciousMetal.SILVER_925 &&
    composition.addGoldPlating &&
    !composition.isVermeil
  ) {
    warnings.push({
      code: 'METHOD_C_SHOULD_BE_VERMEIL',
      field: 'isVermeil',
      message: 'Gold plating over Sterling Silver should be labeled as Vermeil',
      messageKey: 'validation.methodC.shouldBeVermeil',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mandatoryLabels: MANDATORY_LABELS[BuildMethod.METHOD_C],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD D VALIDATION: MULTI-METAL CONSTRUCTION
// This is the most complex validation
// ──────────────────────────────────────────────────────────────────────────────
export function validateMethodD(composition: MethodDComposition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // REQUIRED: multi_metal_pattern
  if (!composition.multiMetalPattern) {
    errors.push({
      code: 'METHOD_D_MISSING_PATTERN',
      field: 'multiMetalPattern',
      message: 'Multi-metal pattern is required for Method D',
      messageKey: 'validation.methodD.missingPattern',
    });
  }
  
  // Validate pattern is valid
  if (composition.multiMetalPattern && !Object.values(MultiMetalPattern).includes(composition.multiMetalPattern)) {
    errors.push({
      code: 'METHOD_D_INVALID_PATTERN',
      field: 'multiMetalPattern',
      message: 'Invalid multi-metal pattern',
      messageKey: 'validation.methodD.invalidPattern',
    });
  }
  
  // REQUIRED: multi_metal_mode
  if (!composition.multiMetalMode) {
    errors.push({
      code: 'METHOD_D_MISSING_MODE',
      field: 'multiMetalMode',
      message: 'Multi-metal mode is required for Method D',
      messageKey: 'validation.methodD.missingMode',
    });
  }
  
  // Validate mode is valid
  if (composition.multiMetalMode && !Object.values(MultiMetalMode).includes(composition.multiMetalMode)) {
    errors.push({
      code: 'METHOD_D_INVALID_MODE',
      field: 'multiMetalMode',
      message: 'Invalid multi-metal mode',
      messageKey: 'validation.methodD.invalidMode',
    });
  }
  
  // Validate mode-specific configuration
  if (composition.modeConfig) {
    switch (composition.multiMetalMode) {
      case MultiMetalMode.MODE_D1:
        validateModeD1(composition.modeConfig as ModeD1Config, errors);
        break;
      case MultiMetalMode.MODE_D2:
        validateModeD2(composition.modeConfig as ModeD2Config, errors);
        break;
      case MultiMetalMode.MODE_D3:
        validateModeD3(composition.modeConfig as ModeD3Config, errors, warnings);
        break;
    }
  } else {
    errors.push({
      code: 'METHOD_D_MISSING_CONFIG',
      field: 'modeConfig',
      message: 'Mode configuration is required',
      messageKey: 'validation.methodD.missingConfig',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mandatoryLabels: MANDATORY_LABELS[BuildMethod.METHOD_D],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE D1: PERCENT BY WEIGHT VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function validateModeD1(config: ModeD1Config, errors: ValidationError[]): void {
  // goldPercentByWeight must be 10-90
  if (config.goldPercentByWeight === undefined || config.goldPercentByWeight === null) {
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
  
  // goldPurity REQUIRED
  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D1_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD1.missingPurity',
    });
  }
  
  // baseMetal REQUIRED
  if (!config.baseMetal) {
    errors.push({
      code: 'MODE_D1_MISSING_BASE',
      field: 'baseMetal',
      message: 'Base metal is required',
      messageKey: 'validation.modeD1.missingBase',
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE D2: GOLD GRAMS VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function validateModeD2(config: ModeD2Config, errors: ValidationError[]): void {
  // targetGoldWeightG REQUIRED
  if (!config.targetGoldWeightG || config.targetGoldWeightG <= 0) {
    errors.push({
      code: 'MODE_D2_MISSING_GOLD_WEIGHT',
      field: 'targetGoldWeightG',
      message: 'Target gold weight is required and must be positive',
      messageKey: 'validation.modeD2.missingGoldWeight',
    });
  }
  
  // goldPurity REQUIRED
  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D2_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD2.missingPurity',
    });
  }
  
  // baseMetal REQUIRED
  if (!config.baseMetal) {
    errors.push({
      code: 'MODE_D2_MISSING_BASE',
      field: 'baseMetal',
      message: 'Base metal is required',
      messageKey: 'validation.modeD2.missingBase',
    });
  }
  
  // If both weights specified, gold cannot exceed total
  if (config.targetGoldWeightG && config.targetTotalWeightG) {
    if (config.targetGoldWeightG > config.targetTotalWeightG) {
      errors.push({
        code: 'MODE_D2_GOLD_EXCEEDS_TOTAL',
        field: 'targetGoldWeightG',
        message: 'Gold weight cannot exceed total weight',
        messageKey: 'validation.modeD2.goldExceedsTotal',
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE D3: PART DIMENSIONS VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function validateModeD3(
  config: ModeD3Config,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // pattern REQUIRED
  if (!config.pattern) {
    errors.push({
      code: 'MODE_D3_MISSING_PATTERN',
      field: 'pattern',
      message: 'Pattern is required for Mode D3',
      messageKey: 'validation.modeD3.missingPattern',
    });
  }
  
  // dimensions REQUIRED
  if (!config.dimensions) {
    errors.push({
      code: 'MODE_D3_MISSING_DIMENSIONS',
      field: 'dimensions',
      message: 'Part dimensions are required for Mode D3',
      messageKey: 'validation.modeD3.missingDimensions',
    });
  } else {
    // Validate pattern-specific dimensions
    switch (config.pattern) {
      case MultiMetalPattern.TOP_PLATE:
        if (!config.dimensions.topPlateThicknessMm) {
          errors.push({
            code: 'MODE_D3_MISSING_TOP_PLATE_THICKNESS',
            field: 'dimensions.topPlateThicknessMm',
            message: 'Top plate thickness is required',
            messageKey: 'validation.modeD3.missingTopPlateThickness',
          });
        }
        break;
      case MultiMetalPattern.INLAY:
        if (!config.dimensions.inlayWidthMm || !config.dimensions.inlayDepthMm) {
          errors.push({
            code: 'MODE_D3_MISSING_INLAY_DIMS',
            field: 'dimensions',
            message: 'Inlay width and depth are required',
            messageKey: 'validation.modeD3.missingInlayDims',
          });
        }
        break;
      case MultiMetalPattern.OUTER_SLEEVE:
        if (!config.dimensions.sleeveThicknessMm) {
          errors.push({
            code: 'MODE_D3_MISSING_SLEEVE_THICKNESS',
            field: 'dimensions.sleeveThicknessMm',
            message: 'Sleeve thickness is required',
            messageKey: 'validation.modeD3.missingSleeveThickness',
          });
        }
        break;
      case MultiMetalPattern.TWO_TONE_SPLIT:
        if (!config.dimensions.splitRatio) {
          errors.push({
            code: 'MODE_D3_MISSING_SPLIT_RATIO',
            field: 'dimensions.splitRatio',
            message: 'Split ratio is required',
            messageKey: 'validation.modeD3.missingSplitRatio',
          });
        }
        break;
    }
  }
  
  // goldPurity REQUIRED
  if (!config.goldPurity) {
    errors.push({
      code: 'MODE_D3_MISSING_PURITY',
      field: 'goldPurity',
      message: 'Gold purity is required',
      messageKey: 'validation.modeD3.missingPurity',
    });
  }
  
  // baseMetal REQUIRED
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

// ──────────────────────────────────────────────────────────────────────────────
// MAIN VALIDATION FUNCTION
// ──────────────────────────────────────────────────────────────────────────────
export function validateComposition(composition: Composition): ValidationResult {
  switch (composition.method) {
    case BuildMethod.METHOD_A:
      return validateMethodA(composition as MethodAComposition);
    case BuildMethod.METHOD_B:
      return validateMethodB(composition as MethodBComposition);
    case BuildMethod.METHOD_C:
      return validateMethodC(composition as MethodCComposition);
    case BuildMethod.METHOD_D:
      return validateMethodD(composition as MethodDComposition);
    default:
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_METHOD',
          field: 'method',
          message: 'Invalid build method',
          messageKey: 'validation.invalidMethod',
        }],
        warnings: [],
        mandatoryLabels: [],
      };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD D OVERALL VALIDATION (HARD FAIL RULES)
// If build_method = METHOD_D:
// - multi_metal_pattern REQUIRED
// - multi_metal_mode REQUIRED
// - At least ONE of: target_total_weight_g, target_gold_weight_g, gold_percent_by_weight
// ──────────────────────────────────────────────────────────────────────────────
export function validateMethodDRequirements(composition: MethodDComposition): boolean {
  // Pattern and mode must exist
  if (!composition.multiMetalPattern || !composition.multiMetalMode) {
    return false;
  }
  
  // At least one weight/percent specification must exist
  const config = composition.modeConfig;
  if (!config) return false;
  
  const hasTargetTotal = 'targetTotalWeightG' in config && config.targetTotalWeightG !== undefined;
  const hasGoldWeight = 'targetGoldWeightG' in config && (config as ModeD2Config).targetGoldWeightG !== undefined;
  const hasGoldPercent = 'goldPercentByWeight' in config && (config as ModeD1Config).goldPercentByWeight !== undefined;
  
  return hasTargetTotal || hasGoldWeight || hasGoldPercent;
}
