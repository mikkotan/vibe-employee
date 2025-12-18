-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "skipWeekends" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ExcludedDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcludedDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExcludedDate_userId_date_idx" ON "ExcludedDate"("userId", "date");

-- AddForeignKey
ALTER TABLE "ExcludedDate" ADD CONSTRAINT "ExcludedDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
