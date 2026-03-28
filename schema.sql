-- AuditAI Local Schema Initialization

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Audits Table
CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    transcript TEXT,
    type TEXT,
    audio_data TEXT,
    mime_type TEXT,
    empathy_score INTEGER,
    resolution_score INTEGER,
    compliance_score INTEGER,
    overall_score INTEGER,
    violations JSONB DEFAULT '[]',
    suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER REFERENCES audits(id) ON DELETE CASCADE,
    type TEXT,
    description TEXT,
    severity TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. API Usage Stats Table
CREATE TABLE IF NOT EXISTS api_usage_stats (
    service TEXT,
    usage_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    PRIMARY KEY (service, usage_date)
);


-- Seed data for testing (Optional)
-- Initial seeds removed as per user request to maintain clean agent list.
-- INSERT INTO agents (name, email, role) VALUES 
-- ('System Admin', 'admin@auditai.local', 'supervisor'),
-- ('Test Agent', 'agent@auditai.local', 'agent')
-- ON CONFLICT (email) DO NOTHING;
