import { Link, useLocation } from 'react-router-dom';
import './MenuBar.css';
import { useWallet } from '@solana/wallet-adapter-react';
import logo from '../assets/solsignlogo.png'; // Import your logo

const MenuBar = () => {
  const location = useLocation();
  const { connected } = useWallet();

  const handleHelpClick = () => {
    console.log('Help clicked');
    // Add your help logic here
  };

  return (
    <nav className="menu-bar">
      <div className="menu-container">
        <div className="logo-section">
          <Link to="/" className="logo-link">
            <div className="logo">
              <img src={logo} alt="SolSign Logo" className="logo-image" />
              <span className="logo-text">SolSign</span>
            </div>
          </Link>
        </div>
        
        <div className="nav-links">
          <Link 
            to="/wallet" 
            className={`nav-link ${location.pathname === '/wallet' ? 'active' : ''}`}
          >
            Wallet
          </Link>
          {connected && (
            <Link 
              to="/sign" 
              className={`nav-link ${location.pathname === '/sign' ? 'active' : ''}`}
            >
              Sign
            </Link>
          )}
          <Link 
            to="/help" 
            className={`nav-link ${location.pathname === '/help' ? 'active' : ''}`}
          >
            Help
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MenuBar;
