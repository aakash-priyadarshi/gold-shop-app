-- Tax Configuration Tables
-- Stores country-specific tax rules and configurations

-- Tax Config (main table)
CREATE TABLE IF NOT EXISTS tax_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(2) NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    CONSTRAINT unique_country_effective_period UNIQUE(country, effective_from)
);

-- Tax Rules (individual rules within a config)
CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES tax_config(id) ON DELETE CASCADE,
    rule_id VARCHAR(50) NOT NULL, -- e.g., 'NP_LUXURY_TAX'
    name VARCHAR(50) NOT NULL, -- e.g., 'LUXURY_TAX'
    display_name VARCHAR(100) NOT NULL, -- e.g., 'Luxury Tax'
    rate DECIMAL(5, 4) NOT NULL, -- 0.0200 for 2%
    priority INTEGER DEFAULT 999,
    apply_when JSONB NOT NULL, -- Conditions: { "isJewellery": true }
    base VARCHAR(50) NOT NULL, -- 'item_subtotal_excluding_tax', etc.
    base_array JSONB, -- For multiple base types
    vat_mode VARCHAR(30), -- 'WHOLE_ITEM_IF_STUDDED', 'STONES_ONLY', 'DISABLED'
    include_in_base JSONB, -- { "makingCharge": true, "plating": true }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_rule_in_config UNIQUE(config_id, rule_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tax_config_country_active ON tax_config(country, is_active);
CREATE INDEX IF NOT EXISTS idx_tax_config_effective_from ON tax_config(effective_from);
CREATE INDEX IF NOT EXISTS idx_tax_rules_config_id ON tax_rules(config_id);
CREATE INDEX IF NOT EXISTS idx_tax_rules_priority ON tax_rules(priority);

-- Audit log for tax rule changes
CREATE TABLE IF NOT EXISTS tax_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES tax_config(id),
    rule_id UUID REFERENCES tax_rules(id),
    action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'
    changed_fields JSONB,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Seed Nepal tax config (FY 2025/26)
INSERT INTO tax_config (country, effective_from, is_active, metadata) VALUES
('NP', '2025-07-16', true, '{"description": "Nepal FY 2025/26 jewellery tax rules", "source": "Nepal Budget FY 2025/26"}')
ON CONFLICT (country, effective_from) DO NOTHING;

-- Get the config ID for Nepal
DO $$
DECLARE
    nepal_config_id UUID;
BEGIN
    SELECT id INTO nepal_config_id FROM tax_config WHERE country = 'NP' AND effective_from = '2025-07-16';
    
    -- Insert luxury tax rule
    INSERT INTO tax_rules (
        config_id, rule_id, name, display_name, rate, priority,
        apply_when, base, include_in_base
    ) VALUES (
        nepal_config_id, 'NP_LUXURY_TAX', 'LUXURY_TAX', 'Luxury Tax', 0.02, 1,
        '{"isJewellery": true}',
        'item_subtotal_excluding_tax',
        '{"makingCharge": true, "plating": true, "finish": true}'
    ) ON CONFLICT (config_id, rule_id) DO NOTHING;
    
    -- Insert VAT rule
    INSERT INTO tax_rules (
        config_id, rule_id, name, display_name, rate, priority,
        apply_when, base, vat_mode, include_in_base
    ) VALUES (
        nepal_config_id, 'NP_VAT_STONE', 'VAT', 'VAT', 0.13, 2,
        '{"hasGemstones": true}',
        'item_subtotal_excluding_tax',
        'WHOLE_ITEM_IF_STUDDED',
        '{"makingCharge": true, "plating": true, "finish": true}'
    ) ON CONFLICT (config_id, rule_id) DO NOTHING;
END $$;

-- Seed India tax config
INSERT INTO tax_config (country, effective_from, is_active, metadata) VALUES
('IN', '2024-01-01', true, '{"description": "India GST for jewellery", "source": "GST Act"}')
ON CONFLICT (country, effective_from) DO NOTHING;

DO $$
DECLARE
    india_config_id UUID;
BEGIN
    SELECT id INTO india_config_id FROM tax_config WHERE country = 'IN' AND effective_from = '2024-01-01';
    
    -- Insert GST on precious metals
    INSERT INTO tax_rules (
        config_id, rule_id, name, display_name, rate, priority,
        apply_when, base, base_array
    ) VALUES (
        india_config_id, 'IN_GST_PRECIOUS_METAL', 'GST', 'GST', 0.03, 1,
        '{"isJewellery": true}',
        'metalSubtotal',
        '["metalSubtotal", "gemstoneSubtotal"]'
    ) ON CONFLICT (config_id, rule_id) DO NOTHING;
    
    -- Insert GST on making charges
    INSERT INTO tax_rules (
        config_id, rule_id, name, display_name, rate, priority,
        apply_when, base, base_array
    ) VALUES (
        india_config_id, 'IN_GST_MAKING', 'GST', 'GST on Making', 0.05, 2,
        '{"isJewellery": true}',
        'makingChargeSubtotal',
        '["makingChargeSubtotal", "finishSubtotal", "platingSubtotal"]'
    ) ON CONFLICT (config_id, rule_id) DO NOTHING;
END $$;
