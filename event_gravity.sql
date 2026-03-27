-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 27, 2026 at 08:36 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_gravity`
--

-- --------------------------------------------------------

--
-- Table structure for table `agendas`
--

CREATE TABLE `agendas` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `day_number` int(11) DEFAULT 1,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sequence` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agendas`
--

INSERT INTO `agendas` (`id`, `event_id`, `day_number`, `start_time`, `end_time`, `title`, `description`, `sequence`) VALUES
(2, 3, 1, '09:00:00', '10:00:00', 'Welcome Address & Inaugural Session', '', 0),
(3, 3, 1, '11:00:00', '12:00:00', 'Industry Presentation', '', 2),
(4, 3, 2, '09:00:00', '09:45:00', 'Panel Discussion 1: The Funding Frontier: Reimagining Models for Growth & Global Impact', '', 0),
(5, 3, 1, '10:00:00', '11:00:00', 'Keynote Speaker', '', 1),
(6, 3, 1, '12:00:00', '13:00:00', 'Lunch Break', '', 3),
(7, 3, 1, '13:00:00', '13:30:00', 'Gen AI ', '', 4);

-- --------------------------------------------------------

--
-- Table structure for table `agenda_speakers`
--

CREATE TABLE `agenda_speakers` (
  `agenda_id` int(11) NOT NULL,
  `speaker_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agenda_speakers`
--

INSERT INTO `agenda_speakers` (`agenda_id`, `speaker_id`) VALUES
(2, 2),
(3, 1),
(4, 1),
(5, 1),
(7, 3);

-- --------------------------------------------------------

--
-- Table structure for table `attendees`
--

CREATE TABLE `attendees` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `ticket_type` enum('general','vip','speaker','sponsor') DEFAULT 'general',
  `status` enum('registered','confirmed','checked_in','cancelled') DEFAULT 'registered',
  `event_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendees`
--

INSERT INTO `attendees` (`id`, `name`, `email`, `phone`, `company`, `designation`, `ticket_type`, `status`, `event_id`, `notes`, `created_at`, `created_by`) VALUES
(1, 'Rohit Goyal', 'rohit@digitallearning.in', '41152146514', 'dd', 'dwdqwd', 'general', 'registered', 3, 'dwdq', '2026-02-25 07:56:20', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `status` enum('upcoming','ongoing','completed','canceled') DEFAULT 'upcoming',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `start_date`, `end_date`, `venue`, `status`, `created_by`, `created_at`) VALUES
(3, 'NBFC 19', '', '2026-02-13 00:00:00', '2026-02-13 00:00:00', 'Delhi', 'upcoming', 1, '2026-02-13 12:21:46'),
(4, 'World AI Summit', 'World AI Summit', '2026-02-28 00:00:00', '2026-03-03 00:00:00', 'Mumbai', 'upcoming', 1, '2026-02-13 12:22:19'),
(5, 'Water AI Summit', 'Water AI Summit In Bangaluru', '2026-05-04 00:00:00', '2026-05-04 00:00:00', 'Novotel', 'upcoming', 2, '2026-03-25 10:11:30');

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('admin','manager','employee') NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `assigned_task` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invitations`
--

INSERT INTO `invitations` (`id`, `email`, `role`, `token`, `created_by`, `created_at`, `expires_at`, `event_id`, `assigned_task`) VALUES
(6, '', 'employee', 'a631a5d458a98fc776c41e8247abdd8a1fc0fe7d5fa273583b86814d1a49dd4b', 2, '2026-03-25 13:19:09', NULL, NULL, NULL),
(9, 'Deepak@elets.in', 'employee', 'df1c89092dbd628a48a16d51713ca6ee957ffa935bee01f7a39cb39df226a315', 2, '2026-03-27 05:51:37', NULL, 3, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `partners`
--

CREATE TABLE `partners` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `website` varchar(255) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `sequence` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `wishlist` text DEFAULT NULL,
  `speaker_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `partners`
--

INSERT INTO `partners` (`id`, `name`, `website`, `logo_url`, `event_id`, `category_id`, `sequence`, `created_by`, `wishlist`, `speaker_id`) VALUES
(1, 'Kyndryl', '', '/uploads/partner-1770984873975.webp', 3, 1, 1, NULL, NULL, NULL),
(2, 'NBFC', '', '/uploads/partner-1770985231132.png', 3, 3, 4, NULL, NULL, NULL),
(3, 'CTO Summit ', '', '/uploads/partner-1770985288487.png', 4, 4, 2, NULL, NULL, NULL),
(4, 'BFSI', '', '/uploads/partner-1774353609304.webp', 3, 3, 3, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `partner_categories`
--

CREATE TABLE `partner_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `partner_categories`
--

INSERT INTO `partner_categories` (`id`, `name`, `created_at`) VALUES
(1, 'Gold Partner', '2026-02-13 12:05:13'),
(2, 'Silver Partner', '2026-02-13 12:09:17'),
(3, 'AI Partner', '2026-02-13 12:20:05'),
(4, 'Networking Excellent Partner', '2026-02-13 12:21:00');

-- --------------------------------------------------------

--
-- Table structure for table `partner_wishlist`
--

CREATE TABLE `partner_wishlist` (
  `partner_id` int(11) NOT NULL,
  `speaker_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `partner_wishlist`
--

INSERT INTO `partner_wishlist` (`partner_id`, `speaker_id`) VALUES
(1, 1),
(1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `created_at`) VALUES
(1, 'portal_logo', '/uploads/logo-1774445425359.jpg', '2026-03-25 13:17:55'),
(3, 'portal_logo_width', '104', '2026-03-26 06:57:07');

-- --------------------------------------------------------

--
-- Table structure for table `speakers`
--

CREATE TABLE `speakers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `bio` text DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `sns_card_url` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `topic` text DEFAULT NULL,
  `panel` varchar(255) DEFAULT NULL,
  `mobile_no` varchar(50) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `speakers`
--

INSERT INTO `speakers` (`id`, `name`, `bio`, `photo_url`, `designation`, `company`, `email`, `event_id`, `sns_card_url`, `role`, `created_by`, `topic`, `panel`, `mobile_no`, `linkedin_url`) VALUES
(1, 'Akshay Yadava ', '', '/uploads/speaker-1770800309648.png', 'Director', 'UIDAI', 'akshaya.yadava@gmail.com', 3, NULL, 'Keynote', NULL, 'Presentation About AI', NULL, NULL, NULL),
(2, 'K.R.Jyothilal, IAS', '', '/uploads/speaker-1770985833229.webp', 'Additional Chief Secretary Finance and Taxes Department', 'Government of Kerala', '', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Gaurav Jain', '', '/uploads/speaker-1774508749767.png', 'CBO', 'Hyperverg', '', 3, NULL, 'Keynote', 1, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `speaker_travel`
--

CREATE TABLE `speaker_travel` (
  `id` int(11) NOT NULL,
  `speaker_id` int(11) NOT NULL,
  `travel_type` enum('flight','hotel','cab','train','other') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `from_location` varchar(255) DEFAULT NULL,
  `to_location` varchar(255) DEFAULT NULL,
  `departure_date` datetime DEFAULT NULL,
  `arrival_date` datetime DEFAULT NULL,
  `booking_ref` varchar(255) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','booked','confirmed','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `speaker_travel`
--

INSERT INTO `speaker_travel` (`id`, `speaker_id`, `travel_type`, `title`, `details`, `from_location`, `to_location`, `departure_date`, `arrival_date`, `booking_ref`, `cost`, `currency`, `status`, `notes`, `created_at`) VALUES
(1, 1, 'flight', 'Flight Ticket', 'Booked', 'Delhi', 'Noida', '2026-02-17 13:27:00', '2026-02-24 13:27:00', '16458142', 2000.00, 'INR', 'booked', '', '2026-02-25 07:57:26'),
(3, 1, 'flight', 'Needed', '', 'Delhi', 'Mumbai', '2026-03-17 06:58:00', '2026-03-26 06:58:00', '', 0.00, 'INR', 'cancelled', 'Not Approved', '2026-03-26 12:28:30');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','manager','employee') DEFAULT 'employee',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `assigned_event_id` int(11) DEFAULT NULL,
  `assigned_task` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `assigned_event_id`, `assigned_task`) VALUES
(1, 'Admin User', 'admin@example.com', '$2b$10$AetKcY68iepEsTCxfA0N3eKyilZshpXvUe8I7ezDMlvsF.qVjUufi', 'admin', '2026-02-11 07:59:14', NULL, NULL),
(2, 'Rohit Goyal', 'rohit@digitallearning.in', '$2b$10$8ahjguO2KLoBpEdYZd1AJ.cBvtm6kiUJH/tN3TPcR2Mg0nqZMx3Y6', 'manager', '2026-03-25 10:10:39', 3, NULL),
(3, 'Sachin Kumar', 'sachin.kumar@digitallearning.in', '$2b$10$88Q1ZGK5eW2Gvh4ur5Kb2O8S8E4iQBwAZmalSPT/9bgGJJTth2pny', 'employee', '2026-03-25 10:13:05', 3, NULL),
(4, 'Vishwas Sinha', 'vishwas@eletsonline.com', '$2b$10$AB0ZmiGcPa8TfVyumT0PvefaoeqzvNXGgzf47LmXPz97o7MGymP/q', 'employee', '2026-03-26 05:03:04', 5, NULL),
(5, 'Vipul Jain', 'vipul.jain@elets.in', '$2b$10$M7I55MaZIibEVD1nEg/03e8K9kLGiMtwGRTnEgptlmukMIDYhwD.i', 'employee', '2026-03-26 07:16:33', 3, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `agendas`
--
ALTER TABLE `agendas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `agenda_speakers`
--
ALTER TABLE `agenda_speakers`
  ADD PRIMARY KEY (`agenda_id`,`speaker_id`),
  ADD KEY `speaker_id` (`speaker_id`);

--
-- Indexes for table `attendees`
--
ALTER TABLE `attendees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `partners`
--
ALTER TABLE `partners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `partner_categories`
--
ALTER TABLE `partner_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `partner_wishlist`
--
ALTER TABLE `partner_wishlist`
  ADD PRIMARY KEY (`partner_id`,`speaker_id`),
  ADD KEY `speaker_id` (`speaker_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `speakers`
--
ALTER TABLE `speakers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `speaker_travel`
--
ALTER TABLE `speaker_travel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `speaker_id` (`speaker_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `agendas`
--
ALTER TABLE `agendas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `attendees`
--
ALTER TABLE `attendees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `invitations`
--
ALTER TABLE `invitations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `partners`
--
ALTER TABLE `partners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `partner_categories`
--
ALTER TABLE `partner_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `speakers`
--
ALTER TABLE `speakers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `speaker_travel`
--
ALTER TABLE `speaker_travel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agendas`
--
ALTER TABLE `agendas`
  ADD CONSTRAINT `agendas_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `agenda_speakers`
--
ALTER TABLE `agenda_speakers`
  ADD CONSTRAINT `agenda_speakers_ibfk_1` FOREIGN KEY (`agenda_id`) REFERENCES `agendas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `agenda_speakers_ibfk_2` FOREIGN KEY (`speaker_id`) REFERENCES `speakers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendees`
--
ALTER TABLE `attendees`
  ADD CONSTRAINT `attendees_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `attendees_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `partners`
--
ALTER TABLE `partners`
  ADD CONSTRAINT `partners_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `partners_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `partner_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `partners_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `partner_wishlist`
--
ALTER TABLE `partner_wishlist`
  ADD CONSTRAINT `partner_wishlist_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `partner_wishlist_ibfk_2` FOREIGN KEY (`speaker_id`) REFERENCES `speakers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `speakers`
--
ALTER TABLE `speakers`
  ADD CONSTRAINT `speakers_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `speakers_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `speaker_travel`
--
ALTER TABLE `speaker_travel`
  ADD CONSTRAINT `speaker_travel_ibfk_1` FOREIGN KEY (`speaker_id`) REFERENCES `speakers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
