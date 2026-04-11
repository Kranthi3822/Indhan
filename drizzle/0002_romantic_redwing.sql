ALTER TABLE `bank_transactions` MODIFY COLUMN `transactionDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_payments` MODIFY COLUMN `paymentDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_reports` MODIFY COLUMN `reportDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `expenseDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `category` enum('fuel','lubricant','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `orderDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `deliveryDate` varchar(10);--> statement-breakpoint
ALTER TABLE `sales_transactions` MODIFY COLUMN `transactionDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `weigh_bridge` MODIFY COLUMN `ticketDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `outstandingBalance` decimal(15,2) DEFAULT '0.00';