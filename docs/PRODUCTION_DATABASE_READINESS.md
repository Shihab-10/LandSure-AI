# LandSure AI — Production Database Architecture & Real Data Provenance

## 1. Current State & Separation of Concerns

LandSure AI maintains an explicit separation between reference datasets and mutable user storage:

1. **Synthetic Land Intelligence Dataset (`datasets/synthetic/landsure_synthetic_v2_3.db`)**:
   - Status: **Read-Only Reference Database** (700 parcels).
   - Enforced at SQLite connection layer via URI parameter `?mode=ro`.
   - Never modified by runtime operations, user queries, or demo sessions.
   - All responses originating from this dataset carry `"synthetic": true` and `"officially_verified": false` tags.

2. **Authentication & Session Database (`private/landsure_auth.db`)**:
   - Status: **Mutable Persistence Store**.
   - Contains hashed credentials (Argon2id/bcrypt via `pwdlib`), user roles (`admin`, `reviewer`, `viewer`), `token_version` for instant revocation, and timestamps.
   - Configurable via the `LANDSURE_AUTH_DB` environment variable.
   - Demo visitors authenticate via stateless short-lived JWT tokens without polluting this database.

---

## 2. Production Database Recommendation: Managed PostgreSQL

### Why SQLite is Not Production-Ready on Ephemeral Cloud Containers
- Hosting platforms like Render, Railway, and Heroku use ephemeral container filesystems. Any write to a local SQLite file in the container is permanently lost when the service restarts, deploys a new commit, or spins down during idle periods.
- While Render offers attached persistent disks (`render.yaml` disk mount), standard scale-out (multiple web workers or replicas) cannot safely share a single SQLite database due to POSIX locking limitations and write concurrency bottlenecks (`sqlite3.OperationalError: database is locked`).

### Recommended Production Solution
- **Managed PostgreSQL** (e.g., Render Managed PostgreSQL, Supabase, Neon Serverless Postgres, or AWS RDS Aurora).
- **Driver**: `asyncpg` with `SQLAlchemy 2.0` or `psycopg3`.
- **Connection Pooling**: Managed via `PgBouncer` to support high concurrency.

---

## 3. Production PostgreSQL Migration Schema (DDL)

```sql
-- 1. Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'reviewer', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);

-- 2. Audit Trail & Access Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_resource VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Future Transactional & Advisory Records
CREATE TABLE legal_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id VARCHAR(100) NOT NULL,
    client_username VARCHAR(100) NOT NULL REFERENCES users(username),
    parcel_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    consultation_mode VARCHAR(50) NOT NULL DEFAULT 'CHAT',
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Authorized Real-Data Ingestion & Provenance Architecture

When transitioning from synthetic data to genuine land records authorized by official agencies (e.g., Land Ministry, Settlement Offices, Sub-Registry), LandSure AI enforces a strict **Data Provenance and Verification Lifecycle**:

### Provenance Metadata Table
```sql
CREATE TABLE data_provenance_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agency VARCHAR(255) NOT NULL,        -- e.g., 'Ministry of Land, Survey Wing'
    agency_jurisdiction VARCHAR(100) NOT NULL,   -- e.g., 'Dhaka District'
    authorized_officer_id VARCHAR(100) NOT NULL, -- e.g., 'AC-Land Officer ID'
    digital_signature_hash VARCHAR(128) NOT NULL,-- SHA-256 / Ed25519 hash of source manifest
    import_protocol VARCHAR(50) NOT NULL,       -- e.g., 'OFFICIAL_GOV_API_V1'
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record_count INTEGER NOT NULL,
    verification_tier VARCHAR(50) NOT NULL CHECK (
        verification_tier IN ('SYNTHETIC_MOCK', 'UNVERIFIED_INGESTED', 'AGENCY_CERTIFIED', 'DISPUTED')
    )
);

CREATE TABLE real_land_parcels (
    parcel_id VARCHAR(120) PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES data_provenance_batches(batch_id),
    khatian_number VARCHAR(100) NOT NULL,
    mouza VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    upazila VARCHAR(100) NOT NULL,
    official_verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED_INGESTED',
    verified_by_agency VARCHAR(255),
    verification_timestamp TIMESTAMPTZ,
    chain_of_custody_hash VARCHAR(128) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'
);
```

### Safety Rules for Real-Data vs Synthetic Data
1. **Never Overwrite Synthetic Datasets**:
   - Synthetic benchmark datasets must remain quarantined in `datasets/synthetic/` for regression tests and model validation.
2. **Explicit Provenance Watermarking**:
   - Every API response must explicitly specify `verification_status`:
     - `"synthetic": true` & `"officially_verified": false` for simulated records.
     - `"synthetic": false` & `"officially_verified": true` ONLY if signed by a certified `data_provenance_batches` authority.
3. **No Phantom Legal Claims**:
   - Any land parcel lacking an unbroken cryptographic provenance hash will default to `"UNVERIFIED_INGESTED"` with clear cautionary notices displayed in the Bangla-first UI.
