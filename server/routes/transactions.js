const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Database connection (using existing .env from root)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'solsign_db',
  port: process.env.DB_PORT || 3306
};

console.log('🔧 Database Config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  hasPassword: !!dbConfig.password
});

// Create database connection
const getConnection = async () => {
  try {
    return await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Save transaction to database
router.post('/save-transaction', async (req, res) => {
  let connection;
  try {
    const { txHash, docHash, signerPubkey, ssignAmount, signedAt, explorerUrl } = req.body;
    
    console.log('📝 Saving transaction to database:', {
      txHash: txHash?.slice(0, 8) + '...',
      docHash: docHash?.slice(0, 8) + '...',
      signerPubkey: signerPubkey?.slice(0, 8) + '...',
      ssignAmount,
      signedAt,
      explorerUrl: explorerUrl?.slice(0, 50) + '...'
    });
    
    if (!txHash || !docHash) {
      console.error('❌ Missing required fields:', { txHash: !!txHash, docHash: !!docHash });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    connection = await getConnection();
    console.log('✅ Database connection established');
    
    // Convert ISO string to MySQL datetime format
    let mysqlDateTime;
    try {
      const date = new Date(signedAt);
      mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
      console.log('📅 Converting datetime:', { original: signedAt, mysql: mysqlDateTime });
    } catch (dateError) {
      console.error('❌ Date conversion error:', dateError);
      mysqlDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      console.log('📅 Using current time as fallback:', mysqlDateTime);
    }
    
    const [result] = await connection.execute(
      `INSERT INTO transactions (tx_hash, doc_hash, signer_pubkey, ssign_amount, signed_at, explorer_url) 
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [txHash, docHash, signerPubkey, ssignAmount, explorerUrl]
    );
    
    console.log('✅ Transaction saved to database:', { 
      txHash: txHash.slice(0, 8) + '...', 
      docHash: docHash.slice(0, 8) + '...', 
      insertId: result.insertId 
    });
    
    res.json({ 
      success: true, 
      message: 'Transaction saved successfully',
      transactionId: result.insertId
    });
    
  } catch (err) {
    console.error('❌ save-transaction error:', err);
    res.status(500).json({ message: 'Failed to save transaction: ' + err.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Get all transactions
router.get('/transactions', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      `SELECT * FROM transactions ORDER BY created_at DESC`
    );
    
    console.log(`📊 Found ${rows.length} transactions in database`);
    
    res.json({ 
      success: true, 
      count: rows.length,
      transactions: rows
    });
  } catch (err) {
    console.error('get-transactions error:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Get transaction by hash
router.get('/transaction/:txHash', async (req, res) => {
  let connection;
  try {
    const { txHash } = req.params;
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      `SELECT * FROM transactions WHERE tx_hash = ?`,
      [txHash]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json({ 
      success: true, 
      transaction: rows[0]
    });
  } catch (err) {
    console.error('get-transaction error:', err);
    res.status(500).json({ message: 'Failed to fetch transaction' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Test database connection
router.get('/test-db', async (req, res) => {
  let connection;
  try {
    console.log('🧪 Testing database connection...');
    connection = await getConnection();
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check if transactions table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'transactions'"
    );
    
    const tableExists = tables.length > 0;
    console.log('📊 Transactions table exists:', tableExists);
    
    res.json({
      success: true,
      message: 'Database connection successful',
      config: {
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user
      },
      tableExists,
      testQuery: rows[0]
    });
    
  } catch (err) {
    console.error('❌ Database test failed:', err);
    res.status(500).json({ 
      success: false,
      message: 'Database connection failed',
      error: err.message,
      config: {
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user
      }
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

module.exports = router;
