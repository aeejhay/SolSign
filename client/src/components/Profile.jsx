import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
import './Profile.css';

const Profile = () => {
  const { publicKey, connected } = useWallet();
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showConsentMessage, setShowConsentMessage] = useState(false);
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    walletAddress: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('not_verified');
  const [transactionInfo, setTransactionInfo] = useState(null);

  // Update wallet address when publicKey changes
  useEffect(() => {
    if (publicKey) {
      setFormData(prev => ({
        ...prev,
        walletAddress: publicKey.toString()
      }));
    }
  }, [publicKey]);

  // Check verification status when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkVerificationStatus();
    }
  }, [connected, publicKey]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch(`/api/profile/status/${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.status);
        if (data.transactionSignature) {
          setTransactionInfo({
            signature: data.transactionSignature,
            explorerUrl: data.explorerUrl,
            rewardAmount: data.rewardAmount
          });
        }
      }
    } catch (error) {
      console.log('No verification record found or error checking status');
    }
  };

  const handleVerifyClick = () => {
    setShowConsentMessage(true);
  };

  const handleConsentAccept = () => {
    if (consentGiven) {
      setShowConsentMessage(false);
      setShowVerificationForm(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    setVerificationCode(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/profile/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: publicKey ? publicKey.toString() : '',
          consentGiven: true
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage('✅ Verification code sent to your email! Please check your inbox and enter the 6-digit code below.');
        setShowVerificationForm(false);
        setShowCodeVerification(true);
        setVerificationStatus('code_sent');
      } else {
        setSubmitMessage(`❌ Error: ${result.message || 'Failed to submit verification data'}`);
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      setSubmitMessage('❌ Error: Failed to submit verification data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeVerification = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setSubmitMessage('❌ Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifyingCode(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/profile/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode,
          walletAddress: publicKey ? publicKey.toString() : ''
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage('🎉 Email verification successful! Welcome to SolSign! 8 SOLSIGN tokens have been sent to your wallet as a welcome reward!');
        setShowCodeVerification(false);
        setVerificationStatus('verified');
        setVerificationCode('');
        setFormData({
          username: '',
          email: '',
          phone: '',
          walletAddress: publicKey ? publicKey.toString() : ''
        });
        
        // Store transaction info if available
        if (result.transactionSignature) {
          setTransactionInfo({
            signature: result.transactionSignature,
            explorerUrl: result.explorerUrl,
            rewardAmount: result.rewardAmount
          });
        }
      } else {
        setSubmitMessage(`❌ Error: ${result.message || 'Failed to verify code'}`);
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setSubmitMessage('❌ Error: Failed to verify code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/profile/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey ? publicKey.toString() : ''
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage('✅ New verification code sent to your email!');
      } else {
        setSubmitMessage(`❌ Error: ${result.message || 'Failed to resend code'}`);
      }
    } catch (error) {
      console.error('Error resending code:', error);
      setSubmitMessage('❌ Error: Failed to resend code. Please try again.');
    } finally {
      setIsResendingCode(false);
    }
  };

  const getStatusDisplay = () => {
    switch (verificationStatus) {
      case 'verified':
        return <span className="verification-status verified">✅ Verified</span>;
      case 'code_sent':
        return <span className="verification-status pending">📧 Code Sent</span>;
      case 'pending':
        return <span className="verification-status pending">⏳ Pending</span>;
      default:
        return <span className="verification-status not-verified">❌ Not Verified</span>;
    }
  };

  if (!connected) {
    return (
      <>
        <MenuBar />
        <div className="profile-container">
          <Galaxy 
            className="profile-galaxy-background"
            mouseRepulsion={true}
            mouseInteraction={true}
            density={1.5}
            glowIntensity={0.5}
            saturation={0.8}
            hueShift={240}
          />
          <div className="profile-content-overlay">
            <div className="profile-header">
              <h1>Profile</h1>
              <p>Connect your wallet to access your profile</p>
            </div>
            <div className="profile-content">
              <div className="profile-disconnected">
                <div className="profile-info">
                  <h2>Wallet Not Connected</h2>
                  <p>Please connect your Solana wallet to access your profile and verification features.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MenuBar />
      <div className="profile-container">
        <Galaxy 
          className="profile-galaxy-background"
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={240}
        />
        <div className="profile-content-overlay">
          <div className="profile-header">
            <h1>Profile</h1>
            <p>Manage your account and verification status</p>
          </div>

          <div className="profile-content">
            <div className="profile-connected">
              <div className="profile-info">
                <h2>Your Profile</h2>
                <div className="profile-details">
                  <div className="profile-item">
                    <span className="label">Wallet Address:</span>
                    <span className="value">{formatAddress(publicKey?.toString())}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">Verification Status:</span>
                    {getStatusDisplay()}
                  </div>
                </div>

                {verificationStatus === 'verified' && (
                  <div className="verification-success">
                    <h3>🎉 Verification Complete!</h3>
                    <p>Your email has been verified and you've received 8 SOLSIGN tokens as a welcome reward!</p>
                    <div className="reward-info">
                      <span className="reward-amount">8 SOLSIGN</span>
                      <span className="reward-text">Welcome Reward</span>
                    </div>
                    
                    {transactionInfo && (
                      <div className="transaction-info">
                        <h4>🔗 Transaction Details</h4>
                        <div className="transaction-details">
                          <div className="transaction-item">
                            <span className="label">Transaction ID:</span>
                            <span className="value">{transactionInfo.signature.slice(0, 8)}...{transactionInfo.signature.slice(-8)}</span>
                          </div>
                          <div className="transaction-item">
                            <span className="label">Amount:</span>
                            <span className="value">{transactionInfo.rewardAmount} SOLSIGN</span>
                          </div>
                          <div className="transaction-actions">
                            <a 
                              href={transactionInfo.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="explorer-link"
                            >
                              🔍 View on Solana Explorer
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {verificationStatus !== 'verified' && !showVerificationForm && !showConsentMessage && !showCodeVerification && (
                  <div className="verification-section">
                    <h3>Identity Verification</h3>
                    <p>Verify your email address to access enhanced features and receive 8 SOLSIGN tokens as a welcome reward!</p>
                    <div className="reward-preview">
                      <span className="reward-icon">🎁</span>
                      <span className="reward-text">Get 8 SOLSIGN tokens upon verification</span>
                    </div>
                    <button 
                      className="verify-button"
                      onClick={handleVerifyClick}
                    >
                      I want to verify myself
                    </button>
                  </div>
                )}

                {showConsentMessage && (
                  <div className="consent-message">
                    <h3>Data Collection Consent</h3>
                    <div className="consent-text">
                      <p>
                        <strong>Important:</strong> When you start the verification process, we will gather information such as your username, wallet address, email, and phone number. This data will be securely stored in our database.
                      </p>
                      <p>
                        <strong>GDPR Compliance:</strong> We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR). Your personal data will be:
                      </p>
                      <ul>
                        <li>Processed lawfully, fairly, and transparently</li>
                        <li>Collected only for specified verification purposes</li>
                        <li>Minimized to only necessary information</li>
                        <li>Securely stored with appropriate technical measures</li>
                        <li>Retained only as long as necessary</li>
                      </ul>
                      <p>
                        <strong>Your Rights:</strong> You have the right to access, rectify, or erase your data at any time. You can withdraw your consent at any time by contacting us.
                      </p>
                    </div>
                    <div className="consent-checkbox">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={consentGiven}
                          onChange={(e) => setConsentGiven(e.target.checked)}
                        />
                        I agree to the collection and processing of my personal data as described above
                      </label>
                    </div>
                    <div className="consent-actions">
                      <button 
                        className="consent-accept-button"
                        onClick={handleConsentAccept}
                        disabled={!consentGiven}
                      >
                        Accept and Continue
                      </button>
                      <button 
                        className="consent-cancel-button"
                        onClick={() => {
                          setShowConsentMessage(false);
                          setConsentGiven(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showVerificationForm && (
                  <div className="verification-form">
                    <h3>Verification Form</h3>
                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label htmlFor="username">Username *</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter your username"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="email">Email Address *</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter your email address"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Enter your phone number (optional)"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="walletAddress">Wallet Address</label>
                        <input
                          type="text"
                          id="walletAddress"
                          name="walletAddress"
                          value={formData.walletAddress}
                          readOnly
                          className="readonly-field"
                        />
                        <small>This is automatically filled from your connected wallet</small>
                      </div>

                      <div className="form-actions">
                        <button 
                          type="submit" 
                          className="submit-button"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                        <button 
                          type="button" 
                          className="cancel-button"
                          onClick={() => {
                            setShowVerificationForm(false);
                            setFormData({
                              username: '',
                              email: '',
                              phone: '',
                              walletAddress: publicKey ? publicKey.toString() : ''
                            });
                          }}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {showCodeVerification && (
                  <div className="code-verification-form">
                    <h3>Email Verification</h3>
                    <p>Enter the 6-digit verification code sent to your email address.</p>
                    <form onSubmit={handleCodeVerification}>
                      <div className="form-group">
                        <label htmlFor="verificationCode">Verification Code *</label>
                        <input
                          type="text"
                          id="verificationCode"
                          name="verificationCode"
                          value={verificationCode}
                          onChange={handleCodeChange}
                          required
                          placeholder="Enter 6-digit code"
                          maxLength="6"
                          className="code-input"
                        />
                      </div>

                      <div className="form-actions">
                        <button 
                          type="submit" 
                          className="submit-button"
                          disabled={isVerifyingCode || verificationCode.length !== 6}
                        >
                          {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button 
                          type="button" 
                          className="resend-button"
                          onClick={handleResendCode}
                          disabled={isResendingCode}
                        >
                          {isResendingCode ? 'Resending...' : 'Resend Code'}
                        </button>
                        <button 
                          type="button" 
                          className="cancel-button"
                          onClick={() => {
                            setShowCodeVerification(false);
                            setVerificationCode('');
                            setVerificationStatus('not_verified');
                          }}
                          disabled={isVerifyingCode}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {submitMessage && (
                  <div className={`submit-message ${submitMessage.includes('✅') || submitMessage.includes('🎉') ? 'success' : 'error'}`}>
                    {submitMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;