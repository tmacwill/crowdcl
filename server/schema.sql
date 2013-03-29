SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS `problem` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `score` decimal(10,0) NOT NULL,
  `data` text NOT NULL,
  `__verified` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;
