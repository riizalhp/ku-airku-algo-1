-- =====================================================
-- FIX: Route Deletion Issues & Prevent False Logout
-- =====================================================
-- Problem: Deleting routes causes false logout events
-- Root Cause: RLS policies blocking delete or cascade issues
-- Solution: Fix RLS and ensure proper cascade deletion
-- =====================================================

-- Step 1: Check current RLS policies on route_plans
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename IN ('route_plans', 'route_stops')
ORDER BY tablename, policyname;

-- Step 2: Drop existing restrictive delete policies if they exist
DROP POLICY IF EXISTS "Users can only delete their own routes" ON route_plans;
DROP POLICY IF EXISTS "Only assigned driver can delete" ON route_plans;
DROP POLICY IF EXISTS "route_stops_delete_policy" ON route_stops;

-- Step 3: Create permissive delete policy for admins
CREATE POLICY "Admins can delete any route"
ON route_plans
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Step 4: Create permissive delete policy for route_stops
CREATE POLICY "Admins can delete any route stop"
ON route_stops
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Step 5: Ensure route_stops has proper cascade delete
-- First check if FK exists
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name,
    confdeltype AS on_delete_action
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE contype = 'f'
AND conrelid::regclass::text = 'route_stops'
AND confrelid::regclass::text = 'route_plans';

-- Step 6: Drop and recreate FK with CASCADE if needed
-- (Only run if the above query shows on_delete_action is not 'c' for CASCADE)
ALTER TABLE route_stops 
DROP CONSTRAINT IF EXISTS route_stops_route_plan_id_fkey;

ALTER TABLE route_stops
ADD CONSTRAINT route_stops_route_plan_id_fkey 
FOREIGN KEY (route_plan_id) 
REFERENCES route_plans(id) 
ON DELETE CASCADE;

-- Step 7: Create permissive update policy for orders (to set back to Pending)
DROP POLICY IF EXISTS "Admins can update any order" ON orders;

CREATE POLICY "Admins can update any order"
ON orders
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Admin'
    )
);

-- Step 8: Grant necessary permissions to authenticated users
GRANT DELETE ON route_plans TO authenticated;
GRANT DELETE ON route_stops TO authenticated;
GRANT UPDATE ON orders TO authenticated;

-- Step 9: Verify policies are active
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename IN ('route_plans', 'route_stops', 'orders')
GROUP BY tablename;

-- =====================================================
-- TESTING QUERIES (Run these to verify fixes work)
-- =====================================================

-- Test 1: Check if you can delete a route_stop
-- SELECT * FROM route_stops LIMIT 1;
-- DELETE FROM route_stops WHERE id = '<test_id>' RETURNING *;

-- Test 2: Check if you can delete a route_plan
-- SELECT * FROM route_plans WHERE assignment_status = 'unassigned' LIMIT 1;
-- DELETE FROM route_plans WHERE id = '<test_id>' RETURNING *;

-- Test 3: Check if orders update to Pending
-- SELECT id, status FROM orders WHERE status = 'Routed' LIMIT 1;
-- UPDATE orders SET status = 'Pending', assigned_vehicle_id = NULL WHERE id = '<test_id>' RETURNING *;

-- =====================================================
-- ROLLBACK (if something goes wrong)
-- =====================================================
-- Run this section if you need to rollback changes:
/*
DROP POLICY IF EXISTS "Admins can delete any route" ON route_plans;
DROP POLICY IF EXISTS "Admins can delete any route stop" ON route_stops;
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
*/
