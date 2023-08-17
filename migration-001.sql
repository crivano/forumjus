CREATE DATABASE forumjus;

CREATE TABLE `forumjus`.`election` (
  `election_id` INT NOT NULL AUTO_INCREMENT,
  `election_name` VARCHAR(255) NOT NULL,
  `election_administrator_email` VARCHAR(45) NOT NULL,
  `election_start` DATETIME NULL,
  `election_end` DATETIME NULL,
  PRIMARY KEY (`election_id`));

CREATE TABLE `forumjus`.`voter` (
  `voter_id` INT NOT NULL AUTO_INCREMENT,
  `election_id` INT NOT NULL,
  `voter_name` VARCHAR(255) NOT NULL,
  `voter_email` VARCHAR(255) NOT NULL,
  `voter_vote_datetime` DATETIME NULL,
  `voter_vote_ip` VARCHAR(45) NULL,
  PRIMARY KEY (`voter_id`));

CREATE TABLE `forumjus`.`candidate` (
  `candidate_id` INT NOT NULL AUTO_INCREMENT,
  `election_id` INT NOT NULL,
  `candidate_name` VARCHAR(255) NOT NULL,
  `candidate_votes` INT NOT NULL,
  PRIMARY KEY (`candidate_id`));

CREATE TABLE `forumjus`.`forum` (
  `forum_id` INT NOT NULL AUTO_INCREMENT,
  `forum_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`forum_id`));

INSERT INTO `forumjus`.`forum` VALUES(1, 'Fórum de Direitos Humanos e Fundamentais da Justiça Federal da 2ª Região');

CREATE TABLE `forumjus`.`category` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `forum_id` INT NOT NULL,
  `category_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`category_id`),
  FOREIGN KEY (`forum_id`) REFERENCES `forumjus`.`forum`(`forum_id`));

INSERT INTO `forumjus`.`category` VALUES(1, 1, 'Jurista');
INSERT INTO `forumjus`.`category` VALUES(2, 1, 'Especialista');
INSERT INTO `forumjus`.`category` VALUES(3, 1, 'Magistrado');

CREATE TABLE `forumjus`.`committee` (
  `committee_id` INT NOT NULL AUTO_INCREMENT,
  `forum_id` INT NOT NULL,
  `committee_name` VARCHAR(255) NOT NULL,
  `committee_chair_name` VARCHAR(255) NOT NULL,
  `committee_chair_document` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`committee_id`),
  FOREIGN KEY (`forum_id`) REFERENCES `forumjus`.`forum`(`forum_id`));

CREATE TABLE `forumjus`.`attendee` (
  `attendee_id` INT NOT NULL AUTO_INCREMENT,
  `forum_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `committee_id` INT NOT NULL,
  `attendee_name` VARCHAR(255) NOT NULL,
  `attendee_email` VARCHAR(255) NOT NULL,
  `attendee_document` VARCHAR(255) NOT NULL,
  `attendee_statement_title` VARCHAR(255) NOT NULL,
  `attendee_statement_text` VARCHAR(1024) NOT NULL,
  `attendee_acceptance_datetime` DATETIME NULL,
  `attendee_rejection_datetime` DATETIME NULL,
  PRIMARY KEY (`attendee_id`),
  FOREIGN KEY (`forum_id`) REFERENCES `forumjus`.`forum`(`forum_id`),
  FOREIGN KEY (`category_id`) REFERENCES `forumjus`.`category`(`category_id`),
  FOREIGN KEY (`committee_id`) REFERENCES `forumjus`.`committee`(`committee_id`));

