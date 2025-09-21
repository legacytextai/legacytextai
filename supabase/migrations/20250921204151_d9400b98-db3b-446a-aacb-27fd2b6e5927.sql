-- Add render_uid column to exports table for tracking unique renders
ALTER TABLE exports 
ADD COLUMN render_uid bigint;