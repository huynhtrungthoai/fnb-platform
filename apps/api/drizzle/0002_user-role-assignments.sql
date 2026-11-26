CREATE TABLE "user_role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"user_id" uuid NOT NULL,
	"branch_id" uuid,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_role_assignments_user_branch_unique" UNIQUE NULLS NOT DISTINCT("user_id","branch_id")
);
--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_branch_idx" ON "user_role_assignments" USING btree ("branch_id");