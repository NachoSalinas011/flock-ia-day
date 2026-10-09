-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "NotebookStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXT', 'MARKDOWN', 'PDF', 'DOCX', 'VIDEO');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PM', 'UX', 'FRONTEND', 'BACKEND', 'QA');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JR', 'SSR', 'SR');

-- CreateEnum
CREATE TYPE "Dedication" AS ENUM ('FT', 'PT');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "industry" TEXT,
    "code" TEXT,
    "year" INTEGER,
    "status" "NotebookStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(384),

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isFormal" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "assumptions" TEXT[],
    "outOfScope" TEXT[],
    "risks" TEXT[],
    "openQuestions" TEXT[],
    "lessons" TEXT[],
    "pmOverheadPct" INTEGER NOT NULL DEFAULT 15,
    "contingencyPct" INTEGER NOT NULL DEFAULT 10,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalModule" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "complexity" "Level" NOT NULL,
    "confidence" "Level" NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" JSONB NOT NULL,
    "actualHours" JSONB,
    "analogies" JSONB NOT NULL DEFAULT '[]',
    "sourceChunkIds" TEXT[],
    "notes" TEXT,

    CONSTRAINT "ProposalModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "seniority" "Seniority" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "dedication" "Dedication" NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notebook_code_key" ON "Notebook"("code");

-- CreateIndex
CREATE INDEX "Notebook_status_idx" ON "Notebook"("status");

-- CreateIndex
CREATE INDEX "Source_notebookId_idx" ON "Source"("notebookId");

-- CreateIndex
CREATE INDEX "Chunk_notebookId_idx" ON "Chunk"("notebookId");

-- CreateIndex
CREATE INDEX "Chunk_sourceId_idx" ON "Chunk"("sourceId");

-- CreateIndex
CREATE INDEX "ChatMessage_notebookId_createdAt_idx" ON "ChatMessage"("notebookId", "createdAt");

-- CreateIndex
CREATE INDEX "Proposal_notebookId_isFormal_idx" ON "Proposal"("notebookId", "isFormal");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_notebookId_version_key" ON "Proposal"("notebookId", "version");

-- CreateIndex
CREATE INDEX "ProposalModule_proposalId_idx" ON "ProposalModule"("proposalId");

-- CreateIndex
CREATE INDEX "TeamMember_proposalId_idx" ON "TeamMember"("proposalId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalModule" ADD CONSTRAINT "ProposalModule_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
