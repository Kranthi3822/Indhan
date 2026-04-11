CREATE TABLE `bank_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionDate` date NOT NULL,
	`description` text NOT NULL,
	`transactionType` enum('NEFT','RTGS','IMPS','Cash','Credit Card','UPI') NOT NULL,
	`withdrawal` decimal(15,2) DEFAULT '0.00',
	`deposit` decimal(15,2) DEFAULT '0.00',
	`balance` decimal(15,2),
	`reconciliationStatus` enum('matched','unmatched','pending') DEFAULT 'pending',
	`referenceNo` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bank_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentDate` date NOT NULL,
	`customerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`paymentMethod` enum('cash','bank','online') NOT NULL,
	`referenceNo` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255),
	`phone` varchar(20),
	`email` varchar(320),
	`creditLimit` decimal(15,2) DEFAULT '0.00',
	`paymentTermsDays` int DEFAULT 30,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportDate` date NOT NULL,
	`openingStockPetrol` decimal(15,3) DEFAULT '0.000',
	`openingStockDiesel` decimal(15,3) DEFAULT '0.000',
	`closingStockPetrol` decimal(15,3) DEFAULT '0.000',
	`closingStockDiesel` decimal(15,3) DEFAULT '0.000',
	`petrolSalesQty` decimal(15,3) DEFAULT '0.000',
	`dieselSalesQty` decimal(15,3) DEFAULT '0.000',
	`totalSalesValue` decimal(15,2) DEFAULT '0.00',
	`cashCollected` decimal(15,2) DEFAULT '0.00',
	`cardCollected` decimal(15,2) DEFAULT '0.00',
	`onlineCollected` decimal(15,2) DEFAULT '0.00',
	`creditSales` decimal(15,2) DEFAULT '0.00',
	`totalCollected` decimal(15,2) DEFAULT '0.00',
	`totalExpenses` decimal(15,2) DEFAULT '0.00',
	`bankDeposit` decimal(15,2) DEFAULT '0.00',
	`cashBalance` decimal(15,2) DEFAULT '0.00',
	`grossProfit` decimal(15,2) DEFAULT '0.00',
	`netProfit` decimal(15,2) DEFAULT '0.00',
	`reconciliationStatus` enum('pending','reconciled','discrepancy') DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_reports_reportDate_unique` UNIQUE(`reportDate`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseDate` date NOT NULL,
	`headAccount` enum('Operating Activities','Financing Activities','Investing Activities','Acquisition','Establishment','REPO') NOT NULL,
	`subHeadAccount` enum('Wages','Admin','Electricity','Hospitality','Maintenance','Performance Bonus','Fuel','Transport','POS Charges','Bank Charges','Purchase','Interest','Principal','Charges') NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`transactionStatus` enum('Paid','Payable','DuePayable','DuePaid') DEFAULT 'Paid',
	`modeOfPayment` enum('Bank','Cash','Fuel','Online') DEFAULT 'Bank',
	`paidBy` varchar(100),
	`approvedBy` varchar(100),
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'approved',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('fuel','lubricant') NOT NULL,
	`unit` varchar(20) NOT NULL DEFAULT 'liter',
	`currentStock` decimal(15,3) DEFAULT '0.000',
	`reorderLevel` decimal(15,3) DEFAULT '0.000',
	`purchasePrice` decimal(10,2) DEFAULT '0.00',
	`sellingPrice` decimal(10,2) DEFAULT '0.00',
	`margin` decimal(10,2) DEFAULT '0.00',
	`supplier` varchar(255) DEFAULT 'Indian Oil Corporation',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderDate` date NOT NULL,
	`deliveryDate` date,
	`supplier` varchar(255) DEFAULT 'Indian Oil Corporation',
	`productId` int NOT NULL,
	`quantityOrdered` decimal(15,3) NOT NULL,
	`quantityReceived` decimal(15,3) DEFAULT '0.000',
	`unitPrice` decimal(10,2) NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`status` enum('pending','delivered','partial','cancelled') DEFAULT 'pending',
	`invoiceNo` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionDate` date NOT NULL,
	`customerId` int,
	`productId` int NOT NULL,
	`quantity` decimal(15,3) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`paymentMethod` enum('cash','credit_card','online','credit','fuel') NOT NULL,
	`paymentStatus` enum('paid','payable','due_payable','due_paid','received') DEFAULT 'paid',
	`pumpNo` varchar(10),
	`paidBy` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weigh_bridge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketDate` date NOT NULL,
	`ticketNo` int,
	`vehicleNo` varchar(20),
	`noOfVehicles` int DEFAULT 1,
	`weight` decimal(10,2),
	`amount` decimal(10,2),
	`cumulativeAmount` decimal(15,2),
	`remarks` text,
	`bankDeposit` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weigh_bridge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('owner','incharge','accountant','user','admin') NOT NULL DEFAULT 'user';