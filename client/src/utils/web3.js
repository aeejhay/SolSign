import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, createTransferInstruction, getMint, createBurnInstruction } from '@solana/spl-token';

// SOLSIGN Token Configuration for Devnet
export const SOLSIGN_TOKEN_CONFIG = {
  // Replace this with your actual SSIGN token mint address on devnet
  // You can find this in your create-token.js file or Phantom wallet
  mintAddress: 'GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw', // Your SSIGN token mint
  mintAuthority: 'uu7w3NjWhupAHP7zYwUrbmpACZUpa2xdJSgTwzEqcaU',
  decimals: 9, // Most SPL tokens use 9 decimals
  symbol: 'SSIGN'
};

export async function getTokenBalance(connection, walletPublicKey, tokenMintAddress) {
  try {
    if (!walletPublicKey || !tokenMintAddress || !connection) {
      console.log('Missing required parameters for token balance');
      return 0;
    }

    // Validate the addresses
    let mintPublicKey, walletPublicKeyObj;
    try {
      mintPublicKey = new PublicKey(tokenMintAddress);
      walletPublicKeyObj = new PublicKey(walletPublicKey);
    } catch (error) {
      console.error('Invalid public key format:', error);
      return 0;
    }

    // Get the associated token account address with timeout
    const associatedTokenAddress = await Promise.race([
      getAssociatedTokenAddress(mintPublicKey, walletPublicKeyObj),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    try {
      // Get the token account info with timeout
      const tokenAccount = await Promise.race([
        getAccount(connection, associatedTokenAddress),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      return Number(tokenAccount.amount);
    } catch (error) {
      // If the token account doesn't exist, the balance is 0
      if (error.message.includes('could not find account') || 
          error.message.includes('Account does not exist') ||
          error.message.includes('Timeout')) {
        return 0;
      }
      console.error('Unexpected error fetching token account:', error);
      return 0;
    }
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

export function formatTokenBalance(balance, decimals = 9) {
  return (balance / Math.pow(10, decimals)).toFixed(4);
}

// Helper function to get devnet tokens for testing
export async function requestDevnetTokens(walletPublicKey) {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Request SOL airdrop
    const signature = await connection.requestAirdrop(
      new PublicKey(walletPublicKey),
      2 * LAMPORTS_PER_SOL // 2 SOL
    );
    
    await connection.confirmTransaction(signature);
    console.log('Devnet SOL airdrop successful:', signature);
    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw error;
  }
}

export async function createSSignTransaction(amount, documentHash, walletAdapter) {
  try {
    if (!walletAdapter || !walletAdapter.publicKey || !walletAdapter.signTransaction) {
      throw new Error('Wallet not connected or not ready');
    }

    console.log(`Creating real SSIGN burn transaction: ${amount} SSIGN for document ${documentHash}`);
    console.log('Wallet public key:', walletAdapter.publicKey.toString());
    
    const { Connection, PublicKey, Transaction, TransactionInstruction } = await import('@solana/web3.js');
    const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
    
    // Create connection to Solana network (devnet for development)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Validate user public key
    let userPublicKey, ssignMint;
    try {
      console.log('Wallet adapter public key:', walletAdapter.publicKey);
      console.log('Wallet adapter public key string:', walletAdapter.publicKey?.toString());
      console.log('SSIGN mint address:', SOLSIGN_TOKEN_CONFIG.mintAddress);
      
      userPublicKey = new PublicKey(walletAdapter.publicKey.toString());
      ssignMint = new PublicKey(SOLSIGN_TOKEN_CONFIG.mintAddress);
      
      console.log('Created userPublicKey:', userPublicKey.toString());
      console.log('Created ssignMint:', ssignMint.toString());
    } catch (keyError) {
      console.error('Invalid public key error:', keyError);
      console.error('SSIGN mint address:', SOLSIGN_TOKEN_CONFIG.mintAddress);
      console.error('User public key:', walletAdapter.publicKey?.toString());
      throw new Error(`Invalid public key format: ${keyError.message}`);
    }
    
    // Convert amount to token units first
    const tokenAmount = BigInt(amount * Math.pow(10, SOLSIGN_TOKEN_CONFIG.decimals));
    
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(ssignMint, userPublicKey);
    console.log('User token account:', userTokenAccount.toString());
    console.log('SSIGN mint address:', ssignMint.toString());
    console.log('Required token amount:', tokenAmount.toString());
    
    // Check if user has the token account
    try {
      const tokenAccount = await getAccount(connection, userTokenAccount);
      console.log('Token account found:', tokenAccount);
      console.log('Token balance:', tokenAccount.amount.toString());
      
      // Check if user has enough tokens
      if (tokenAccount.amount < tokenAmount) {
        throw new Error(`Insufficient SSIGN balance. You have ${tokenAccount.amount.toString()} but need ${tokenAmount.toString()}`);
      }
    } catch (error) {
      console.error('Token account error:', error);
      throw new Error(`Token account not found for SSIGN token. Please ensure you have SSIGN tokens in your wallet. Error: ${error.message}`);
    }
    
    // Create real burn instruction
    console.log('Creating burn instruction with:');
    console.log('userTokenAccount:', userTokenAccount.toString());
    console.log('ssignMint:', ssignMint.toString());
    console.log('userPublicKey:', userPublicKey.toString());
    console.log('tokenAmount:', tokenAmount.toString());
    
    const burnInstruction = createBurnInstruction(
      userTokenAccount,  // Token account to burn from
      ssignMint,        // Mint address
      userPublicKey,    // Owner of the token account
      tokenAmount       // Amount to burn
    );
    
    // Create memo instruction with document hash
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'),
      data: Buffer.from(`SOLSIGN_BURN:${documentHash}`, 'utf8')
    });
    
    // Create transaction with real burn instruction
    const transaction = new Transaction();
    transaction.add(burnInstruction);
    transaction.add(memoInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // Sign transaction
    const signedTransaction = await walletAdapter.signTransaction(transaction);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('Real SSIGN burn transaction confirmed:', signature);
    return signature;
    
  } catch (err) {
    console.error('createSSignTransaction error:', err);
    throw new Error('Failed to create SSIGN burn transaction: ' + err.message);
  }
}

export async function commitDocumentHash(documentHash) {
  try {
    if (!documentHash) return '';
    // Expect a 64-char hex string. If not, bail gracefully.
    const hex = documentHash.startsWith('0x') ? documentHash.slice(2) : documentHash;
    if (hex.length !== 64) return '';

    // For Solana-based document signing, you would implement this differently
    // This is a placeholder function - implement according to your Solana program requirements
    console.log('Document hash to commit:', hex);
    
    // TODO: Implement Solana-based document hash commitment
    // This might involve creating a transaction to your Solana program
    // that stores the document hash on-chain
    
    return ''; // Return empty string for now
  } catch (err) {
    console.warn('commitDocumentHash error:', err);
    return '';
  }
}


