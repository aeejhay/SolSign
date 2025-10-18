import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import './Wallet.css';

const Wallet = () => {
  const { publicKey, wallet, connected, disconnect } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(0);
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
                    <span className="label">Balance:</span>
                    <span className="value balance-value">
                      {loading ? (
                        <span className="loading-spinner">⏳</span>
                      ) : (
                        `${balance.toFixed(4)} SOL`
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
    </>
  );
};

export default Wallet;
