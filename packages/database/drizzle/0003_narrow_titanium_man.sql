CREATE TABLE "job_leases" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"owner" varchar(128) NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
