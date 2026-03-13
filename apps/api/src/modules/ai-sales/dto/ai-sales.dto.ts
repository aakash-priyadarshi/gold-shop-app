import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

// ── Lead DTOs ──────────────────────────────────────────────────

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  temperature?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  communicationStyle?: string;

  @IsOptional()
  @IsString()
  decisionStyle?: string;

  @IsOptional()
  @IsString()
  pacePreference?: string;

  @IsOptional()
  @IsString()
  tonePreference?: string;

  @IsOptional()
  @IsArray()
  respondsWellTo?: string[];

  @IsOptional()
  @IsArray()
  getsFrustratedBy?: string[];

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsString()
  familyDetails?: string;

  @IsOptional()
  @IsArray()
  hobbies?: string[];

  @IsOptional()
  @IsArray()
  recentLifeEvents?: string[];

  @IsOptional()
  @IsArray()
  notableQuotes?: string[];

  @IsOptional()
  @IsArray()
  preferredCallDays?: string[];

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsNumber()
  dealValue?: number;

  @IsOptional()
  @IsString()
  budgetApprover?: string;

  @IsOptional()
  @IsString()
  urgency?: string;

  @IsOptional()
  @IsArray()
  competitorsPros?: string[];
}

export class UpdateLeadDto extends CreateLeadDto {
  @IsOptional()
  @IsString()
  lastCallSummary?: string;

  @IsOptional()
  @IsString()
  whatWorkedLastCall?: string;

  @IsOptional()
  @IsString()
  whatToAvoidNextCall?: string;

  @IsOptional()
  @IsString()
  nextCallStrategy?: string;

  @IsOptional()
  @IsArray()
  openLoops?: string[];
}

export class MoveLeadStageDto {
  @IsString()
  stage: string;
}

// ── Call DTOs ──────────────────────────────────────────────────

export class InitiateCallDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentVoiceId?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;
}

export class EndCallDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  transcript?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @IsOptional()
  @IsString()
  sentiment?: string;

  @IsOptional()
  @IsBoolean()
  goalAchieved?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goalNotes?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsArray()
  buyingSignals?: string[];

  @IsOptional()
  @IsArray()
  objectionsEncountered?: string[];

  @IsOptional()
  @IsArray()
  keyTopics?: string[];

  // Lead auto-update fields
  @IsOptional()
  @IsString()
  lastCallSummary?: string;

  @IsOptional()
  @IsString()
  whatWorkedLastCall?: string;

  @IsOptional()
  @IsString()
  whatToAvoidNextCall?: string;

  @IsOptional()
  @IsString()
  nextCallStrategy?: string;

  @IsOptional()
  @IsArray()
  openLoops?: string[];

  // Personality updates from call
  @IsOptional()
  @IsString()
  communicationStyle?: string;

  @IsOptional()
  @IsString()
  decisionStyle?: string;

  @IsOptional()
  @IsString()
  pacePreference?: string;

  @IsOptional()
  @IsString()
  tonePreference?: string;

  // Cost
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @IsNumber()
  costTwilio?: number;

  @IsOptional()
  @IsNumber()
  costLlm?: number;
}

// ── AgentVoice DTOs ────────────────────────────────────────────

export class CreateAgentVoiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsString()
  voiceId: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  pitch?: number;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  agentEmail?: string;
}

// ── Email DTOs ─────────────────────────────────────────────────

export class SendEmailDto {
  @IsString()
  leadId: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  goalForEmail?: string;

  @IsOptional()
  @IsString()
  meetLink?: string;

  @IsOptional()
  @IsString()
  meetScheduledAt?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;
}

export class DraftEmailDto {
  @IsString()
  leadId: string;

  @IsString()
  purpose: string;

  @IsOptional()
  @IsBoolean()
  includeMeetLink?: boolean;
}

export class InboundEmailDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;
}

// ── Meet DTOs ──────────────────────────────────────────────────

export class ScheduleMeetDto {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Interaction DTOs ───────────────────────────────────────────

export class RecordInteractionDto {
  @IsString()
  @IsEnum(["CALL", "EMAIL_SENT", "EMAIL_RECEIVED", "GMEET", "FOLLOW_UP", "NOTE"])
  type: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  goalSet?: string;

  @IsOptional()
  @IsBoolean()
  goalAchieved?: boolean;
}
