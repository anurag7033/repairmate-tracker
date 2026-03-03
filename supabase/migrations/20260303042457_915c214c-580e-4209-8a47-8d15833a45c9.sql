
-- Fix the enum to match the frontend types
ALTER TYPE public.repair_status RENAME VALUE 'waiting_approval' TO 'waiting_for_parts';
