import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
import './MainContent.css';

const MainContent = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { connected, publicKey } = useWallet();

  const handleLogin = () => {
    console.log('Login clicked');
    // Add your login logic here
  };

  const handleRegister = () => {
    console.log('Register clicked');
    // Add your register logic here
  };

  const handleWalletConnect = () => {
    // Intentionally do nothing; the WalletMultiButton manages connect/disconnect
  };

  // Stay on homepage; allow user to browse while connected

  return (
    <div className="main-content">
      {/* Menu Bar */}
      <MenuBar />
      
      {/* Galaxy Background */}
      <div className="galaxy-section">
        <Galaxy 
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={240}
        />
      </div>
      
      {/* Main Content Overlay */}
      <div className="content-overlay">
        <div className="content-container">
          <h1 className="main-heading">
            Welcome to SolSign
          </h1>
          <p className="subtitle">
            Your gateway to decentralized authentication
          </p>
          
          <div className="auth-buttons">
            <WalletMultiButton 
              className="wallet-connect-button"
              onClick={handleWalletConnect}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContent;
