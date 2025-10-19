const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your preferred email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password' // Use App Password for Gmail
  }
});

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send verification code email
const sendVerificationCode = async (email, username, verificationCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@solsign.com',
      to: email,
      subject: 'SolSign Email Verification - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">🌌 SolSign</h1>
            <p style="color: #666; margin: 5px 0;">Decentralized Document Signing Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
            <h2 style="margin: 0 0 20px 0; font-size: 24px;">Email Verification Required</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">
              Hello ${username}!<br>
              Please verify your email address to complete your SolSign profile verification.
            </p>
            
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.8;">Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">
                ${verificationCode}
              </div>
              <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                This code expires in 15 minutes
              </p>
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.8;">
              Enter this code in the SolSign verification form to complete your profile setup.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3 style="color: #6366f1; margin: 0 0 15px 0;">🎁 Verification Reward</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              Complete your email verification to receive <strong>8 SOLSIGN tokens</strong> as a welcome reward!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <p style="margin: 0; color: #1976d2; font-size: 12px;">
              If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 SolSign. All rights reserved.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send verification success email with token reward info
const sendVerificationSuccess = async (email, username, tokenAmount) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@solsign.com',
      to: email,
      subject: '🎉 SolSign Verification Complete - Welcome to the Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">🌌 SolSign</h1>
            <p style="color: #666; margin: 5px 0;">Decentralized Document Signing Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
            <h2 style="margin: 0 0 20px 0; font-size: 24px;">🎉 Verification Complete!</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">
              Congratulations ${username}!<br>
              Your email has been successfully verified.
            </p>
            
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 20px;">🎁 Welcome Reward</h3>
              <div style="font-size: 28px; font-weight: bold; margin: 10px 0;">
                ${tokenAmount} SOLSIGN Tokens
              </div>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">
                Your tokens have been sent to your connected wallet!
              </p>
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.8;">
              You can now access all SolSign features including document signing and verification.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet" 
               style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Your Wallet
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 SolSign. All rights reserved.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Success email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send success email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendVerificationSuccess
};
