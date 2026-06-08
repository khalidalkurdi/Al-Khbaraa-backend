-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `job_title` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `token_device` TEXT NOT NULL,
    `last_login_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_email`(`email`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles_users` (
    `user_id` CHAR(36) NOT NULL,
    `role_id` CHAR(36) NOT NULL,
    `assigned_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_role_id`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token` TEXT NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `isblocked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_expires_at`(`expires_at`),
    INDEX `idx_revoked_at`(`isblocked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technician_daily_inventory` (
    `id` CHAR(36) NOT NULL,
    `technician_id` CHAR(36) NOT NULL,
    `inventory_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `tools_given` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_technician_id`(`technician_id`),
    INDEX `idx_inventory_date`(`inventory_date`),
    UNIQUE INDEX `unique_technician_date`(`technician_id`, `inventory_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `center_settings` (
    `id` CHAR(36) NOT NULL,
    `center_name` VARCHAR(255) NOT NULL,
    `secondary_name` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `phone1` VARCHAR(50) NOT NULL,
    `phone2` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `term1` TEXT NULL,
    `term2` TEXT NULL,
    `term3` TEXT NULL,
    `term4` TEXT NULL,
    `logo_path` VARCHAR(500) NULL,
    `tax_number` VARCHAR(100) NULL,
    `commercial_register` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_center_name`(`center_name`),
    INDEX `idx_phone1`(`phone1`),
    INDEX `idx_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rates` (
    `id` CHAR(36) NOT NULL,
    `dollar_exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `firstphone` VARCHAR(50) NOT NULL,
    `secondphone` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `location_link` TEXT NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `customers_firstphone_key`(`firstphone`),
    UNIQUE INDEX `customers_secondphone_key`(`secondphone`),
    INDEX `idx_firstphone`(`firstphone`),
    INDEX `idx_secondphone`(`secondphone`),
    INDEX `idx_name`(`name`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requests` (
    `id` CHAR(36) NOT NULL,
    `request_number` VARCHAR(50) NOT NULL,
    `type` ENUM('internal', 'external') NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'emergency') NOT NULL DEFAULT 'medium',
    `fault_description` TEXT NOT NULL,
    `notes` TEXT NULL,
    `scheduled_date` DATE NOT NULL,
    `scheduled_time` TIME(0) NULL,
    `is_repeated` BOOLEAN NOT NULL DEFAULT false,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('new', 'accepted', 'ontheway', 'arrived', 'underrepair', 'completed', 'incompleted', 'pulltocenter', 'postponed', 'cancelled', 'notanswer', 'notrepairable', 'repeated') NOT NULL DEFAULT 'new',
    `created_by` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `requests_request_number_key`(`request_number`),
    INDEX `idx_request_number`(`request_number`),
    INDEX `idx_customer_id`(`customer_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_type`(`type`),
    INDEX `idx_is_completed`(`is_completed`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_scheduled_date`(`scheduled_date`),
    INDEX `idx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_status_history` (
    `id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `status` ENUM('new', 'accepted', 'ontheway', 'arrived', 'underrepair', 'completed', 'incompleted', 'pulltocenter', 'postponed', 'cancelled', 'notanswer', 'notrepairable', 'repeated') NOT NULL,
    `changed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `changed_by` CHAR(36) NULL,

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_changed_at`(`changed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_devices` (
    `id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `device_type` VARCHAR(100) NOT NULL,
    `device_name` VARCHAR(255) NOT NULL,
    `brand` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_request_id`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technician_assignments` (
    `id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `technician_id` CHAR(36) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `assigned_by` CHAR(36) NOT NULL,
    `assigned_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_technician_id`(`technician_id`),
    UNIQUE INDEX `unique_request_technician`(`request_id`, `technician_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spare_parts` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `cost_syp` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cost_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `spare_parts_sku_key`(`sku`),
    INDEX `idx_sku`(`sku`),
    INDEX `idx_name`(`name`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` CHAR(36) NOT NULL,
    `invoice_number` VARCHAR(50) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `technician_id` CHAR(36) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'paid_partial',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_currency` VARCHAR(3) NOT NULL,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `remaining_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `warranty_period` VARCHAR(50) NULL,
    `needs_center_maintenance` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `idx_invoice_number`(`invoice_number`),
    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_technician_id`(`technician_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `spare_part_id` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `total_price` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,

    INDEX `idx_invoice_id`(`invoice_id`),
    INDEX `idx_spare_part_id`(`spare_part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `dollar_exchange_rate` DECIMAL(12, 4) NOT NULL,
    `converted_amount` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `paid_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_invoice_id`(`invoice_id`),
    INDEX `idx_paid_at`(`paid_at`),
    INDEX `idx_currency`(`currency`),
    INDEX `idx_payment_method`(`payment_method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `month` INTEGER NULL,
    `year` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_type`(`type`),
    INDEX `idx_month_year`(`month`, `year`),
    INDEX `idx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_is_read`(`is_read`),
    INDEX `idx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roles_users` ADD CONSTRAINT `roles_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_users` ADD CONSTRAINT `roles_users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_daily_inventory` ADD CONSTRAINT `technician_daily_inventory_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_devices` ADD CONSTRAINT `request_devices_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_spare_part_id_fkey` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
