CREATE TABLE "DeliveryJob" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "campaignId" INTEGER NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" DATETIME,
  "completedAt" DATETIME,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "DeliveryJob_status_availableAt_idx" ON "DeliveryJob"("status", "availableAt");
CREATE INDEX "DeliveryJob_campaignId_idx" ON "DeliveryJob"("campaignId");
