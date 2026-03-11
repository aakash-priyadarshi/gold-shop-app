# Lead Manager — GitHub Copilot Instructions

# File: .github/instructions/lead-manager.instructions.md

# Apply to: **/leads/**, **/crm/**, **/_lead_.ts, **/_profile_.ts

---

## WHAT THE LEAD MANAGER IS

The Lead Manager is not a basic CRM contact list.
It is a living intelligence profile that grows richer
after every single interaction.

```
After call 1:  AI knows their job title and company
After call 2:  AI knows they hate being rushed, have a team of 8,
               and their boss won't approve over £10k
After call 3:  AI knows their budget cycle, their CTO's concerns,
               and that the fintech case study landed perfectly
After call 5:  AI knows this person better than most human SDRs
               who've worked an account for 6 months

The lead profile IS the AI's memory of this person.
Every field feeds directly into PreCallBrainService.
Richer profile = smarter conversation = higher conversion.
```

---

## THE LEAD PROFILE — COMPLETE FIELD SET

### SECTION 1 — IDENTITY

_Collected before first contact. Never changes._

```typescript
interface LeadIdentity {
  // Core identity
  id: string; // UUID
  fullName: string;
  preferredName: string; // "Call me Raj, not Rajesh"
  jobTitle: string;
  seniorityLevel:
    | "c_suite"
    | "vp_director"
    | "manager"
    | "individual_contributor"
    | "founder"
    | "owner";

  // Company
  companyName: string;
  companySize:
    | "solo"
    | "micro" // 2-10
    | "small" // 11-50
    | "medium" // 51-200
    | "large" // 201-1000
    | "enterprise"; // 1000+
  industry: string;
  companyWebsite?: string;
  linkedinUrl?: string;

  // Location
  countryCode: string; // 'IN', 'GB', 'AE'
  city?: string;
  timezone: string; // 'Asia/Kolkata'

  // Source
  source:
    | "inbound_form"
    | "cold_list"
    | "referral"
    | "linkedin"
    | "conference"
    | "whatsapp_inbound"
    | "ad_campaign";
  referralName?: string; // Who referred them
  campaignId?: string;
  dateAdded: Date;
}
```

### SECTION 2 — CONTACT DETAILS

_Stored in DB, not .env. Update via admin panel._

```typescript
interface LeadContact {
  // Phone numbers
  primaryPhone: string;
  whatsappPhone?: string; // May differ from primary
  officePhone?: string;

  // Digital
  email?: string;
  linkedinUrl?: string;

  // Preferences
  preferredChannel: "whatsapp" | "call" | "sms" | "email" | "unknown";
  preferredCallTime?: string; // "10am-12pm local"
  preferredCallDays?: string[]; // ['tuesday', 'wednesday']
  doNotCallBefore?: string; // Local time "09:00"
  doNotCallAfter?: string; // Local time "18:00"
  messagingPreference?: "whatsapp" | "sms";
  messagingPreferenceDetectedAt?: Date;
}
```

### SECTION 3 — AI-OBSERVED PERSONALITY

_Written by AI after listening on calls. Updated after every call._

```typescript
interface LeadPersonality {
  // Communication style (AI fills from call observation)
  communicationStyle:
    | "direct" // Gets to the point, wants concise answers
    | "elaborate" // Likes to explain, appreciates detail
    | "analytical" // Data-first, questions everything
    | "relational" // People-first, builds trust slowly
    | "unknown";

  decisionStyle:
    | "solo_fast" // Decides quickly on their own
    | "solo_slow" // Takes time, needs to think
    | "committee" // Needs to consult team
    | "hierarchical" // Needs boss approval
    | "unknown";

  tonePreference: "formal" | "semi_formal" | "casual" | "unknown";

  pacePreference:
    | "fast" // Move quickly, hates recapping
    | "measured" // Normal pace
    | "slow" // Needs time, gets overwhelmed
    | "unknown";

  // What works with this person (AI writes these)
  respondsWellTo: string[];
  // e.g. ['data and numbers', 'short direct answers',
  //        'the fintech case study', 'being asked questions']

  getsFrustratedBy: string[];
  // e.g. ['recapping what was already said',
  //        'being pushed before ready', 'technical jargon']

  getsExcitedBy: string[];
  // e.g. ['team productivity stories', 'ROI numbers',
  //        'hearing about similar companies']

  trustSignals: string[];
  // What made them open up
  // e.g. ['mentioned they were burned by vendors before',
  //        'relaxed after case study', 'laughed at the analogy']

  humorStyle?: "dry" | "warm" | "none" | "unknown";

  // Detected gender (from voice/name — for persona selection)
  detectedGender?: "male" | "female" | "unknown";
}
```

### SECTION 4 — PERSONAL DETAILS CAPTURED

_Zero-party data — they said it voluntarily. Massive trust builder._

```typescript
interface LeadZeroPartyData {
  // Personal life (mentioned casually during calls)
  familyMentioned?: string[];
  // e.g. ['has two kids', 'wife works in finance']

  petsMentioned?: string[];
  // e.g. ['dog named Bruno']

  hobbies?: string[];
  // e.g. ['cricket', 'hiking', 'photography']

  recentLifeEvents?: string[];
  // e.g. ['just moved to new office', 'back from Diwali break',
  //        'team just lost a person']

  sportsMentioned?: string[];
  // e.g. ['Man City fan', 'follows IPL']

  // Professional personal details
  yearsAtCompany?: string;
  careerBackgroundNotes?: string;
  professionalFrustrations?: string[];
  // What they hate about their current situation
  // e.g. ['current tool is too slow', 'no API access',
  //        'support is terrible']

  yearlyGoals?: string[];
  // e.g. ['scale to 50 people', 'automate outbound',
  //        'hit £2M ARR']

  quarterlyPressures?: string[];
  // e.g. ['Q2 demo to investors', 'board review in March']

  // Notable quotes — exact phrases that reveal mindset
  notableQuotes: Array<{
    quote: string;
    context: string;
    callId: string;
    capturedAt: Date;
  }>;
  // e.g. {
  //   quote: "We've been burned by vendors before",
  //   context: "Said when discussing commitment",
  //   callId: "...",
  //   capturedAt: "..."
  // }

  // Who else matters in their decision
  decisionInfluencers?: Array<{
    name?: string;
    role: string;
    influence: "blocker" | "champion" | "neutral";
    notes?: string;
  }>;
  // e.g. {role: 'CTO', influence: 'blocker',
  //        notes: 'technical, worried about integration'}
}
```

### SECTION 5 — SALES INTELLIGENCE

_Where they are in the buying journey._

```typescript
interface LeadSalesIntelligence {
  // Current stage
  dealStage:
    | "cold"
    | "aware"
    | "interested"
    | "evaluating"
    | "deciding"
    | "won"
    | "lost"
    | "dormant";

  // Problem awareness
  problemAwareness:
    | "not_aware" // Doesn't know they have the problem
    | "aware" // Knows the problem, not actively seeking
    | "seeking" // Actively looking for solutions
    | "comparing"; // Has options, evaluating

  // Buying signals detected across all calls
  buyingSignals: Array<{
    signal: string;
    strength: "weak" | "medium" | "strong";
    detectedAt: Date;
    callId: string;
    channel: "call" | "whatsapp" | "sms";
  }>;

  // Objections — every one ever raised
  objections: Array<{
    objection: string;
    category:
      | "price"
      | "timing"
      | "competitor"
      | "technical"
      | "authority"
      | "trust"
      | "fit";
    status: "open" | "resolved" | "recurring_blocker";
    raisedAt: Date;
    callId: string;
    resolvedWith?: string;
    // What response resolved it
  }>;

  // Competitors
  competitorsMentioned: Array<{
    name: string;
    context: string;
    // 'currently using' | 'evaluating' | 'had before' | 'comparing'
    sentiment: "happy_with_them" | "neutral" | "dissatisfied";
    mentionedAt: Date;
  }>;

  // Budget
  budgetStatus:
    | "confirmed"
    | "likely_available"
    | "tight"
    | "unknown"
    | "no_budget";
  budgetRange?: string; // e.g. "£5k-10k/year"
  budgetCycleMonth?: number; // Month budget resets (1-12)
  budgetHolder: "this_person" | "someone_else" | "unknown";
  budgetHolderRole?: string;

  // Timeline
  urgency:
    | "immediate" // Needs this now
    | "this_quarter"
    | "this_year"
    | "someday"
    | "no_urgency";
  targetDecisionDate?: Date;
  targetStartDate?: Date;

  // Predicted values (calculated by AI)
  predictedDealValue?: number; // In USD
  predictedCloseDate?: Date;
  predictedNextObjection?: string;
  winProbability?: number; // 0-100
}
```

### SECTION 6 — SCORES & PREDICTIONS

_Calculated by AI after every interaction._

```typescript
interface LeadScores {
  // Overall quality and intent
  leadScore: number; // 0-100 overall
  buyingIntentScore: number; // 0-100 how close to purchase
  engagementScore: number; // 0-100 how responsive
  relationshipScore: number; // 0-100 rapport built
  fitScore: number; // 0-100 how good a customer fit

  // Temperature
  leadTemperature: "cold" | "warm" | "hot" | "lost" | "won";

  // Risk flags (auto-set by AI)
  riskFlags: Array<{
    type:
      | "going_cold" // No response in X days after positive signal
      | "competitor_risk" // Mentioned competitor recently
      | "stalling_pattern" // Same objection raised 3+ calls
      | "champion_risk" // Contact changed role/company
      | "budget_risk" // Budget mentioned as blocker twice
      | "authority_risk"; // Decision maker not engaged
    severity: "low" | "medium" | "high";
    detectedAt: Date;
    notes: string;
  }>;

  // Recommended actions
  recommendedNextAction: string;
  recommendedNextChannel: "call" | "whatsapp" | "email";
  recommendedNextTiming: Date;
  recommendedPersonaId?: string; // Which voice persona to use
}
```

---

## THE REMARK SYSTEM — MOST IMPORTANT FEATURE

After every call, the AI writes a structured remark.
This remark is read by the AI before the next call.
The remark IS the institutional memory of this relationship.

```typescript
interface CallRemark {
  id: string;
  callId: string;
  leadId: string;
  callNumber: number; // "This was call #3"
  callDurationSeconds: number;
  personaUsed: string; // Which voice persona

  // Written by AI — in plain English — read by AI next call
  moodThisCall: string;
  // e.g. "Started guarded, warmed significantly after
  //        fintech case study, ended genuinely engaged"

  whatWorked: string[];
  // e.g. ["Mentioning team size pain landed immediately",
  //        "Slowing down when he interrupted worked well",
  //        "ROI framing 'saves 2 hires' resonated strongly"]

  whatToAvoidNextTime: string[];
  // e.g. ["Gets impatient when recapping previous call",
  //        "Don't pitch pricing until he asks",
  //        "Avoid mentioning competitor X by name"]

  personalDetailsCaptured: string[];
  // e.g. ["Team of 8, recently lost one person",
  //        "Mentioned 'trying to do more with less this year'",
  //        "Based in Manchester, prefers calls before 11am"]

  openLoops: Array<{
    item: string;
    type: "promise_made" | "question_unanswered" | "follow_up_needed";
    dueDate?: Date;
    resolved: boolean;
  }>;
  // e.g. {item: "Promised to send API integration doc",
  //        type: "promise_made", dueDate: "tomorrow"}

  nextCallStrategy: string;
  // e.g. "Open by asking if he spoke to CTO.
  //        Lead with integration story, not pricing.
  //        Reference 'doing more with less' line naturally.
  //        He responds to directness — don't over-soften."

  predictedNextObjection: string;
  // e.g. "What does integration actually look like? (CTO influence)"

  dealTemperatureChange: "heated_up" | "same" | "cooled_down";
  dealTemperatureNote: string;
  // e.g. "Cold → Warm. Genuine interest shown for first time."

  recommendedNextAction: string;
  recommendedNextTiming: Date;

  generatedAt: Date;
  generatedByModel: string; // Which LLM wrote this
}
```

---

## HOW PRECALLBRAINSERVICE READS THE LEAD PROFILE

Before every call, Claude Sonnet reads the complete profile
and generates a personalised game plan. The prompt includes:

```typescript
function buildPreCallPrompt(
  lead: FullLeadProfile,
  intel: BusinessIntelligence,
  centralBrain: CentralBrainInsights,
): string {
  return `
You are preparing ${intel.company.agentName} for a call with ${lead.preferredName}.

═══════════════════════════════════════════
WHO THIS PERSON IS
═══════════════════════════════════════════
Name: ${lead.preferredName} (full: ${lead.fullName})
Role: ${lead.jobTitle} at ${lead.companyName}
      (${lead.companySize} company, ${lead.industry})
Location: ${lead.city}, ${lead.countryCode} — ${lead.timezone}
This is call number: ${lead.callHistory.length + 1}

═══════════════════════════════════════════
WHAT WE KNOW ABOUT THEIR PERSONALITY
═══════════════════════════════════════════
Communication: ${lead.personality.communicationStyle}
Pace: ${lead.personality.pacePreference}
Decision style: ${lead.personality.decisionStyle}

Responds well to: ${lead.personality.respondsWellTo.join(", ")}
Gets frustrated by: ${lead.personality.getsFrustratedBy.join(", ")}
Gets excited by: ${lead.personality.getsExcitedBy.join(", ")}

═══════════════════════════════════════════
PERSONAL DETAILS THEY'VE SHARED
═══════════════════════════════════════════
${lead.zeroPartyData.notableQuotes
  .map((q) => `They said: "${q.quote}" (context: ${q.context})`)
  .join("\n")}
${lead.zeroPartyData.recentLifeEvents?.join("\n") || ""}
${lead.zeroPartyData.familyMentioned?.join(", ") || ""}

═══════════════════════════════════════════
LAST CALL REMARK
═══════════════════════════════════════════
${
  lead.lastRemark
    ? `
Mood last call: ${lead.lastRemark.moodThisCall}
What worked: ${lead.lastRemark.whatWorked.join(" | ")}
Avoid: ${lead.lastRemark.whatToAvoidNextTime.join(" | ")}
Open loops: ${lead.lastRemark.openLoops
        .filter((l) => !l.resolved)
        .map((l) => l.item)
        .join(" | ")}
Next call strategy: ${lead.lastRemark.nextCallStrategy}
Predicted objection: ${lead.lastRemark.predictedNextObjection}
`
    : "This is the first call."
}

═══════════════════════════════════════════
SALES STATUS
═══════════════════════════════════════════
Stage: ${lead.sales.dealStage}
Urgency: ${lead.sales.urgency}
Budget: ${lead.sales.budgetStatus}
Open objections: ${lead.sales.objections
    .filter((o) => o.status === "open")
    .map((o) => o.objection)
    .join(" | ")}
Buying signals: ${lead.sales.buyingSignals.map((s) => s.signal).join(" | ")}
Competitors mentioned: ${lead.sales.competitorsMentioned.map((c) => c.name).join(", ")}

═══════════════════════════════════════════
CENTRAL BRAIN RECOMMENDATIONS
═══════════════════════════════════════════
${centralBrain.recommendedOpeningStyle}
${centralBrain.bestStoryForThisProfile}
${centralBrain.winningPatternForThisSegment}
${centralBrain.riskWarnings}

═══════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════
Write a call brief with:
1. OPENING_LINE: First thing to say (reference open loop if exists)
2. STRATEGY: 3-4 sentences on approach for this call
3. LEAD_WITH: What to focus on first
4. AVOID: What not to do or say
5. PREDICTED_OBJECTION: What they'll likely push back on
6. BEST_RESPONSE: How to handle that objection
7. CLOSE_QUESTION: The closing question to use if ready
8. PERSONA_INSTRUCTION: Any voice/personality adjustments
  `.trim();
}
```

---

## DATABASE SCHEMA

```sql
-- Core lead table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name VARCHAR(255) NOT NULL,
  preferred_name VARCHAR(100),
  job_title VARCHAR(255),
  seniority_level VARCHAR(50),
  company_name VARCHAR(255),
  company_size VARCHAR(20),
  industry VARCHAR(100),
  company_website TEXT,
  linkedin_url TEXT,

  -- Location
  country_code CHAR(2),
  city VARCHAR(100),
  timezone VARCHAR(50),

  -- Contact
  primary_phone VARCHAR(20) NOT NULL,
  whatsapp_phone VARCHAR(20),
  office_phone VARCHAR(20),
  email VARCHAR(255),
  preferred_channel VARCHAR(20) DEFAULT 'unknown',
  preferred_call_time VARCHAR(50),
  preferred_call_days TEXT[],
  messaging_preference VARCHAR(10),
  messaging_preference_detected_at TIMESTAMPTZ,

  -- Source
  source VARCHAR(50),
  referral_name VARCHAR(255),
  campaign_id UUID,

  -- Personality (AI-observed, updated after every call)
  communication_style VARCHAR(30) DEFAULT 'unknown',
  decision_style VARCHAR(30) DEFAULT 'unknown',
  tone_preference VARCHAR(20) DEFAULT 'unknown',
  pace_preference VARCHAR(20) DEFAULT 'unknown',
  responds_well_to TEXT[],
  gets_frustrated_by TEXT[],
  gets_excited_by TEXT[],
  trust_signals TEXT[],
  humor_style VARCHAR(20),
  detected_gender VARCHAR(20) DEFAULT 'unknown',

  -- Zero-party data (mentioned voluntarily)
  family_mentioned TEXT[],
  pets_mentioned TEXT[],
  hobbies TEXT[],
  recent_life_events TEXT[],
  sports_mentioned TEXT[],
  years_at_company VARCHAR(50),
  career_background_notes TEXT,
  professional_frustrations TEXT[],
  yearly_goals TEXT[],
  quarterly_pressures TEXT[],

  -- Sales intelligence
  deal_stage VARCHAR(20) DEFAULT 'cold',
  problem_awareness VARCHAR(20) DEFAULT 'not_aware',
  budget_status VARCHAR(30) DEFAULT 'unknown',
  budget_range VARCHAR(100),
  budget_cycle_month INTEGER,
  budget_holder VARCHAR(30) DEFAULT 'unknown',
  budget_holder_role VARCHAR(100),
  urgency VARCHAR(20) DEFAULT 'no_urgency',
  target_decision_date DATE,
  target_start_date DATE,
  predicted_deal_value DECIMAL(10,2),
  predicted_close_date DATE,
  predicted_next_objection TEXT,
  win_probability INTEGER,

  -- Scores (0-100, updated after every interaction)
  lead_score INTEGER DEFAULT 0,
  buying_intent_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  relationship_score INTEGER DEFAULT 0,
  fit_score INTEGER DEFAULT 0,
  lead_temperature VARCHAR(20) DEFAULT 'cold',

  -- Recommendations (set by AI after each call)
  recommended_next_action TEXT,
  recommended_next_channel VARCHAR(20),
  recommended_next_timing TIMESTAMPTZ,
  recommended_persona_id UUID,

  -- Persona preferences
  preferred_persona_id UUID,
  preferred_language VARCHAR(10),
  languages_detected TEXT[],

  -- Whatsapp/inbound
  last_whatsapp_at TIMESTAMPTZ,
  buying_signal_detected_at TIMESTAMPTZ,
  buying_signal_channel VARCHAR(20),

  -- Timestamps
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notable quotes
CREATE TABLE lead_notable_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  quote TEXT NOT NULL,
  context TEXT,
  call_id UUID,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision influencers
CREATE TABLE lead_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  name VARCHAR(255),
  role VARCHAR(100) NOT NULL,
  influence VARCHAR(20),  -- 'blocker'|'champion'|'neutral'
  notes TEXT,
  identified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objections log
CREATE TABLE lead_objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  call_id UUID,
  objection TEXT NOT NULL,
  category VARCHAR(30),
  status VARCHAR(30) DEFAULT 'open',
  resolved_with TEXT,
  raised_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Buying signals log
CREATE TABLE lead_buying_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  call_id UUID,
  signal TEXT NOT NULL,
  strength VARCHAR(10),
  channel VARCHAR(20),
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors mentioned
CREATE TABLE lead_competitors_mentioned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  call_id UUID,
  competitor_name VARCHAR(255) NOT NULL,
  context TEXT,
  sentiment VARCHAR(30),
  mentioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk flags
CREATE TABLE lead_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  flag_type VARCHAR(50) NOT NULL,
  severity VARCHAR(10),
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Post-call remarks (the most important table)
CREATE TABLE call_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id),
  call_number INTEGER NOT NULL,
  call_duration_seconds INTEGER,
  persona_used VARCHAR(100),

  mood_this_call TEXT,
  what_worked TEXT[],
  what_to_avoid_next_time TEXT[],
  personal_details_captured TEXT[],
  next_call_strategy TEXT,
  predicted_next_objection TEXT,
  deal_temperature_change VARCHAR(20),
  deal_temperature_note TEXT,
  recommended_next_action TEXT,
  recommended_next_timing TIMESTAMPTZ,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by_model VARCHAR(100)
);

-- Open loops per remark
CREATE TABLE call_remark_open_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remark_id UUID REFERENCES call_remarks(id),
  lead_id UUID REFERENCES leads(id),
  item TEXT NOT NULL,
  loop_type VARCHAR(30),
  due_date TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

-- Touchpoint timeline
CREATE TABLE lead_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  touchpoint_type VARCHAR(20),
  -- 'call'|'whatsapp'|'sms'|'email'|'no_answer'|'voicemail'
  channel VARCHAR(20),
  direction VARCHAR(10),               -- 'outbound'|'inbound'
  duration_seconds INTEGER,
  outcome VARCHAR(30),
  notes TEXT,
  persona_used VARCHAR(100),
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_country ON leads(country_code);
CREATE INDEX idx_leads_stage ON leads(deal_stage);
CREATE INDEX idx_leads_temperature ON leads(lead_temperature);
CREATE INDEX idx_leads_next_action_timing
  ON leads(recommended_next_timing)
  WHERE deal_stage NOT IN ('won', 'lost');
CREATE INDEX idx_call_remarks_lead ON call_remarks(lead_id);
CREATE INDEX idx_touchpoints_lead ON lead_touchpoints(lead_id);
CREATE INDEX idx_open_loops_unresolved
  ON call_remark_open_loops(lead_id)
  WHERE resolved = FALSE;
```

---

## KEY RULES FOR THIS MODULE

- NEVER overwrite personality fields with defaults — always append/update
- NEVER clear zero-party data — it compounds in value over time
- NEVER generate a remark without saving it to call_remarks table
- NEVER start a call without loading the last remark
- ALWAYS resolve open loops explicitly — never let them accumulate silently
- ALWAYS update lead scores after every interaction
- ALWAYS update recommended_next_timing after every call
- ALWAYS save notable quotes with the exact words used — never paraphrase
- NEVER expose full lead profile via API without authentication
- NEVER delete leads — soft delete only (add deleted_at field)
