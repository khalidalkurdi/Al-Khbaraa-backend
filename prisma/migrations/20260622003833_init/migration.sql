/*
  Warnings:

  - You are about to drop the column `responsible_by` on the `inventory_movements` table. All the data in the column will be lost.
  - You are about to drop the column `technician_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(4))`.
  - You are about to alter the column `status` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(5))`.
  - You are about to drop the column `payment_method` on the `payments` table. All the data in the column will be lost.
  - Made the column `responsible_id` on table `inventory_movements` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_responsible_id_fkey`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_technician_id_fkey`;

-- DropIndex
DROP INDEX `inventory_movements_responsible_id_fkey` ON `inventory_movements`;

-- DropIndex
DROP INDEX `idx_technician_id` ON `invoices`;

-- DropIndex
DROP INDEX `idx_payment_method` ON `payments`;

-- AlterTable
ALTER TABLE `inventory_movements` DROP COLUMN `responsible_by`,
    MODIFY `responsible_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `invoices` DROP COLUMN `technician_id`,
    ADD COLUMN `net_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    MODIFY `type` ENUM('internal', 'external') NOT NULL DEFAULT 'external',
    MODIFY `status` ENUM('paid', 'paid_partial', 'refunded') NOT NULL DEFAULT 'paid_partial';

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `payment_method`,
    ADD COLUMN `paymentMethod` ENUM('cash', 'sham_cash') NOT NULL DEFAULT 'cash';

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM('salary', 'raise', 'deduction') NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_payment_method` ON `payments`(`paymentMethod`);

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_responsible_id_fkey` FOREIGN KEY (`responsible_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
