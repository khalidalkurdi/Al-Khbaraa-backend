-- CreateTable
CREATE TABLE `monthly_dues` (
    `id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `is_arrested` BOOLEAN NOT NULL DEFAULT false,
    `user_id` CHAR(36) NOT NULL,
    `year` INT NOT NULL,
    `month` INT NOT NULL,
    `arrested_date` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `unique_user_monthly_due`(`user_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `monthly_dues` ADD CONSTRAINT `monthly_dues_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
