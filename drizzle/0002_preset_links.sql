CREATE TABLE `preset_links` (
	`link_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_preset_id` integer NOT NULL,
	`target_kind` text NOT NULL,
	`target_preset_id` integer,
	`label` text NOT NULL,
	`dosage` text,
	`frequency` text,
	`duration` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_preset_id`) REFERENCES `presets`(`preset_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_preset_id`) REFERENCES `presets`(`preset_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `preset_links_owner_preset_id_idx` ON `preset_links` (`owner_preset_id`);
--> statement-breakpoint
CREATE INDEX `preset_links_target_preset_id_idx` ON `preset_links` (`target_preset_id`);
