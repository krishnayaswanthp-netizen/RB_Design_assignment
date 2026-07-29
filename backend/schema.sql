-- schema.sql
-- Run this in your Supabase SQL Editor to set up the database schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT,
    plan_tier TEXT DEFAULT 'free',
    usage_count INT DEFAULT 0,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Persistent Anti-Abuse Usage Tracker
CREATE TABLE IF NOT EXISTS usage_tracker (
    email_hash TEXT PRIMARY KEY,
    credits_used INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evaluations History Table
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_text TEXT,
    job_description TEXT,
    score INT,
    feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations" 
ON evaluations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations" 
ON evaluations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations" 
ON evaluations FOR DELETE 
USING (auth.uid() = user_id);