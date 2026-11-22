-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "tg_id" BIGINT NOT NULL,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "language_code" TEXT,
    "spelled_name" TEXT,
    "gender" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" SERIAL NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "tg_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "is_forum" BOOLEAN NOT NULL DEFAULT false,
    "is_direct_messages" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message_tg_id" INTEGER NOT NULL,
    "thread_tg_id" INTEGER,
    "reply_to_id" INTEGER,
    "sent_at" INTEGER,
    "text" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "file_tg_uid" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "file_name" TEXT,
    "duration" INTEGER,
    "performer" TEXT,
    "ai_description" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments_to_messages" (
    "message_id" INTEGER NOT NULL,
    "attachment_id" INTEGER NOT NULL,
    "file_tg_id" TEXT NOT NULL,
    "caption" TEXT,
    "media_group_id" TEXT,

    CONSTRAINT "attachments_to_messages_pkey" PRIMARY KEY ("message_id","attachment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_tg_id_key" ON "users"("tg_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_messages_ids_unique" ON "messages"("chat_id", "message_tg_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_file_tg_uid_key" ON "attachments"("file_tg_uid");

-- AddForeignKey
ALTER TABLE "attachments_to_messages" ADD CONSTRAINT "attachments_to_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments_to_messages" ADD CONSTRAINT "attachments_to_messages_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
