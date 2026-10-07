-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS & AUTHENTICATION
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('student', 'trainer', 'admin')),
    institution     VARCHAR(255),
    student_id      VARCHAR(50),
    cohort          VARCHAR(100),
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_cohort ON users(cohort);

-- WELDING CONFIGURATION
CREATE TABLE joint_types (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(50) NOT NULL,
    description      TEXT,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO joint_types (name, description, difficulty_level) VALUES
    ('Butt Joint', 'Two workpieces aligned in the same plane', 'beginner'),
    ('Lap Joint', 'Two overlapping workpieces', 'beginner'),
    ('T-Joint', 'Workpieces at right angles forming a T shape', 'intermediate'),
    ('Corner Joint', 'Two workpieces meeting at a corner', 'advanced');

CREATE TABLE electrode_types (
    id                      SERIAL PRIMARY KEY,
    code                    VARCHAR(20) NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    recommended_current_min DECIMAL(6,2),
    recommended_current_max DECIMAL(6,2),
    suitable_positions      TEXT[],
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO electrode_types (code, name, description, recommended_current_min, recommended_current_max, suitable_positions) VALUES
    ('E6013', 'E6013 - Mild Steel', 'General-purpose mild steel electrode, easy to strike', 60, 150, ARRAY['flat', 'horizontal', 'vertical', 'overhead']),
    ('E7018', 'E7018 - Low Hydrogen', 'Low hydrogen electrode for structural welding', 80, 200, ARRAY['flat', 'horizontal', 'vertical', 'overhead']),
    ('E6010', 'E6010 - Cellulosic', 'Deep penetration electrode for root passes', 70, 130, ARRAY['flat', 'vertical']),
    ('E7024', 'E7024 - Iron Powder', 'High deposition rate electrode for flat positions', 120, 250, ARRAY['flat']);

CREATE TABLE welding_positions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    difficulty  INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    description TEXT
);

INSERT INTO welding_positions (code, name, difficulty, description) VALUES
    ('1G', 'Flat', 1, 'Welding in flat position, easiest for beginners'),
    ('2G', 'Horizontal', 2, 'Welding in horizontal position'),
    ('3G', 'Vertical Up', 3, 'Welding vertically upward'),
    ('4G', 'Overhead', 4, 'Welding overhead, most challenging');

-- WELDING SESSIONS
CREATE TABLE welding_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joint_type_id       INTEGER REFERENCES joint_types(id),
    electrode_id        INTEGER REFERENCES electrode_types(id),
    position_id         INTEGER REFERENCES welding_positions(id),
    welding_speed       DECIMAL(6,2),
    welding_current     DECIMAL(6,2),
    voltage             DECIMAL(6,2),
    workpiece_gap       DECIMAL(4,2),
    workpiece_thickness DECIMAL(4,2),
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMP WITH TIME ZONE,
    duration_seconds    INTEGER,
    completion_pct      DECIMAL(5,2) DEFAULT 0,
    telemetry_data      JSONB,
    weld_path_data      JSONB,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON welding_sessions(user_id);
CREATE INDEX idx_sessions_status ON welding_sessions(status);
CREATE INDEX idx_sessions_date ON welding_sessions(started_at);

-- TELEMETRY DATA
CREATE TABLE welding_telemetry (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES welding_sessions(id) ON DELETE CASCADE,
    timestamp_ms    INTEGER NOT NULL,
    torch_x         DECIMAL(8,3) NOT NULL,
    torch_y         DECIMAL(8,3) NOT NULL,
    speed           DECIMAL(6,2),
    path_deviation  DECIMAL(6,3),
    current_reading DECIMAL(6,2),
    heat_input      DECIMAL(8,2),
    arc_length      DECIMAL(4,2),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_session ON welding_telemetry(session_id);
CREATE INDEX idx_telemetry_timestamp ON welding_telemetry(session_id, timestamp_ms);

-- ASSESSMENTS
CREATE TABLE assessments (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id               UUID NOT NULL REFERENCES welding_sessions(id) ON DELETE CASCADE,
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score            DECIMAL(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    grade                    VARCHAR(20) NOT NULL CHECK (grade IN ('distinction', 'credit', 'pass', 'fail')),
    speed_accuracy_score     DECIMAL(5,2),
    bead_quality_score       DECIMAL(5,2),
    fusion_quality_score     DECIMAL(5,2),
    penetration_score        DECIMAL(5,2),
    alignment_score          DECIMAL(5,2),
    consistency_score        DECIMAL(5,2),
    process_control_score    DECIMAL(5,2),
    avg_speed                DECIMAL(6,2),
    avg_deviation            DECIMAL(6,3),
    max_deviation            DECIMAL(6,3),
    speed_variance           DECIMAL(8,4),
    completion_time_seconds  INTEGER,
    weld_bead_metrics        JSONB,
    ai_feedback_summary      TEXT,
    strengths                JSONB,
    weaknesses               JSONB,
    improvements             JSONB,
    practice_recommendations JSONB,
    assessed_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessments_session ON assessments(session_id);
CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_score ON assessments(overall_score);

-- DEFECT PREDICTIONS
CREATE TABLE defect_predictions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    session_id        UUID NOT NULL REFERENCES welding_sessions(id) ON DELETE CASCADE,
    defect_type       VARCHAR(100) NOT NULL,
    defect_category   VARCHAR(50) NOT NULL CHECK (defect_category IN ('surface', 'internal', 'geometric', 'metallurgical')),
    severity          VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    probability       DECIMAL(5,4) NOT NULL CHECK (probability BETWEEN 0 AND 1),
    description       TEXT NOT NULL,
    probable_cause    TEXT NOT NULL,
    corrective_action TEXT NOT NULL,
    affected_region   JSONB,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_defects_session ON defect_predictions(session_id);
CREATE INDEX idx_defects_type ON defect_predictions(defect_type);

-- COMPETENCY FRAMEWORK
CREATE TABLE competency_framework (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category    VARCHAR(50) NOT NULL,
    weight      DECIMAL(3,2) DEFAULT 1.00,
    difficulty  INTEGER CHECK (difficulty BETWEEN 1 AND 5)
);

INSERT INTO competency_framework (code, name, description, category, weight, difficulty) VALUES
    ('JP-01', 'Joint Preparation', 'Ability to select and prepare appropriate joint configurations', 'preparation', 1.00, 2),
    ('WP-01', 'Parameter Selection', 'Ability to select correct welding parameters for the task', 'preparation', 1.50, 3),
    ('TC-01', 'Torch Control', 'Ability to maintain proper torch position and manipulation', 'execution', 2.00, 3),
    ('TS-01', 'Travel Speed Control', 'Ability to maintain consistent and appropriate travel speed', 'execution', 2.00, 3),
    ('DI-01', 'Defect Identification', 'Ability to identify and understand welding defects', 'evaluation', 1.50, 4),
    ('WQ-01', 'Weld Quality Evaluation', 'Ability to evaluate weld quality against standards', 'evaluation', 1.50, 4),
    ('SA-01', 'Safety Awareness', 'Understanding and application of welding safety procedures', 'safety', 2.00, 1);

CREATE TABLE competency_records (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id INTEGER NOT NULL REFERENCES competency_framework(id),
    session_id    UUID REFERENCES welding_sessions(id) ON DELETE SET NULL,
    level         VARCHAR(20) NOT NULL CHECK (level IN ('competent', 'developing', 'not_yet_competent')),
    score         DECIMAL(5,2) CHECK (score BETWEEN 0 AND 100),
    evidence      JSONB,
    assessed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competency_user ON competency_records(user_id);
CREATE INDEX idx_competency_framework ON competency_records(competency_id);
CREATE INDEX idx_competency_level ON competency_records(level);

-- TUTOR RECOMMENDATIONS
CREATE TABLE tutor_recommendations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type    VARCHAR(50) NOT NULL,
    pattern_data    JSONB NOT NULL,
    recommendation  TEXT NOT NULL,
    resource_type   VARCHAR(30),
    resource_url    VARCHAR(500),
    priority        INTEGER CHECK (priority BETWEEN 1 AND 5),
    is_dismissed    BOOLEAN DEFAULT FALSE,
    is_completed    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tutor_user ON tutor_recommendations(user_id);
CREATE INDEX idx_tutor_pattern ON tutor_recommendations(pattern_type);

-- LEARNING ANALYTICS
CREATE TABLE learning_snapshots (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    total_attempts          INTEGER DEFAULT 0,
    avg_score               DECIMAL(5,2),
    best_score              DECIMAL(5,2),
    sessions_completed      INTEGER DEFAULT 0,
    sessions_abandoned      INTEGER DEFAULT 0,
    competencies_achieved   INTEGER DEFAULT 0,
    competencies_developing INTEGER DEFAULT 0,
    competencies_not_yet    INTEGER DEFAULT 0,
    score_trend_7d          DECIMAL(5,2),
    score_trend_30d         DECIMAL(5,2),
    strongest_skill         VARCHAR(50),
    weakest_skill           VARCHAR(50),
    skill_breakdown         JSONB,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_snapshots_user ON learning_snapshots(user_id);
CREATE INDEX idx_snapshots_date ON learning_snapshots(snapshot_date);

-- TRAINER ANALYTICS
CREATE TABLE class_analytics (
    id                 BIGSERIAL PRIMARY KEY,
    cohort             VARCHAR(100) NOT NULL,
    snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    total_students     INTEGER,
    active_students    INTEGER,
    avg_score          DECIMAL(5,2),
    distinction_count  INTEGER DEFAULT 0,
    credit_count       INTEGER DEFAULT 0,
    pass_count         INTEGER DEFAULT 0,
    fail_count         INTEGER DEFAULT 0,
    top_competencies   JSONB,
    weak_competencies  JSONB,
    common_defects     JSONB,
    common_mistakes    JSONB,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_class_cohort ON class_analytics(cohort);
CREATE INDEX idx_class_date ON class_analytics(snapshot_date);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- VIEWS
CREATE VIEW v_student_progress AS
SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.cohort,
    COUNT(ws.id) AS total_sessions,
    COUNT(CASE WHEN ws.status = 'completed' THEN 1 END) AS completed_sessions,
    AVG(a.overall_score) AS avg_score,
    MAX(a.overall_score) AS best_score,
    COUNT(CASE WHEN a.grade = 'distinction' THEN 1 END) AS distinctions,
    COUNT(CASE WHEN a.grade = 'credit' THEN 1 END) AS credits,
    COUNT(CASE WHEN a.grade = 'fail' THEN 1 END) AS fails
FROM users u
LEFT JOIN welding_sessions ws ON u.id = ws.user_id
LEFT JOIN assessments a ON ws.id = a.session_id
WHERE u.role = 'student'
GROUP BY u.id, u.first_name, u.last_name, u.email, u.cohort;

CREATE VIEW v_competency_rates AS
SELECT 
    cf.code,
    cf.name,
    cf.category,
    COUNT(cr.id) AS total_assessments,
    COUNT(CASE WHEN cr.level = 'competent' THEN 1 END) AS competent_count,
    COUNT(CASE WHEN cr.level = 'developing' THEN 1 END) AS developing_count,
    COUNT(CASE WHEN cr.level = 'not_yet_competent' THEN 1 END) AS not_yet_count,
    ROUND(
        COUNT(CASE WHEN cr.level = 'competent' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(cr.id), 0) * 100, 2
    ) AS achievement_rate
FROM competency_framework cf
LEFT JOIN competency_records cr ON cf.id = cr.competency_id
GROUP BY cf.id, cf.code, cf.name, cf.category;

CREATE VIEW v_common_defects AS
SELECT 
    defect_type,
    defect_category,
    COUNT(*) AS occurrence_count,
    AVG(probability) AS avg_probability,
    ROUND(AVG(probability)::DECIMAL * 100, 2) AS avg_probability_pct
FROM defect_predictions
GROUP BY defect_type, defect_category
ORDER BY occurrence_count DESC;
