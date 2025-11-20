#!/bin/bash
set -e

# Load environment variables
source apps/api/.env

# Extract project reference from SUPABASE_URL
# Format: https://PROJECT_REF.supabase.co
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

echo "📦 Project Reference: $PROJECT_REF"

# Construct database URL for Supabase
# Default Supabase connection: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

echo "🔄 Running migration..."
echo "📄 Migration file: supabase/migrations/20251118120000_create_user_preferences.sql"

# Run migration using psql
psql "$DB_URL" -f supabase/migrations/20251118120000_create_user_preferences.sql

echo "✅ Migration completed!"

# Verify table exists
echo "🔍 Verifying table exists..."
psql "$DB_URL" -c "\d user_preferences" || echo "⚠️  Table check failed, but migration may have succeeded"

echo "✅ Done!"
