-- AlterTable
ALTER TABLE payroll_records
    ADD COLUMN month INT NULL,
    ADD COLUMN year INT NULL,
    ADD INDEX idx_month(month),
    ADD INDEX idx_year(year);
