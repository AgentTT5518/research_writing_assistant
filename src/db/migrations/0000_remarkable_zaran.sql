CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`feature` text NOT NULL,
	`operation` text,
	`model` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`estimated_cost_usd` real,
	`duration_ms` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `draft_research_links` (
	`draft_id` text,
	`research_item_id` text,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_item_id`) REFERENCES `research_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `draft_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text,
	`version_number` integer NOT NULL,
	`linkedin_content` text,
	`blog_title` text,
	`blog_content` text,
	`blog_excerpt` text,
	`change_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`status` text DEFAULT 'draft',
	`linkedin_content` text,
	`blog_title` text,
	`blog_content` text,
	`blog_excerpt` text,
	`cover_image_path` text,
	`writing_mode` text,
	`anti_slop_score` real,
	`anti_slop_report` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_item_tags` (
	`research_item_id` text,
	`tag_id` text,
	FOREIGN KEY (`research_item_id`) REFERENCES `research_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `research_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`content` text,
	`summary` text,
	`authors` text,
	`published_date` text,
	`reliability_tier` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text,
	`platform` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`publish_attempts` integer DEFAULT 0,
	`last_attempt_at` integer,
	`published_url` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);