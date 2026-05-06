ALTER TABLE `nozzle_readings` ADD `photo_url` varchar(1000);--> statement-breakpoint
ALTER TABLE `nozzle_readings` ADD `photo_key` varchar(500);--> statement-breakpoint
ALTER TABLE `shift_sessions` ADD `incharge_approval_status` enum('pending_approval','approved','rejected');--> statement-breakpoint
ALTER TABLE `shift_sessions` ADD `approved_by_name` varchar(100);--> statement-breakpoint
ALTER TABLE `shift_sessions` ADD `approved_at` timestamp;--> statement-breakpoint
ALTER TABLE `shift_sessions` ADD `approval_remarks` text;