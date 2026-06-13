/*
  Warnings:
  - You are about to drop the `roles_users` table. If the table is not empty, existing user-role links will be lost.
*/

ALTER TABLE `roles_users` DROP FOREIGN KEY `roles_users_user_id_fkey`;
ALTER TABLE `roles_users` DROP FOREIGN KEY `roles_users_role_id_fkey`;

ALTER TABLE `users` ADD COLUMN `role_id` CHAR(36) NULL;

UPDATE `users` u
JOIN (
  SELECT ru.user_id, ru.role_id
  FROM `roles_users` ru
  JOIN (
    SELECT user_id, MIN(role_id) AS role_id
    FROM `roles_users`
    GROUP BY user_id
  ) first_user_role
    ON first_user_role.user_id = ru.user_id
   AND first_user_role.role_id = ru.role_id
) selected_user_role
  ON selected_user_role.user_id = u.id
SET u.role_id = selected_user_role.role_id
WHERE u.role_id IS NULL;

UPDATE `users` u
SET u.role_id = (
  SELECT id
  FROM `roles`
  ORDER BY created_at
  LIMIT 1
)
WHERE u.role_id IS NULL;

ALTER TABLE `users` MODIFY `role_id` CHAR(36) NOT NULL;
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX `idx_role_id` ON `users`(`role_id`);

DROP TABLE `roles_users`;
