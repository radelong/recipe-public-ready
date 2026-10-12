CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `members` ADD `username` text;--> statement-breakpoint
ALTER TABLE `members` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `members` ADD `password_salt` text;--> statement-breakpoint
CREATE UNIQUE INDEX `members_username_unique` ON `members` (`username`);