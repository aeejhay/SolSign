import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
import './Profile.css';

const Profile = () => {
  const { publicKey, connected } = useWallet();
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showConsentMessage, setShowConsentMessage] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    walletAddress: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Update wallet address when publicKey changes
  useEffect(() => {
    if (publicKey) {
      setFormData(prev => ({
        ...prev,
        walletAddress: publicKey.toString()
      }));
    }
  }, [publicKey]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
        setSubmitMessage('✅ Verification data submitted successfully! We will review your information and contact you if needed.');
        setShowVerificationForm(false);
        setFormData({
          username: '',
          email: '',
          phone: '',
          walletAddress: publicKey ? publicKey.toString() : ''
        });
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
                    <span className="value verification-status">Not Verified</span>
                  </div>
                </div>

                {!showVerificationForm && !showConsentMessage && (
                  <div className="verification-section">
                    <h3>Identity Verification</h3>
                    <p>Verify your identity to access enhanced features and build trust within the SolSign community.</p>
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
                          {isSubmitting ? 'Submitting...' : 'Submit Verification'}
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

                {submitMessage && (
                  <div className={`submit-message ${submitMessage.includes('✅') ? 'success' : 'error'}`}>
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