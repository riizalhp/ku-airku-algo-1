-- =====================================================
-- EMERGENCY ROLLBACK - Login Issues
-- =====================================================
-- Run this immediately if you can't login
-- =====================================================

-- Step 1: Drop the policies we just created
DROP POLICY IF EXISTS "Admins can delete any route" ON route_plans;

DROP POLICY IF EXISTS "Admins can delete any route stop" ON route_stops;

DROP POLICY IF EXISTS "Admins can update any order" ON orders;

-- Step 2: Check if users table RLS is blocking login
SELECT
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE
    tablename = 'users'
ORDER BY policyname;

-- Step 3: Ensure users table allows read for authenticated users
DROP POLICY IF EXISTS "Users can read own profile" ON users;

CREATE POLICY "Allow authenticated users to read users" ON users FOR
SELECT TO authenticated USING (true);
-- Allow all authenticated users to read

-- Step 4: Ensure users can read their own profile
CREATE POLICY "Users can read own profile" ON users FOR
SELECT TO authenticated USING (
        auth.uid () = id
        OR true
    );
-- Permissive: allow all

-- Step 5: Check auth.users (this should always work)
SELECT id, email, created_at FROM auth.users LIMIT 5;

-- Step 6: Verify you can query users table
SELECT id, name, email, role FROM users LIMIT 5;

-- Step 7: Disable RLS temporarily on users table (EMERGENCY ONLY)
-- Uncomment this line if nothing else works:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 8: Re-enable RLS with permissive policy
-- After disabling, re-enable with:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Then run Step 3 above again

-- Step 9: Check current session
SELECT
    auth.uid () as current_user_id,
    auth.jwt () as current_token;

-- Step 10: Verify policies after rollback
SELECT
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG (policyname, ', ') as policies
FROM pg_policies
WHERE
    tablename IN (
        'users',
        'route_plans',
        'route_stops',
        'orders'
    )
GROUP BY
    tablename;