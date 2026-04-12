CREATE TABLE `daily_fuel_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`price_date` varchar(10) NOT NULL,
	`fuel_type` enum('petrol','diesel') NOT NULL,
	`retail_price` decimal(10,2) NOT NULL,
	`cost_price` decimal(10,2),
	`source` enum('manual','receipt_scan') NOT NULL DEFAULT 'manual',
	`notes` text,
	`recorded_by` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_fuel_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scanned_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`image_url` text NOT NULL,
	`status` enum('pending','extracted','confirmed','failed') NOT NULL DEFAULT 'pending',
	`supplier_name` varchar(200),
	`invoice_number` varchar(100),
	`invoice_date` varchar(10),
	`fuel_type` enum('petrol','diesel','lubricant'),
	`quantity_litres` decimal(12,3),
	`unit_price` decimal(10,4),
	`total_amount` decimal(14,2),
	`tax_amount` decimal(12,2),
	`raw_extracted_json` text,
	`confidence_score` decimal(4,2),
	`purchase_order_id` int,
	`confirmed_by` varchar(100),
	`confirmedAt` timestamp,
	`uploaded_by` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scanned_receipts_id` PRIMARY KEY(`id`)
);
