-- Keep "updated_at" (Unix seconds) current on every update, unless the statement sets it explicitly.
-- Mirrors the "update_<table>_updated_at" triggers from the original SQLite schema.
CREATE OR REPLACE FUNCTION "set_updated_at"() RETURNS TRIGGER AS $$
BEGIN
    IF NEW."updated_at" = OLD."updated_at" THEN
        NEW."updated_at" := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::integer;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "update_chats_updated_at" BEFORE UPDATE ON "chats"
    FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "messages"
    FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "update_attachments_updated_at" BEFORE UPDATE ON "attachments"
    FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
