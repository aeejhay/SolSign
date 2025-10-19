import { PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// SOLSIGN Token Configuration
export const SOLSIGN_TOKEN_CONFIG = {
  mintAddress: 'GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw',
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


