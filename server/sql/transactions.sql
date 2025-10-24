-- SolSign Transactions Table
-- This table stores all SSIGN burn transactions for document signing

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(88) NOT NULL UNIQUE, -- Solana transaction hash (base58, max 88 chars)
    doc_hash VARCHAR(64) NOT NULL,        -- SHA-256 document hash (hex, 64 chars)
    signer_pubkey VARCHAR(44) NOT NULL,   -- Solana public key (base58, 44 chars)
    ssign_amount DECIMAL(18,9) NOT NULL,  -- Amount of SSIGN burned (with 9 decimals)
    signed_at TIMESTAMP NOT NULL,        -- When the document was signed
    explorer_url TEXT NOT NULL,          -- Solana explorer URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_doc_hash (doc_hash),
    INDEX idx_signer_pubkey (signer_pubkey),
    INDEX idx_signed_at (signed_at),
    INDEX idx_created_at (created_at)
);

-- Optional: Add a table for document metadata
CREATE TABLE IF NOT EXISTS document_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_hash VARCHAR(64) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    file_size BIGINT,
    uploader_pubkey VARCHAR(44),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_doc_hash (doc_hash),
    INDEX idx_uploader (uploader_pubkey)
);

-- Optional: Add a table for SSIGN token supply tracking
CREATE TABLE IF NOT EXISTS token_supply_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(88) NOT NULL,
    burn_amount DECIMAL(18,9) NOT NULL,
    total_burned DECIMAL(18,9) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_created_at (created_at)
);
