const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction, 
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Solana configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// SOLSIGN Token configuration
const SOLSIGN_TOKEN_CONFIG = {
  mintAddress: 'GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw', // Your SOLSIGN token mint address
  decimals: 9,
  symbol: 'SSIGN'
};

// Load the signer keypair from soul_adrian.json
const loadSignerKeypair = () => {
  try {
    const keypairPath = path.join(__dirname, '../../soul_adrian.json');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`✅ Loaded signer keypair: ${keypair.publicKey.toString()}`);
    return keypair;
  } catch (error) {
    console.error('❌ Failed to load signer keypair:', error.message);
    throw new Error('Could not load signer keypair from soul_adrian.json');
  }
};

// Create connection to Solana network
const createConnection = () => {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  console.log(`🌐 Connected to Solana ${SOLANA_NETWORK}: ${SOLANA_RPC_URL}`);
  return connection;
};

// Get or create associated token account for a user
const getUserTokenAccount = async (connection, userPublicKey, signerKeypair) => {
  try {
    const mintPublicKey = new PublicKey(SOLSIGN_TOKEN_CONFIG.mintAddress);
    const userPublicKeyObj = new PublicKey(userPublicKey);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      signerKeypair, // payer
      mintPublicKey, // mint
      userPublicKeyObj // owner
    );
    
    console.log(`✅ User token account: ${tokenAccount.address.toString()}`);
    return tokenAccount;
  } catch (error) {
    console.error('❌ Failed to get user token account:', error.message);
    throw error;
  }
};

// Get signer's token account
const getSignerTokenAccount = async (connection, signerKeypair) => {
  try {
    const mintPublicKey = new PublicKey(SOLSIGN_TOKEN_CONFIG.mintAddress);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      signerKeypair, // payer
      mintPublicKey, // mint
      signerKeypair.publicKey // owner
    );
    
    console.log(`✅ Signer token account: ${tokenAccount.address.toString()}`);
    return tokenAccount;
  } catch (error) {
    console.error('❌ Failed to get signer token account:', error.message);
    throw error;
  }
};

// Check if signer has enough tokens
const checkSignerBalance = async (connection, signerTokenAccount) => {
  try {
    const accountInfo = await getAccount(connection, signerTokenAccount.address);
    const balance = Number(accountInfo.amount);
    const balanceInTokens = balance / Math.pow(10, SOLSIGN_TOKEN_CONFIG.decimals);
    
    console.log(`💰 Signer balance: ${balanceInTokens} ${SOLSIGN_TOKEN_CONFIG.symbol}`);
    return { balance, balanceInTokens };
  } catch (error) {
    console.error('❌ Failed to check signer balance:', error.message);
    throw error;
  }
};

// Transfer SOLSIGN tokens to user
const transferSOLSIGNTokens = async (userWalletAddress, amount = 8.0) => {
  let connection;
  
  try {
    console.log(`🚀 Starting SOLSIGN token transfer...`);
    console.log(`📤 Recipient: ${userWalletAddress}`);
    console.log(`💰 Amount: ${amount} ${SOLSIGN_TOKEN_CONFIG.symbol}`);
    
    // Create connection and load signer
    connection = createConnection();
    const signerKeypair = loadSignerKeypair();
    
    // Validate user wallet address
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Get token accounts
    const userTokenAccount = await getUserTokenAccount(connection, userWalletAddress, signerKeypair);
    const signerTokenAccount = await getSignerTokenAccount(connection, signerKeypair);
    
    // Check signer balance
    const { balance, balanceInTokens } = await checkSignerBalance(connection, signerTokenAccount);
    const transferAmount = Math.floor(amount * Math.pow(10, SOLSIGN_TOKEN_CONFIG.decimals));
    
    if (balance < transferAmount) {
      throw new Error(`Insufficient balance. Required: ${amount} ${SOLSIGN_TOKEN_CONFIG.symbol}, Available: ${balanceInTokens} ${SOLSIGN_TOKEN_CONFIG.symbol}`);
    }
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      signerTokenAccount.address, // source
      userTokenAccount.address,   // destination
      signerKeypair.publicKey,    // owner
      transferAmount,             // amount
      [],                         // multiSigners
      TOKEN_PROGRAM_ID           // programId
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    console.log(`📝 Sending transaction...`);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [signerKeypair],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      }
    );
    
    console.log(`✅ Transaction successful!`);
    console.log(`🔗 Transaction signature: ${signature}`);
    console.log(`🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_NETWORK}`);
    
    return {
      success: true,
      signature,
      amount: amount,
      recipient: userWalletAddress,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_NETWORK}`
    };
    
  } catch (error) {
    console.error('❌ Token transfer failed:', error.message);
    return {
      success: false,
      error: error.message,
      amount: amount,
      recipient: userWalletAddress
    };
  }
};

// Get transaction status
const getTransactionStatus = async (signature) => {
  try {
    const connection = createConnection();
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });
    
    if (transaction) {
      return {
        success: true,
        status: transaction.meta?.err ? 'failed' : 'success',
        slot: transaction.slot,
        blockTime: transaction.blockTime
      };
    } else {
      return {
        success: false,
        status: 'not_found'
      };
    }
  } catch (error) {
    console.error('❌ Failed to get transaction status:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  transferSOLSIGNTokens,
  getTransactionStatus,
  SOLSIGN_TOKEN_CONFIG
};
