-- =====================================================
-- COMPLETE DATABASE SCHEMA WITH NEW TIER MODEL
-- =====================================================

-- =====================================================
-- ENABLE REQUIRED EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('purchase', 'refund');
    END IF;
END $$;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  
  -- New tier model
  tier VARCHAR(20) DEFAULT 'free' NOT NULL,
  owned_chapters INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
  CONSTRAINT valid_tier CHECK (tier IN ('free', 'complete'))
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_owned_chapters ON users USING GIN(owned_chapters);

-- =====================================================
-- PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- New purchase model
  purchase_type VARCHAR(20) NOT NULL, -- 'complete' or 'custom'
  purchase_data JSONB, -- Store chapter IDs for custom purchases
  
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  
  razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_signature TEXT,
  
  status payment_status DEFAULT 'pending' NOT NULL,
  transaction_type transaction_type DEFAULT 'purchase' NOT NULL,
  
  payment_method VARCHAR(50),
  payment_email VARCHAR(255),
  payment_contact VARCHAR(20),
  
  refund_id VARCHAR(255),
  refund_amount INTEGER,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  
  ip_address INET,
  user_agent TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_currency CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT valid_purchase_type CHECK (purchase_type IN ('complete', 'custom')),
  CONSTRAINT payment_id_when_completed CHECK (
    status != 'completed' OR razorpay_payment_id IS NOT NULL
  ),
  CONSTRAINT custom_requires_data CHECK (
    purchase_type != 'custom' OR purchase_data IS NOT NULL
  )
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_razorpay_order_id ON purchases(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_purchases_razorpay_payment_id ON purchases(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_purchase_type ON purchases(user_id, purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchases_user_status ON purchases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_user_created ON purchases(user_id, created_at DESC);

-- Partial index for completed purchases
CREATE INDEX IF NOT EXISTS idx_completed_purchases ON purchases(user_id, purchase_type) 
  WHERE status = 'completed';

-- =====================================================
-- READING PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL,
  chapter_slug VARCHAR(255) NOT NULL,
  
  is_completed BOOLEAN DEFAULT FALSE,
  last_position INTEGER DEFAULT 0,
  reading_time_seconds INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_user_chapter UNIQUE(user_id, chapter_id)
);

-- Indexes for reading progress
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_chapter_id ON reading_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON reading_progress(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_completed ON reading_progress(user_id, is_completed);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  refresh_token TEXT UNIQUE NOT NULL,
  access_token_jti TEXT,
  
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, expires_at);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  
  ip_address INET,
  user_agent TEXT,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
DROP TRIGGER IF EXISTS update_reading_progress_updated_at ON reading_progress;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at
  BEFORE UPDATE ON reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper function to add owned chapters (deduplicates)
-- =====================================================
CREATE OR REPLACE FUNCTION add_owned_chapters(
  p_user_id UUID,
  p_chapters INTEGER[]
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET owned_chapters = (
    SELECT ARRAY_AGG(DISTINCT chapter_id ORDER BY chapter_id)
    FROM (
      SELECT UNNEST(owned_chapters) AS chapter_id
      UNION
      SELECT UNNEST(p_chapters) AS chapter_id
    ) AS combined_chapters
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Auto-update user tier/chapters on purchase
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_tier_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to completed
  IF NEW.status = 'completed' 
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Complete pack purchase
    IF NEW.purchase_type = 'complete' THEN
      UPDATE users
      SET tier = 'complete',
          updated_at = NOW()
      WHERE id = NEW.user_id;
    
    -- Custom chapters purchase
    ELSIF NEW.purchase_type = 'custom' THEN
      PERFORM add_owned_chapters(
        NEW.user_id,
        ARRAY(SELECT jsonb_array_elements_text(NEW.purchase_data->'chapters')::integer)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_user_tier ON purchases;

-- Create trigger
CREATE TRIGGER trigger_update_user_tier
  AFTER INSERT OR UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tier_on_purchase();

-- =====================================================
-- Function: Clean expired sessions
-- =====================================================
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Get user's accessible chapters
-- Returns all chapter IDs the user can access
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_accessible_chapters(p_user_id UUID)
RETURNS TABLE(chapter_id INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH user_access AS (
    SELECT 
      u.tier,
      u.owned_chapters
    FROM users u
    WHERE u.id = p_user_id
  )
  SELECT DISTINCT ch.chapter_id
  FROM (
    -- Free tier gets chapters 1-81
    SELECT generate_series(1, 81) AS chapter_id
    WHERE EXISTS (SELECT 1 FROM user_access WHERE tier = 'free')
    
    UNION
    
    -- Complete tier gets all chapters (1-999)
    SELECT generate_series(1, 999) AS chapter_id
    WHERE EXISTS (SELECT 1 FROM user_access WHERE tier = 'complete')
    
    UNION
    
    -- Owned chapters
    SELECT unnest(ua.owned_chapters) AS chapter_id
    FROM user_access ua
  ) ch
  ORDER BY ch.chapter_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Check if user has access to specific chapter
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_chapter_access(
  p_user_id UUID,
  p_chapter_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier VARCHAR(20);
  v_owned_chapters INTEGER[];
BEGIN
  SELECT tier, owned_chapters
  INTO v_tier, v_owned_chapters
  FROM users
  WHERE id = p_user_id;
  
  -- Complete tier has access to everything
  IF v_tier = 'complete' THEN
    RETURN TRUE;
  END IF;
  
  -- Free tier has access to chapters 1-81
  IF v_tier = 'free' AND p_chapter_id <= 81 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if chapter is in owned_chapters array
  IF p_chapter_id = ANY(v_owned_chapters) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Drop existing views
DROP VIEW IF EXISTS user_purchase_summary CASCADE;
DROP VIEW IF EXISTS active_sessions CASCADE;

-- User purchase summary view
CREATE OR REPLACE VIEW user_purchase_summary AS
SELECT 
  u.id AS user_id,
  u.email,
  u.tier AS current_tier,
  u.owned_chapters,
  ARRAY_LENGTH(u.owned_chapters, 1) AS owned_chapters_count,
  COUNT(p.id) AS total_purchases,
  SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_spent,
  MAX(CASE WHEN p.status = 'completed' THEN p.created_at END) AS last_purchase_date,
  ARRAY_AGG(DISTINCT p.purchase_type) FILTER (WHERE p.status = 'completed') AS purchase_types
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id
GROUP BY u.id, u.email, u.tier, u.owned_chapters;

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  s.id,
  s.user_id,
  u.email,
  s.ip_address,
  s.user_agent,
  s.last_used_at,
  s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS purchases_select_own ON purchases;
DROP POLICY IF EXISTS reading_progress_select_own ON reading_progress;
DROP POLICY IF EXISTS reading_progress_insert_own ON reading_progress;
DROP POLICY IF EXISTS reading_progress_update_own ON reading_progress;
DROP POLICY IF EXISTS sessions_select_own ON sessions;
DROP POLICY IF EXISTS sessions_delete_own ON sessions;

-- Users policies
CREATE POLICY users_select_own 
  ON users FOR SELECT 
  USING (auth.uid() = id);

-- Restrict users from updating tier and owned_chapters directly
CREATE POLICY users_update_own 
  ON users FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = OLD.tier
    AND owned_chapters = OLD.owned_chapters
  );

-- Purchases policies
CREATE POLICY purchases_select_own 
  ON purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY purchases_insert_own 
  ON purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Reading progress policies
CREATE POLICY reading_progress_select_own 
  ON reading_progress FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY reading_progress_insert_own 
  ON reading_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reading_progress_update_own 
  ON reading_progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY sessions_select_own 
  ON sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY sessions_insert_own 
  ON sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_delete_own 
  ON sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT ON purchases TO authenticated;
GRANT ALL ON reading_progress TO authenticated;
GRANT SELECT, INSERT, DELETE ON sessions TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_accessible_chapters(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_chapter_access(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_sessions() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'Core user authentication and profile data with tier-based and custom chapter access';
COMMENT ON TABLE purchases IS 'Razorpay payment transactions supporting complete pack and custom chapter purchases';
COMMENT ON TABLE reading_progress IS 'User reading history and chapter completion tracking';
COMMENT ON TABLE sessions IS 'JWT refresh token storage for authentication';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';

COMMENT ON COLUMN users.tier IS 'User access tier: free (chapters 1-81) or complete (all chapters)';
COMMENT ON COLUMN users.owned_chapters IS 'Array of individually purchased chapter IDs';
COMMENT ON COLUMN purchases.purchase_type IS 'Type of purchase: complete (full access) or custom (specific chapters)';
COMMENT ON COLUMN purchases.purchase_data IS 'JSONB data containing chapter IDs for custom purchases: {"chapters": [1,2,3]}';

COMMENT ON FUNCTION get_user_accessible_chapters(UUID) IS 'Returns all chapter IDs accessible to the user based on tier and owned chapters';
COMMENT ON FUNCTION user_has_chapter_access(UUID, INTEGER) IS 'Checks if user has access to a specific chapter';
COMMENT ON FUNCTION add_owned_chapters(UUID, INTEGER[]) IS 'Adds chapters to user owned_chapters array with deduplication';
COMMENT ON FUNCTION clean_expired_sessions() IS 'Removes expired sessions and returns count of deleted rows';



-- =====================================================
-- END OF SCHEMA
-- =====================================================