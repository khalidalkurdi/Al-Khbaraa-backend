-- AlterTable
ALTER TABLE `payments` ADD COLUMN `is_collected` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `collected_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);
