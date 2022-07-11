DROP DATABASE IF EXISTS FurryGif;
CREATE DATABASE FurryGif DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE FurryGif;

CREATE TABLE `User` (
	`id` BIGINT UNSIGNED NOT NULL,
	`firstName` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`lastName` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`username` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`role` ENUM('user','moderator','administrator') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
	`disabled` BIT(1) NOT NULL DEFAULT b'0',
	`sfwMode` BIT(1) NOT NULL DEFAULT b'1',
	`createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` DATETIME DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE KEY `uq_user_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Gif` (
	`fileId` VARCHAR(256) COLLATE utf8mb4_unicode_ci NOT NULL,
	`fileUniqueId` VARCHAR(256) COLLATE utf8mb4_unicode_ci NOT NULL,
	`width` SMALLINT NOT NULL,
	`height` SMALLINT NOT NULL,
	`duration` SMALLINT NOT NULL,
	`fileName` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`mimeType` VARCHAR(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
	`fileSize` MEDIUMINT DEFAULT NULL,
	`thumbFileId` VARCHAR(256) COLLATE utf8mb4_unicode_ci NOT NULL,
	`thumbFileUniqueId` VARCHAR(256) COLLATE utf8mb4_unicode_ci NOT NULL,
	`thumbWidth` SMALLINT NOT NULL,
	`thumbHeight` SMALLINT NOT NULL,
	`thumbFileSize` MEDIUMINT NOT NULL,
	`rating` ENUM('safe','explicit') COLLATE utf8mb4_unicode_ci,
	`uploadedById` BIGINT unsigned DEFAULT NULL,
	`approvedById` BIGINT unsigned DEFAULT NULL,
	PRIMARY KEY (`fileUniqueId`),
	KEY `idx_gif_uploadedById` (`uploadedById`),
	KEY `idx_gif_approvedById` (`approvedById`),
	CONSTRAINT `fk_gif_approvedById` FOREIGN KEY (`approvedById`) REFERENCES `User` (`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_gif_uploadedById` FOREIGN KEY (`uploadedById`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Tag` (
	`tag` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
	`category` ENUM('artist','character','copyright','general','meta','species') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
	PRIMARY KEY (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `GifTag` (
	`fileUniqueId` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`tag` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	PRIMARY KEY (`fileUniqueId`,`tag`),
	KEY `idx_gifTag_tag` (`tag`),
	CONSTRAINT `fk_gifTag_fileUniqueId` FOREIGN KEY (`fileUniqueId`) REFERENCES `Gif` (`fileUniqueId`) ON DELETE CASCADE,
	CONSTRAINT `fk_gifTag_tag` FOREIGN KEY (`tag`) REFERENCES `Tag` (`tag`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TagAlias` (
	`tag` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`alias` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
	PRIMARY KEY (`alias`),
	KEY `idx_tagAlias_tag` (`tag`),
	CONSTRAINT `fk_tagAlias_tag` FOREIGN KEY (`tag`) REFERENCES `Tag` (`tag`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Implication` (
	`tag` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`implies` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	PRIMARY KEY (`tag`,`implies`),
	CONSTRAINT `fk_implication_implies` FOREIGN KEY (`tag`) REFERENCES `Tag` (`tag`) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT `fk_implication_tag` FOREIGN KEY (`tag`) REFERENCES `Tag` (`tag`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Source` (
	`fileUniqueId` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`source` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	PRIMARY KEY (`source`,`fileUniqueId`),
	KEY `idx_source_fileUniqueId` (`fileUniqueId`),
	CONSTRAINT `fk_source_fileUniqueId` FOREIGN KEY (`fileUniqueId`) REFERENCES `Gif` (`fileUniqueId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
