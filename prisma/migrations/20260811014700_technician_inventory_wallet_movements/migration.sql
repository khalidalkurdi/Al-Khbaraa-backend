-- RenameTable
ALTER TABLE `technician_daily_inventory` RENAME TO `technician_inventory`;

-- AddColumn
ALTER TABLE `technician_inventory` ADD COLUMN `wallet_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE `technician_inventory_items` (
    `id` CHAR(36) NOT NULL,
    `technician_inventory_id` CHAR(36) NOT NULL,
    `spare_part_id` CHAR(36) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_technician_inventory_id`(`technician_inventory_id`),
    INDEX `idx_spare_part_id`(`spare_part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_movements` (
    `id` CHAR(36) NOT NULL,
    `technician_inventory_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `responsible_id` CHAR(36) NOT NULL,
    `type` ENUM('addition', 'deduction') NOT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_technician_inventory_id`(`technician_inventory_id`),
    INDEX `idx_responsible_id`(`responsible_id`),
    INDEX `idx_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `technician_inventory_items` ADD CONSTRAINT `technician_inventory_items_technician_inventory_id_fkey` FOREIGN KEY (`technician_inventory_id`) REFERENCES `technician_inventory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_inventory_items` ADD CONSTRAINT `technician_inventory_items_spare_part_id_fkey` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_movements` ADD CONSTRAINT `wallet_movements_technician_inventory_id_fkey` FOREIGN KEY (`technician_inventory_id`) REFERENCES `technician_inventory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_movements` ADD CONSTRAINT `wallet_movements_responsible_id_fkey` FOREIGN KEY (`responsible_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
