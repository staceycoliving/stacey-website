-- Add daily retry tracking to RentPayment
ALTER TABLE "RentPayment" ADD COLUMN "lastRetryAt" TIMESTAMP(3);

-- Add post-stay feedback tracking to Tenant
ALTER TABLE "Tenant" ADD COLUMN "postStayFeedbackSentAt" TIMESTAMP(3);
