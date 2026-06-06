CREATE TABLE `doctor_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`degrees` text,
	`speciality` text,
	`phone` text,
	`email` text,
	`address` text,
	`chamber` text,
	`logo_path` text,
	`signature_path` text
);
--> statement-breakpoint
CREATE TABLE `paper_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`width_mm` real DEFAULT 210 NOT NULL,
	`height_mm` real DEFAULT 297 NOT NULL,
	`margin_top` real DEFAULT 10 NOT NULL,
	`margin_bottom` real DEFAULT 10 NOT NULL,
	`margin_left` real DEFAULT 10 NOT NULL,
	`margin_right` real DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_code` text NOT NULL,
	`name` text NOT NULL,
	`age` text,
	`gender` text,
	`phone` text,
	`address` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patients_patient_code_unique` ON `patients` (`patient_code`);--> statement-breakpoint
CREATE TABLE `prescription_medicines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prescription_id` integer NOT NULL,
	`medicine_name` text NOT NULL,
	`dosage` text,
	`frequency` text,
	`duration` text,
	`notes` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prescription_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prescription_id` integer NOT NULL,
	`section_type` text NOT NULL,
	`content` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`template_id` integer,
	`visit_no` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`content` text
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`paper_size` text DEFAULT 'A4' NOT NULL,
	`layout_json` text
);
