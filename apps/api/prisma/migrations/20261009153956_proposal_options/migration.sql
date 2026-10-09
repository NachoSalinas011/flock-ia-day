/*
  Warnings:

  - You are about to drop the column `contingencyPct` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `isFormal` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `pmOverheadPct` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `proposalId` on the `TeamMember` table. All the data in the column will be lost.
  - Added the required column `optionId` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('MVP', 'BALANCED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('MUST', 'SHOULD', 'COULD');

-- CreateEnum
CREATE TYPE "ScopeVariant" AS ENUM ('FULL', 'REDUCED');

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_proposalId_fkey";

-- DropIndex
DROP INDEX "Proposal_notebookId_isFormal_idx";

-- DropIndex
DROP INDEX "TeamMember_proposalId_idx";

-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "contingencyPct",
DROP COLUMN "isFormal",
DROP COLUMN "pmOverheadPct",
ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "targetSource" TEXT;

-- AlterTable
ALTER TABLE "ProposalModule" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MUST',
ADD COLUMN     "reducedDescription" TEXT,
ADD COLUMN     "reducedHours" JSONB;

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "proposalId",
ADD COLUMN     "optionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProposalOption" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "isFormal" BOOLEAN NOT NULL DEFAULT false,
    "pmOverheadPct" INTEGER NOT NULL DEFAULT 15,
    "contingencyPct" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "ProposalOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalOptionModule" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "variant" "ScopeVariant" NOT NULL DEFAULT 'FULL',

    CONSTRAINT "ProposalOptionModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalOption_isFormal_idx" ON "ProposalOption"("isFormal");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalOption_proposalId_tier_key" ON "ProposalOption"("proposalId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalOptionModule_optionId_moduleId_key" ON "ProposalOptionModule"("optionId", "moduleId");

-- CreateIndex
CREATE INDEX "TeamMember_optionId_idx" ON "TeamMember"("optionId");

-- AddForeignKey
ALTER TABLE "ProposalOption" ADD CONSTRAINT "ProposalOption_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalOptionModule" ADD CONSTRAINT "ProposalOptionModule_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProposalOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalOptionModule" ADD CONSTRAINT "ProposalOptionModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProposalModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProposalOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
