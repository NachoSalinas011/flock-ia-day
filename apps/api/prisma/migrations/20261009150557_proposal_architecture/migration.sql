-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "architecture" JSONB;

-- AlterTable
ALTER TABLE "ProposalModule" ADD COLUMN     "containerKey" TEXT,
ADD COLUMN     "dependsOn" TEXT[],
ADD COLUMN     "integrations" TEXT[];
