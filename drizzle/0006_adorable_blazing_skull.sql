CREATE TABLE `dip_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reading_date` varchar(10) NOT NULL,
	`fuel_type` enum('petrol','diesel') NOT NULL,
	`tank_id` varchar(20) NOT NULL DEFAULT 'T1',
	`dip_litres` decimal(12,3) NOT NULL,
	`reading_time` varchar(8) DEFAULT '08:00',
	`recorded_by` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dip_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fuel_type` enum('petrol','diesel','lubricant') NOT NULL,
	`retail_price` decimal(10,2) NOT NULL,
	`latest_cost_price` decimal(10,2) NOT NULL,
	`evaporation_rate_pct` decimal(6,4) DEFAULT '0.1000',
	`tank_capacity_litres` decimal(10,2) DEFAULT '20000.00',
	`updated_by` varchar(100),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `fuel_config_fuel_type_unique` UNIQUE(`fuel_type`)
);
