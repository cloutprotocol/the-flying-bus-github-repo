-- Add missing review-related columns to articles table
ALTER TABLE articles 
ADD COLUMN submitted_for_review_at TIMESTAMPTZ,
ADD COLUMN reviewed_by UUID REFERENCES profiles(id),
ADD COLUMN review_notes TEXT;

-- Add index for performance on review queries
CREATE INDEX idx_articles_submitted_for_review_at ON articles(submitted_for_review_at);
CREATE INDEX idx_articles_reviewed_by ON articles(reviewed_by);

-- Update the status check constraint to include the new review statuses
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles ADD CONSTRAINT articles_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'published'::text]));

-- Add comment for documentation
COMMENT ON COLUMN articles.submitted_for_review_at IS 'Timestamp when article was submitted for review';
COMMENT ON COLUMN articles.reviewed_by IS 'ID of the user who reviewed the article';
COMMENT ON COLUMN articles.review_notes IS 'Notes from the reviewer about the article';
