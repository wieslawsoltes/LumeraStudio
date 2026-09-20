CREATE TABLE `invites` (
	`token` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`last_seen` integer DEFAULT 0 NOT NULL,
	`selection` text,
	PRIMARY KEY(`project_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `members_user` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`scene` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`scene` text NOT NULL,
	`author` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `versions_project` ON `versions` (`project_id`,`created_at`);