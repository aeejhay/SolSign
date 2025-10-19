import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
// Simple token balance function without complex imports
const SOLSIGN_TOKEN_CONFIG = {
  mintAddress: 'GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw',
  decimals: 9,
  symbol: 'SSIGN'
};

const formatTokenBalance = (balance, decimals) => {
  if (!balance || balance === 0) return '0';
  return (balance / Math.pow(10, decimals)).toFixed(4);
};
import './Wallet.css';

const Wallet = () => {
  const { publicKey, wallet, connected, disconnect } = useWallet();
  const [balance, setBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const { connection } = useConnection();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const fetchBalance = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenBalance = async () => {
    if (!publicKey || !connection) {
      setTokenBalance(0);
      setTokenLoading(false);
      return;
    }
    
    setTokenLoading(true);
    try {
      // Simple approach: try to get token accounts
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        mint: new (await import('@solana/web3.js')).PublicKey(SOLSIGN_TOKEN_CONFIG.mintAddress)
      });
      
      if (tokenAccounts.value.length > 0) {
        const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        setTokenBalance(accountInfo.value.amount);
      } else {
        setTokenBalance(0);
      }
    } catch (error) {
      console.log('Token balance fetch failed:', error.message);
      setTokenBalance(0);
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey && connection) {
      fetchBalance();
      // Add a longer delay and make token balance optional
      setTimeout(() => {
        fetchTokenBalance().catch(error => {
          console.log('Token balance fetch failed, continuing without it:', error);
        });
      }, 2000);
    } else {
      setBalance(0);
      setTokenBalance(0);
    }
  }, [connected, publicKey, connection]);

  const getExplorerUrl = (address) => {
    if (!address) return '';
    return `https://explorer.solana.com/address/${address}?cluster=devnet`;
  };

  return (
    <>
      <MenuBar />
      <div className="wallet-container">
        <Galaxy 
          className="wallet-galaxy-background"
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={240}
        />
        <div className="wallet-content-overlay">
          <div className="wallet-header">
            <h1>Wallet Dashboard</h1>
            <p>Manage your Solana wallet connection</p>
          </div>

          <div className="wallet-content">
          {connected ? (
            <div className="wallet-connected">
              <div className="wallet-info">
                <h2>Connected Wallet</h2>
                <div className="wallet-details">
                  <div className="wallet-item">
                    <span className="label">Wallet:</span>
                    <span className="value">{wallet?.adapter?.name || 'Unknown'}</span>
                  </div>
                  <div className="wallet-item">
                    <span className="label">Public Key:</span>
                    <span className="value">{formatAddress(publicKey?.toString())}</span>
                  </div>
                  <div className="wallet-item">
                    <span className="label">SOL Balance:</span>
                    <span className="value balance-value">
                      {loading ? (
                        <span className="loading-spinner">⏳</span>
                      ) : (
                        `${balance.toFixed(4)} SOL`
                      )}
                    </span>
                  </div>
                  <div className="wallet-item">
                    <span className="label">SOLSIGN Balance:</span>
                    <span className="value balance-value">
                      {tokenLoading ? (
                        <span className="loading-spinner">⏳</span>
                      ) : (
                        `${formatTokenBalance(tokenBalance || 0, SOLSIGN_TOKEN_CONFIG.decimals)} ${SOLSIGN_TOKEN_CONFIG.symbol}`
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="wallet-actions-section">
                  <div className="explorer-link-container">
                    <a 
                      href={getExplorerUrl(publicKey?.toString())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      🔍 View on Solana Explorer
                    </a>
                  </div>
                </div>
                
                <div className="wallet-actions">
                  <WalletDisconnectButton className="disconnect-button" />
                </div>
              </div>
            </div>
          ) : (
            <div className="wallet-disconnected">
              <div className="wallet-info">
                <h2>Connect Your Wallet</h2>
                <p>Connect your Solana wallet to access decentralized features</p>
                <div className="wallet-actions">
                  <WalletMultiButton className="connect-button" />
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Wallet;
