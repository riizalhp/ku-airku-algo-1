-- =====================================================
-- FIX LOGIN: Clean up duplicate users policies
-- =====================================================

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;

DROP POLICY IF EXISTS "Users can view own profile" ON users;

DROP POLICY IF EXISTS "Admins can view all profiles" ON users;

DROP POLICY IF EXISTS "Sales can view all profiles" ON users;

DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;

DROP POLICY IF EXISTS "Users update own profile" ON users;

DROP POLICY IF EXISTS "Admin update users" ON users;

-- Step 2: Create ONE simple permissive SELECT policy
CREATE POLICY "authenticated_users_read_all" ON users FOR
SELECT TO authenticated USING (true);
-- Allow ALL authenticated users to read ANY user

-- Step 3: Create ONE simple UPDATE policy for own profile
CREATE POLICY "users_update_own_profile" ON users FOR
UPDATE TO authenticated USING (auth.uid () = id)
WITH
    CHECK (auth.uid () = id);

-- Step 4: Create ONE admin UPDATE policy
CREATE POLICY "admins_update_any_user" ON users FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM users
        WHERE
            users.id = auth.uid ()
            AND users.role = 'Admin'
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM users
            WHERE
                users.id = auth.uid ()
                AND users.role = 'Admin'
        )
    );

-- Step 5: Verify new policies
SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies
WHERE
    tablename = 'users'
ORDER BY cmd, policyname;

-- Step 6: Test if you can read users
SELECT id, name, email, role FROM users LIMIT 3;

-- Step 7: Test current auth session
SELECT
    auth.uid () as current_user_id,
    (
        SELECT email
        FROM auth.users
        WHERE
            id = auth.uid ()
    ) as current_email;