



-- ---
-- Globals
-- ---

-- SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
-- SET FOREIGN_KEY_CHECKS=0;

-- ---
-- Table 'users'
-- 
-- ---

DROP TABLE IF EXISTS `users`;
		
CREATE TABLE `users` (
  `id` INTEGER NULL AUTO_INCREMENT DEFAULT NULL,
  `username` VARCHAR(15) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  `status` ENUM('busy','dnd','away','avail') NOT NULL DEFAULT 'avail',
  `in_room_id` INTEGER NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
);

-- ---
-- Table 'rooms'
-- 
-- ---

DROP TABLE IF EXISTS `rooms`;
		
CREATE TABLE `rooms` (
  `id` INTEGER NULL AUTO_INCREMENT DEFAULT NULL,
  `title` VARCHAR(150) NULL DEFAULT NULL,
  `descr` MEDIUMTEXT NULL DEFAULT NULL,
  `max_players` INTEGER(1) NOT NULL DEFAULT 8,
  `ladder_id` INTEGER NOT NULL,
  `host_id` INTEGER NOT NULL,
  `status` ENUM('waiting','playing') NULL DEFAULT NULL,
  `ip` VARCHAR(16) NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
);

-- ---
-- Table 'ladders'
-- 
-- ---

DROP TABLE IF EXISTS `ladders`;
		
CREATE TABLE `ladders` (
  `id` INTEGER NULL AUTO_INCREMENT DEFAULT NULL,
  `name` VARCHAR(30) NULL DEFAULT NULL,
  `default_elo` INTEGER NOT NULL DEFAULT 1600,
  PRIMARY KEY (`id`)
);

-- ---
-- Table 'ratings'
-- 
-- ---

DROP TABLE IF EXISTS `ratings`;
		
CREATE TABLE `ratings` (
  `id` INTEGER NULL AUTO_INCREMENT DEFAULT NULL,
  `user_id` INTEGER NOT NULL,
  `ladder_id` INTEGER NOT NULL,
  `elo` INTEGER NOT NULL DEFAULT 1600,
  `wins` INTEGER NOT NULL DEFAULT 0,
  `losses` INTEGER NOT NULL DEFAULT 0,
  `streak` INTEGER NOT NULL DEFAULT 0,
  `incomplete` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

-- ---
-- Table 'sessions'
-- 
-- ---

DROP TABLE IF EXISTS `sessions`;
		
CREATE TABLE `sessions` (
  `id` INTEGER NULL AUTO_INCREMENT DEFAULT NULL,
  `seskey` CHAR(10) NOT NULL,
  `room_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
);

-- ---
-- Foreign Keys 
-- ---

ALTER TABLE `users` ADD FOREIGN KEY (in_room_id) REFERENCES `rooms` (`id`);
ALTER TABLE `rooms` ADD FOREIGN KEY (ladder_id) REFERENCES `ladders` (`id`);
ALTER TABLE `rooms` ADD FOREIGN KEY (host_id) REFERENCES `users` (`id`);
ALTER TABLE `ratings` ADD FOREIGN KEY (user_id) REFERENCES `users` (`id`);
ALTER TABLE `ratings` ADD FOREIGN KEY (ladder_id) REFERENCES `ladders` (`id`);
ALTER TABLE `sessions` ADD FOREIGN KEY (room_id) REFERENCES `rooms` (`id`);
ALTER TABLE `sessions` ADD FOREIGN KEY (user_id) REFERENCES `users` (`id`);

-- ---
-- Table Properties
-- ---

-- ALTER TABLE `users` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `rooms` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `ladders` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `ratings` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `sessions` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ---
-- Test Data
-- ---

-- INSERT INTO `users` (`id`,`username`,`password`,`status`,`in_room_id`) VALUES
-- ('','','','','');
-- INSERT INTO `rooms` (`id`,`title`,`descr`,`max_players`,`ladder_id`,`host_id`,`status`,`ip`) VALUES
-- ('','','','','','','','');
-- INSERT INTO `ladders` (`id`,`name`,`default_elo`) VALUES
-- ('','','');
-- INSERT INTO `ratings` (`id`,`user_id`,`ladder_id`,`elo`,`wins`,`losses`,`streak`,`incomplete`) VALUES
-- ('','','','','','','','');
-- INSERT INTO `sessions` (`id`,`seskey`,`room_id`,`user_id`) VALUES
-- ('','','','');

