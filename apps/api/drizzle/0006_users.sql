CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"avatar_media_id" uuid,
	"credential_type" text DEFAULT 'pin' NOT NULL,
	"pin_hash" text,
	"password_hash" text,
	"must_change_pin" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
-- Assignments made before accounts existed (M1-11 tests, dev databases) point at no user.
DELETE FROM "user_role_assignments" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;