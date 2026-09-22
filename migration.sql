-- Add DIAN electronic invoice fields to payments table
-- These store the response data from SaaS Vertical / Factus integration
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_number VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cufe VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_url VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pdf_url VARCHAR;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dian_status VARCHAR;
