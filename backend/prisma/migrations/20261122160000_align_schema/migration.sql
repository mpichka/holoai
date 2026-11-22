-- Unix-second defaults for "created_at"/"updated_at" (SQLite used strftime('%s', 'now')).
ALTER TABLE "users"
    ALTER COLUMN "created_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    ALTER COLUMN "updated_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer);

ALTER TABLE "chats"
    ALTER COLUMN "created_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    ALTER COLUMN "updated_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer);

ALTER TABLE "messages"
    ALTER COLUMN "created_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    ALTER COLUMN "updated_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer);

ALTER TABLE "attachments"
    ALTER COLUMN "created_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer),
    ALTER COLUMN "updated_at" SET DEFAULT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer);

-- Chats are upserted by Telegram id, which requires a unique constraint.
CREATE UNIQUE INDEX "chats_tg_id_key" ON "chats"("tg_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
