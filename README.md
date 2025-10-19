# 🌌 SolSign - Decentralized Document Signing Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-purple.svg)](https://solana.com/)

SolSign is a cutting-edge decentralized document signing platform built on the Solana blockchain. It combines traditional document signing with blockchain technology to provide secure, verifiable, and tamper-proof document authentication.

## ✨ Features

### 🔐 **Wallet Integration**
- **Multi-Wallet Support**: Connect with Phantom, Solflare, and other Solana wallets
- **Real-time Balance**: Live SOL balance display with automatic updates
- **Network Flexibility**: Devnet for testing, easily configurable for Mainnet
- **Secure Authentication**: Cryptographic signature-based user authentication

### 📄 **Document Signing**
- **PDF Support**: Upload and sign PDF documents with multiple signature types
- **Signature Options**: 
  - Hand-drawn signatures with canvas
  - Image-based signatures (PNG/JPEG)
  - Typed text signatures with custom fonts
- **Interactive Placement**: Drag-and-drop signature positioning
- **Multi-page Support**: Sign documents across multiple pages
- **Real-time Preview**: Live preview of signature placement

### 🎯 **User Verification System**
- **Email Verification**: Secure 6-digit code verification
- **Profile Management**: Complete user profile with wallet integration
- **Token Rewards**: Automatic SOLSIGN token distribution upon verification
- **Rate Limiting**: Built-in protection against spam and abuse

### 🎨 **Modern UI/UX**
- **Galaxy Background**: Interactive 3D galaxy visualization with mouse interaction
- **Glassmorphism Design**: Modern glass-like UI components
- **Responsive Layout**: Optimized for desktop and mobile devices
- **Smooth Animations**: Framer Motion powered transitions
- **Dark Theme**: Elegant dark color scheme

### 🔒 **Security Features**
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds for password security
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation and sanitization
- **CORS Protection**: Configurable cross-origin resource sharing

## 🏗️ Architecture

### **Frontend (React + Vite)**
```
client/
├── src/
│   ├── components/          # React components
│   │   ├── MainContent.jsx  # Home page with wallet connection
│   │   ├── Wallet.jsx       # Wallet dashboard
│   │   ├── Sign.jsx         # Document signing interface
│   │   ├── Profile.jsx      # User profile management
│   │   ├── Help.jsx         # Help and documentation
│   │   └── MenuBar.jsx      # Navigation component
│   ├── contexts/            # React contexts
│   │   └── WalletContext.jsx # Solana wallet context
│   ├── utils/               # Utility functions
│   │   └── web3.js          # Solana Web3 utilities
│   └── assets/              # Static assets
```

### **Backend (Node.js + Express)**
```
server/
├── routes/                  # API routes
│   ├── auth.js             # Authentication endpoints
│   ├── sign.js             # Document signing endpoints
│   └── profile.js          # Profile verification endpoints
├── services/               # Business logic services
│   ├── emailService.js     # Email verification service
│   └── tokenTransferService.js # Solana token transfers
├── config/                 # Configuration files
│   └── database.js         # MySQL database configuration
└── middleware/             # Express middleware
    └── auth.js             # JWT authentication middleware
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Solana wallet (Phantom/Solflare)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aeejhay/SolSign.git
   cd SolSign
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   ```bash
   cp env-template.txt .env
   ```
   
   Configure your `.env` file:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=solsign_db
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   
   # Email Configuration (Gmail)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Solana Configuration
   SOLANA_RPC_URL=https://api.devnet.solana.com
   SOLANA_NETWORK=devnet
   
   # Client URL
   CLIENT_URL=http://localhost:5173
   ```

4. **Database Setup**
   - Create MySQL database: `solsign_db`
   - Tables will be created automatically on first run

5. **Start the application**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend development server on `http://localhost:5173`

## 📱 Usage Guide

### 1. **Connect Your Wallet**
- Visit the home page
- Click "Connect your Wallet"
- Select your preferred Solana wallet
- Approve the connection

### 2. **Verify Your Profile**
- Navigate to the Profile page
- Fill in your verification details
- Check your email for the verification code
- Enter the code to complete verification
- Receive 8 SOLSIGN tokens as a welcome reward

### 3. **Sign Documents**
- Go to the Sign page
- Upload a PDF document
- Choose your signature type (draw, image, or text)
- Position your signature on the document
- Submit to sign and get the signed PDF

### 4. **View Your Wallet**
- Check your SOL balance
- View your SOLSIGN token balance
- Access Solana Explorer links
- Manage your wallet connection

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Document Signing
- `POST /api/sign-document` - Sign PDF document

### Profile Verification
- `POST /api/profile/verify` - Submit verification data
- `POST /api/profile/verify-code` - Verify email code
- `POST /api/profile/resend-code` - Resend verification code
- `GET /api/profile/status/:walletAddress` - Check verification status

### Health Check
- `GET /api/health` - API health status

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start both client and server
npm run server       # Start server only
npm run client       # Start client only
npm run build        # Build for production
npm run start        # Start production server
```

### Technology Stack

**Frontend:**
- React 19+ with Hooks
- Vite for fast development
- Solana Web3.js for blockchain interaction
- Framer Motion for animations
- CSS3 with modern features

**Backend:**
- Node.js with Express
- MySQL with connection pooling
- JWT for authentication
- bcrypt for password hashing
- Nodemailer for email services

**Blockchain:**
- Solana Devnet/Mainnet
- SPL Token transfers
- Wallet Adapter integration

## 🔐 Security Considerations

- **Private Keys**: Never stored or transmitted
- **Password Security**: Hashed with bcrypt and salt
- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All user inputs validated and sanitized
- **CORS**: Configurable cross-origin policies
- **Environment Variables**: Sensitive data in environment variables

## 🌐 Network Configuration

### Devnet (Default)
- RPC URL: `https://api.devnet.solana.com`
- Explorer: `https://explorer.solana.com/?cluster=devnet`
- Test tokens available from faucets

### Mainnet (Production)
- RPC URL: `https://api.mainnet-beta.solana.com`
- Explorer: `https://explorer.solana.com/`
- Real SOL and tokens required

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Verifications Table
```sql
CREATE TABLE user_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  verification_status ENUM('pending', 'code_sent', 'verified'),
  verification_code VARCHAR(6),
  tokens_rewarded BOOLEAN DEFAULT FALSE,
  transaction_signature VARCHAR(88),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎁 Token Economics

- **Welcome Reward**: 8 SOLSIGN tokens for email verification
- **Token Symbol**: SSIGN
- **Decimals**: 9
- **Network**: Solana Devnet/Mainnet
- **Mint Address**: `GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the Help page in the application
- **Issues**: Report bugs via GitHub Issues
- **Email**: Contact support through the application

## 🔮 Roadmap

- [ ] **NFT Integration**: Mint signed documents as NFTs
- [ ] **Multi-signature Support**: Collaborative document signing
- [ ] **Template System**: Pre-built document templates
- [ ] **Advanced Analytics**: Document signing analytics
- [ ] **Mobile App**: Native mobile application
- [ ] **Enterprise Features**: Team management and permissions

## 🙏 Acknowledgments

- Solana Foundation for the blockchain infrastructure
- React and Vite teams for the frontend framework
- Express.js for the backend framework
- All open-source contributors

---

**Built with ❤️ for the decentralized future**

*SolSign - Where documents meet blockchain security*