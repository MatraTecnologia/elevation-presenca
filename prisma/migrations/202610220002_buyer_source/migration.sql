ALTER TABLE "presenca"."Participant"
  ADD COLUMN "phoneOriginal" TEXT,
  ADD COLUMN "document" TEXT;

ALTER TABLE "presenca"."Registration"
  ADD COLUMN "sourceRegisteredAt" TIMESTAMP(3),
  ADD COLUMN "sourceCapturedAt" TIMESTAMP(3),
  ADD COLUMN "grossAmountCents" INTEGER,
  ADD COLUMN "netAmountRecordedCents" INTEGER,
  ADD COLUMN "coupon" TEXT;
