-- Adminer 4.0.3 MySQL dump

SET NAMES utf8;
SET foreign_key_checks = 0;
SET time_zone = '+02:00';
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

INSERT INTO `ladders` (`id`, `name`, `default_elo`) VALUES
(1,	'RM - 1v1',	1600),
(2,	'RM - Team Games',	1600);

INSERT INTO `ratings` (`id`, `user_id`, `ladder_id`, `elo`, `wins`, `losses`, `streak`, `incomplete`) VALUES
(1,	1,	1,	1600,	0,	0,	0,	0),
(2,	2,	1,	1600,	0,	0,	0,	0);

INSERT INTO `rooms` (`id`, `title`, `descr`, `max_players`, `ladder_id`, `host_id`, `status`, `ip`) VALUES
(1,	'Test Room',	'',	8,	1,	1,	'playing',	'94.214.206.251'),
(15,	'TyRanT 2v2',	'',	4,	2,	3,	'waiting',	NULL),
(17,	'Canada Wins NC!',	'',	8,	2,	8,	'waiting',	NULL),
(20,	'Zak',	NULL,	8,	1,	1,	NULL,	'81.23.56.92');

INSERT INTO `sessions` (`id`, `seskey`, `room_id`, `user_id`) VALUES
(9,	'1458e02cbb',	1,	1),
(10,	'1458e02cbb',	1,	2);

INSERT INTO `users` (`id`, `username`, `password`, `country`, `status`, `in_room_id`) VALUES
(1,	'Anna',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'kr',	'avail',	20),
(2,	'Zak',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'gb',	'avail',	NULL),
(3,	'TheViper',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'no',	'avail',	1),
(4,	'Jordan_23',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'de',	'avail',	1),
(5,	'BacT',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'vn',	'avail',	15),
(6,	'RiuT',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'br',	'avail',	NULL),
(7,	'kkab__',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'kr',	'avail',	15),
(8,	'slam',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'ca',	'avail',	17),
(9,	'mentalist',	'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',	'ca',	'avail',	17);

-- 2014-04-25 13:44:24