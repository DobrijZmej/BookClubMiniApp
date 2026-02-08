-- book_club.book_loans definition

CREATE TABLE `book_loans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_id` int NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID (deprecated, use internal_user_id)',
  `internal_user_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('READING','RETURNED','WAITING') COLLATE utf8mb4_unicode_ci DEFAULT 'READING',
  `borrowed_at` datetime DEFAULT (now()),
  `returned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_book_loans_book_id` (`book_id`),
  KEY `ix_book_loans_id` (`id`),
  KEY `idx_book_loans_internal_user_id` (`internal_user_id`),
  CONSTRAINT `book_loans_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`),
  CONSTRAINT `fk_book_loans_internal_user` FOREIGN KEY (`internal_user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_book_loans_user` CHECK ((((`user_id` is not null) and (`user_id` <> _utf8mb4'')) or (`internal_user_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- book_club.book_reviews definition

CREATE TABLE `book_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_id` int NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID (deprecated, use internal_user_id)',
  `internal_user_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating` decimal(2,1) NOT NULL COMMENT 'Рейтинг від 0.5 до 5.0 з кроком 0.5',
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_book_telegram_user_review` (`book_id`,`user_id`),
  UNIQUE KEY `idx_book_internal_user_review` (`book_id`,`internal_user_id`),
  UNIQUE KEY `unique_book_user_review` (`book_id`,`internal_user_id`),
  KEY `idx_book_reviews_book_id` (`book_id`),
  KEY `idx_book_reviews_user_id` (`user_id`),
  KEY `idx_book_reviews_internal_user_id` (`internal_user_id`),
  CONSTRAINT `book_reviews_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_reviews_internal_user` FOREIGN KEY (`internal_user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_book_reviews_user` CHECK ((((`user_id` is not null) and (`user_id` <> _utf8mb4'')) or (`internal_user_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.books definition

CREATE TABLE `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID (deprecated, use owner_internal_id)',
  `owner_internal_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `owner_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `club_id` int NOT NULL,
  `status` enum('AVAILABLE','READING','DELETED') COLLATE utf8mb4_unicode_ci DEFAULT 'AVAILABLE',
  `cover_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT (now()),
  `google_volume_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isbn_10` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isbn_13` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_source` enum('DEFAULT','USER','GOOGLE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT',
  `description_source` enum('EMPTY','USER','GOOGLE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMPTY',
  PRIMARY KEY (`id`),
  KEY `ix_books_id` (`id`),
  KEY `idx_club_id` (`club_id`),
  KEY `idx_books_google_volume_id` (`google_volume_id`),
  KEY `idx_books_owner_internal_id` (`owner_internal_id`),
  CONSTRAINT `fk_books_owner_internal` FOREIGN KEY (`owner_internal_id`) REFERENCES `internal_users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_books_owner` CHECK ((((`owner_id` is not null) and (`owner_id` <> _utf8mb4'')) or (`owner_internal_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.club_join_requests definition

CREATE TABLE `club_join_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID',
  `internal_user_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_club_id` (`club_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_club_status` (`club_id`,`status`),
  KEY `idx_club_join_requests_internal_user_id` (`internal_user_id`),
  CONSTRAINT `club_join_requests_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_club_join_requests_internal_user` FOREIGN KEY (`internal_user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_club_join_requests_user` CHECK ((((`user_id` is not null) and (`user_id` <> _utf8mb4'')) or (`internal_user_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.club_members definition

CREATE TABLE `club_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID',
  `internal_user_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('OWNER','ADMIN','MEMBER') COLLATE utf8mb4_unicode_ci DEFAULT 'MEMBER',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_club_user` (`club_id`,`user_id`),
  UNIQUE KEY `unique_club_internal_user` (`club_id`,`internal_user_id`),
  KEY `idx_club_id` (`club_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_club_user` (`club_id`,`user_id`),
  KEY `idx_club_members_internal_user_id` (`internal_user_id`),
  CONSTRAINT `club_members_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_club_members_internal_user` FOREIGN KEY (`internal_user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_club_members_user` CHECK ((((`user_id` is not null) and (`user_id` <> _utf8mb4'')) or (`internal_user_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.clubs definition

CREATE TABLE `clubs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `chat_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram user ID',
  `owner_internal_id` int DEFAULT NULL COMMENT 'FK to users.id for Web users',
  `invite_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `status` enum('ACTIVE','INACTIVE','DELETED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `cover_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL of the club avatar image (300x300px max)',
  `requires_approval` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether join requests require admin approval (FALSE = auto-approve)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_clubs_chat_id` (`chat_id`),
  UNIQUE KEY `invite_code` (`invite_code`),
  KEY `ix_clubs_id` (`id`),
  KEY `idx_owner_id` (`owner_id`),
  KEY `idx_invite_code` (`invite_code`),
  KEY `idx_clubs_public_approval` (`is_public`,`requires_approval`,`status`),
  KEY `idx_clubs_owner_internal_id` (`owner_internal_id`),
  CONSTRAINT `fk_clubs_owner_internal` FOREIGN KEY (`owner_internal_id`) REFERENCES `internal_users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_clubs_owner` CHECK ((((`owner_id` is not null) and (`owner_id` <> _utf8mb4'')) or (`owner_internal_id` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.internal_users definition

CREATE TABLE `internal_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_users_created_at` (`created_at`),
  KEY `ix_users_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.user_identities definition

CREATE TABLE `user_identities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `provider` enum('TELEGRAM','GOOGLE','EMAIL','APPLE','FACEBOOK') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_identities_id` (`id`),
  KEY `ix_user_identities_user_id` (`user_id`),
  KEY `ix_user_identities_provider` (`provider`),
  KEY `ix_user_identities_email` (`email`),
  CONSTRAINT `user_identities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- book_club.user_profiles definition

CREATE TABLE `user_profiles` (
  `user_id` int NOT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `ix_user_profiles_username` (`username`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `internal_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

