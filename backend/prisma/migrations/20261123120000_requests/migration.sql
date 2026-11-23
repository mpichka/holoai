-- Queue of triggered messages waiting to be processed by background workers.

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    "updated_at" INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    "message_id" INTEGER NOT NULL,
    "trigger_reason" TEXT NOT NULL,
    "trigger_command" TEXT,
    "trigger_args" TEXT,
    "status" "request_status" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "started_at" INTEGER,
    "finished_at" INTEGER,
    "response_id" INTEGER,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_requests_status_created_at" ON "requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_requests_message_id" ON "requests"("message_id");

-- CreateIndex
CREATE INDEX "idx_requests_response_id" ON "requests"("response_id");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep "updated_at" current (function defined in 20261122140000_updated_at_triggers)
CREATE TRIGGER "update_requests_updated_at" BEFORE UPDATE ON "requests"
    FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
