-- Append-only tables: rows are added, never changed or removed (04 "Nguyen tac du lieu", CORE-40).
-- The function is reusable: attach it to the stock and cash ledgers when they are created.
CREATE FUNCTION "fnb_forbid_change"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "fnb_forbid_change"();
