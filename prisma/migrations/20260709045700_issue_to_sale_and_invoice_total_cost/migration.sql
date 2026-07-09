-- AlterTable: Convert movement_type to VARCHAR to allow renaming enum value safely
ALTER TABLE `inventory_movements` MODIFY `movement_type` VARCHAR(50) NOT NULL;

-- AlterTable: Migrate existing 'issue' values to 'sale'
UPDATE `inventory_movements` SET `movement_type` = 'sale' WHERE `movement_type` = 'issue';

-- AlterTable: Set movement_type back to ENUM with new value
ALTER TABLE `inventory_movements` MODIFY `movement_type` ENUM('supply', 'sale', 'adjust', 'return') NOT NULL;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `total_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.0;
