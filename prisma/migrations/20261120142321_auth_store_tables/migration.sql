/*
  Warnings:

  - Changed the type of `purpose` on the `email_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "email_tokens" DROP CONSTRAINT "email_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- AlterTable
ALTER TABLE "email_tokens" DROP COLUMN "purpose",
ADD COLUMN     "purpose" TEXT NOT NULL;

-- DropEnum
DROP TYPE "EmailTokenPurpose";

-- CreateIndex
CREATE INDEX "email_tokens_user_id_purpose_idx" ON "email_tokens"("user_id", "purpose");
