CREATE TABLE "notes" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"color" text DEFAULT 'yellow' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notes_user_id_idx" ON "notes" ("user_id");--> statement-breakpoint
CREATE INDEX "todos_user_id_idx" ON "todos" ("user_id");