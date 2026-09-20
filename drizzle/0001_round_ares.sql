CREATE TABLE `roster` (
	`owner` text NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_roster_owner` ON `roster` (`owner`);