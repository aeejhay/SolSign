-- SolSign Database Tables - Manual Creation Script
-- Run this script in your MySQL database to create all required tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS solsign_db;
USE solsign_db;

-- 1. Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- 2. User verifications table (for profile verification)
CREATE TABLE IF NOT EXISTS user_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status ENUM('pending', 'code_sent', 'verified', 'rejected') DEFAULT 'pending',
    verification_code VARCHAR(6),
    code_expires_at TIMESTAMP NULL,
    tokens_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
    reward_amount DECIMAL(18,9) DEFAULT 8.0,
    transaction_signature VARCHAR(88),
    transaction_explorer_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_verification_status (verification_status),
    INDEX idx_verification_code (verification_code),
    INDEX idx_created_at (created_at)
);

-- 3. Transactions table (for SSIGN burn transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(88) NOT NULL UNIQUE,
    doc_hash VARCHAR(64) NOT NULL,
    signer_pubkey VARCHAR(44) NOT NULL,
    ssign_amount DECIMAL(18,9) NOT NULL,
    signed_at TIMESTAMP NOT NULL,
    explorer_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_doc_hash (doc_hash),
    INDEX idx_signer_pubkey (signer_pubkey),
    INDEX idx_signed_at (signed_at),
    INDEX idx_created_at (created_at)
);

-- 4. Document metadata table (optional - for document tracking)
CREATE TABLE IF NOT EXISTS document_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_hash VARCHAR(64) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    file_size BIGINT,
    uploader_pubkey VARCHAR(44),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_doc_hash (doc_hash),
    INDEX idx_uploader (uploader_pubkey),
    INDEX idx_created_at (created_at)
);

-- 5. Token supply history table (optional - for tracking SSIGN burns)
CREATE TABLE IF NOT EXISTS token_supply_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(88) NOT NULL,
    burn_amount DECIMAL(18,9) NOT NULL,
    total_burned DECIMAL(18,9) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_created_at (created_at)
);

-- Insert sample data (optional)
-- INSERT INTO users (username, email, password, first_name, last_name) 
-- VALUES ('admin', 'admin@solsign.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Admin', 'User');

-- Show tables created
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE user_verifications;
DESCRIBE transactions;
DESCRIBE document_metadata;
DESCRIBE token_supply_history;
