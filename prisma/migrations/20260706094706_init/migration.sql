-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `user_number` VARCHAR(50) NOT NULL,
    `profile_image_path` VARCHAR(500) NULL,
    `document_image_path` VARCHAR(500) NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `job_title` VARCHAR(255) NULL,
    `role_id` CHAR(36) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `token_device` TEXT NOT NULL,
    `last_login_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `users_user_number_key`(`user_number`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_user_number`(`user_number`),
    INDEX `idx_email`(`email`),
    INDEX `idx_role_id`(`role_id`),
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
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token` TEXT NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `isblocked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_expires_at`(`expires_at`),
    INDEX `idx_isblocked_at`(`isblocked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technician_daily_inventory` (
    `id` CHAR(36) NOT NULL,
    `technician_id` CHAR(36) NOT NULL,
    `notes` TEXT NULL,
    `tools_given` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_technician_id`(`technician_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `center_settings` (
    `id` CHAR(36) NOT NULL,
    `center_name` VARCHAR(255) NOT NULL,
    `secondary_name` VARCHAR(255) NULL,
    `address` TEXT NOT NULL,
    `phone1` VARCHAR(50) NOT NULL,
    `phone2` VARCHAR(50) NULL,
    `email` VARCHAR(255) NOT NULL,
    `term1` TEXT NULL,
    `term2` TEXT NULL,
    `term3` TEXT NULL,
    `term4` TEXT NULL,
    `logo_path` VARCHAR(500) NULL,
    `dollar_exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 140,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_center_name`(`center_name`),
    INDEX `idx_phone1`(`phone1`),
    INDEX `idx_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` CHAR(36) NOT NULL,
    `customer_number` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `firstphone` VARCHAR(50) NOT NULL,
    `secondphone` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `location_link` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `customers_customer_number_key`(`customer_number`),
    UNIQUE INDEX `customers_firstphone_key`(`firstphone`),
    UNIQUE INDEX `customers_secondphone_key`(`secondphone`),
    INDEX `idx_customer_number`(`customer_number`),
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
    `scheduled_date` DATE NULL,
    `is_repeated` BOOLEAN NOT NULL DEFAULT false,
    `has_invoice` BOOLEAN NOT NULL DEFAULT false,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
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
    INDEX `idx_is_active`(`is_active`),
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
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_changed_at`(`changed_at`),
    INDEX `idx_is_active`(`is_active`),
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
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_voice_records` (
    `id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `full_file_path` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `duration` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_request_id`(`request_id`),
    INDEX `idx_request_voice_record_created_at`(`created_at`),
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
    `spare_part_number` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `shelf_location` VARCHAR(100) NULL,
    `sku` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `cost_syp` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cost_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `spare_parts_spare_part_number_key`(`spare_part_number`),
    UNIQUE INDEX `spare_parts_shelf_location_key`(`shelf_location`),
    UNIQUE INDEX `spare_parts_sku_key`(`sku`),
    INDEX `idx_spare_part_number`(`spare_part_number`),
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
    `type` ENUM('internal', 'external') NOT NULL DEFAULT 'external',
    `status` ENUM('paid', 'paid_partial', 'refunded') NOT NULL DEFAULT 'paid_partial',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `net_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_currency` ENUM('SYP', 'USD') NOT NULL DEFAULT 'SYP',
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
    INDEX `idx_status`(`status`),
    INDEX `idx_type`(`type`),
    INDEX `idx_is_active`(`is_active`),
    UNIQUE INDEX `unique_request_id`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `spare_part_id` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `currency` ENUM('SYP', 'USD') NOT NULL DEFAULT 'SYP',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `total_price` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_invoice_id`(`invoice_id`),
    INDEX `idx_spare_part_id`(`spare_part_id`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` ENUM('SYP', 'USD') NOT NULL DEFAULT 'SYP',
    `paymentMethod` ENUM('cash', 'sham_cash') NOT NULL DEFAULT 'cash',
    `dollar_exchange_rate` DECIMAL(12, 4) NOT NULL,
    `converted_amount` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `paid_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_invoice_id`(`invoice_id`),
    INDEX `idx_paid_at`(`paid_at`),
    INDEX `idx_currency`(`currency`),
    INDEX `idx_payment_method`(`paymentMethod`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` CHAR(36) NOT NULL,
    `movement_no` VARCHAR(50) NOT NULL,
    `part_id` CHAR(36) NOT NULL,
    `movement_type` ENUM('supply', 'issue', 'adjust', 'return') NOT NULL,
    `responsible_id` CHAR(36) NOT NULL,
    `reference` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `movement_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `inventory_movements_movement_no_key`(`movement_no`),
    INDEX `idx_movement_no`(`movement_no`),
    INDEX `idx_part`(`part_id`),
    INDEX `idx_movement_date`(`movement_date`),
    INDEX `idx_movement_type`(`movement_type`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('fixed', 'variable') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `month` INTEGER NULL,
    `year` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_type`(`type`),
    INDEX `idx_month_year`(`month`, `year`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `type` ENUM('salary', 'bonus', 'deduction', 'overtime', 'commission') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `month` INTEGER NULL,
    `year` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_is_active`(`is_active`),
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
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `request_voice_records` ADD CONSTRAINT `request_voice_records_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `technician_assignments` ADD CONSTRAINT `technician_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_spare_part_id_fkey` FOREIGN KEY (`spare_part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `spare_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_responsible_id_fkey` FOREIGN KEY (`responsible_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
