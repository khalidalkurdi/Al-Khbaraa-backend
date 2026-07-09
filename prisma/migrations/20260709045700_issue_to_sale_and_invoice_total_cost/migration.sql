-- AlterTable
ALTER TABLE `inventory_movements` MODIFY `movement_type` ENUM('supply', 'sale', 'adjust', 'return') NOT NULL;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `total_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.0;
