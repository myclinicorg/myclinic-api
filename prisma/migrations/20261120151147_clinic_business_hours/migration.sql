-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "closing_time" TEXT,
ADD COLUMN     "opening_time" TEXT,
ADD COLUMN     "working_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
