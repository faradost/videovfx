-- Database schema for the freelance platform

CREATE DATABASE IF NOT EXISTS freelance_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE freelance_platform;

-- Users table: Stores information about both clients and freelancers
CREATE TABLE IF NOT EXISTS `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `user_type` ENUM('client', 'freelancer') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles table: Stores additional details for user profiles
CREATE TABLE IF NOT EXISTS `profiles` (
    `profile_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `full_name` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `skills` TEXT NULL, -- Could be a comma-separated list or JSON
    `portfolio_links` TEXT NULL, -- Could be a comma-separated list or JSON
    `avatar_url` VARCHAR(255) NULL,
    `country` VARCHAR(100) NULL,
    `average_rating` DECIMAL(3, 2) DEFAULT 0.00,
    `completed_projects` INT DEFAULT 0,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table: Stores information about projects posted by clients
CREATE TABLE IF NOT EXISTS `projects` (
    `project_id` INT AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `budget` DECIMAL(10, 2) NULL, -- Can be a range or fixed amount
    `status` ENUM('open', 'in_progress', 'completed', 'cancelled', 'expired') DEFAULT 'open' NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deadline` DATE NULL,
    `tags` VARCHAR(255) NULL -- Comma-separated tags for skills/categories
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bids table: Stores bids made by freelancers on projects
CREATE TABLE IF NOT EXISTS `bids` (
    `bid_id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL,
    `bid_amount` DECIMAL(10, 2) NOT NULL,
    `proposal_text` TEXT NOT NULL,
    `estimated_delivery_days` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending' NOT NULL,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`) ON DELETE CASCADE,
    FOREIGN KEY (`freelancer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project_assignments table: Links accepted bids to projects and freelancers (work contract)
CREATE TABLE IF NOT EXISTS `project_assignments` (
    `assignment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `freelancer_id` INT NOT NULL,
    `bid_id` INT NOT NULL, -- The accepted bid
    `agreed_price` DECIMAL(10, 2) NOT NULL,
    `start_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `end_date` TIMESTAMP NULL, -- Expected or actual completion date
    `status` ENUM('active', 'completed', 'terminated') DEFAULT 'active' NOT NULL,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`) ON DELETE CASCADE,
    FOREIGN KEY (`freelancer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`bid_id`) REFERENCES `bids`(`bid_id`) ON DELETE CASCADE,
    UNIQUE KEY `project_freelancer_unique` (`project_id`, `freelancer_id`) -- A freelancer can only be assigned once to a project
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table: Stores reviews given by clients to freelancers and vice-versa
CREATE TABLE IF NOT EXISTS `reviews` (
    `review_id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `reviewer_id` INT NOT NULL, -- User giving the review
    `reviewee_id` INT NOT NULL, -- User receiving the review
    `rating` TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    `comment` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`),
    FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`user_id`),
    UNIQUE KEY `review_once` (`project_id`, `reviewer_id`, `reviewee_id`) -- Ensure one review per project direction
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table: For communication between users (related to projects or general)
CREATE TABLE IF NOT EXISTS `messages` (
    `message_id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `project_id` INT NULL, -- Optional: if message is related to a specific project
    `message_text` TEXT NOT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_read` BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    `notification_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL, -- The user who receives the notification
    `message` VARCHAR(255) NOT NULL,
    `link` VARCHAR(255) NULL, -- Link to the relevant page (e.g., project, bid)
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Optional) Skills table for predefined skills, if not using free-text tags
-- CREATE TABLE IF NOT EXISTS `skills` (
-- `skill_id` INT AUTO_INCREMENT PRIMARY KEY,
-- `skill_name` VARCHAR(100) NOT NULL UNIQUE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Optional) Project_skills junction table (many-to-many relationship between projects and skills)
-- CREATE TABLE IF NOT EXISTS `project_skills` (
-- `project_id` INT NOT NULL,
-- `skill_id` INT NOT NULL,
-- PRIMARY KEY (`project_id`, `skill_id`),
-- FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`) ON DELETE CASCADE,
-- FOREIGN KEY (`skill_id`) REFERENCES `skills`(`skill_id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Optional) User_skills junction table (many-to-many relationship between users and skills)
-- CREATE TABLE IF NOT EXISTS `user_skills` (
-- `user_id` INT NOT NULL,
-- `skill_id` INT NOT NULL,
-- PRIMARY KEY (`user_id`, `skill_id`),
-- FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
-- FOREIGN KEY (`skill_id`) REFERENCES `skills`(`skill_id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for frequently queried columns for performance
ALTER TABLE `users` ADD INDEX `idx_user_email` (`email`);
ALTER TABLE `projects` ADD INDEX `idx_project_status` (`status`);
ALTER TABLE `projects` ADD INDEX `idx_project_client` (`client_id`);
ALTER TABLE `bids` ADD INDEX `idx_bid_project` (`project_id`);
ALTER TABLE `bids` ADD INDEX `idx_bid_freelancer` (`freelancer_id`);
ALTER TABLE `messages` ADD INDEX `idx_message_sender` (`sender_id`);
ALTER TABLE `messages` ADD INDEX `idx_message_receiver` (`receiver_id`);

-- Note: Foreign key constraints ON DELETE CASCADE are used for simplicity.
-- In a production system, you might want more nuanced handling (e.g., ON DELETE SET NULL or soft deletes).
-- The character set utf8mb4 and collation utf8mb4_unicode_ci are used for full Unicode support, including emojis.
-- Timestamps are used for created_at and updated_at fields for tracking changes.
-- ENUM types are used for fields with a fixed set of possible values.
-- Consider adding more specific indexes based on query patterns as the application develops.
-- For `skills` and `tags`, using a separate table and a junction table (like `project_skills`, `user_skills`) is more robust for searching and managing predefined skills than comma-separated strings, but adds complexity. For now, text fields are used.
-- `average_rating` and `completed_projects` in `profiles` table would ideally be updated by triggers or application logic when reviews are added or projects are completed.
-- `project_assignments` table includes a `UNIQUE KEY` to prevent a freelancer from being assigned to the same project multiple times.
-- `reviews` table includes a `UNIQUE KEY` to prevent a user from reviewing another user for the same project more than once in each direction (client->freelancer, freelancer->client).

-- Example of how to populate average_rating (can be done via triggers or cron jobs)
-- UPDATE profiles p SET average_rating = (SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_id = p.user_id) WHERE p.user_id = [specific_user_id];

-- Example of how to update completed_projects
-- UPDATE profiles p SET completed_projects = (SELECT COUNT(DISTINCT pa.project_id) FROM project_assignments pa WHERE pa.freelancer_id = p.user_id AND pa.status = 'completed') WHERE p.user_id = [specific_user_id];
