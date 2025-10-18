import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import fs from "fs";

const RPC = "https://api.devnet.solana.com";
const KEYPAIR_PATH = "soul_adrian.json";

// ---- EDIT THESE ----
const MINT_ADDRESS = "GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw"; // Your SOLSIGN token mint
const RECIPIENT_ADDRESS = "Dje13XdS1rgw4t9PLtQZCDaZJfqsE8y5xNiuadMcGqK9"; // Replace with the address you want to send to
const AMOUNT_TO_SEND = 888888000000000; // Amount in smallest units (1,000,000 = 1 token with 9 decimals)
// --------------------

async function main() {
  console.log("📤 SOLSIGN Token Transfer Script");
  console.log("=================================");
  
  // Create connection
  const connection = new Connection(RPC, 'confirmed');
  
  // Load your keypair
  const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
  const sender = Keypair.fromSecretKey(new Uint8Array(secret));
  
  console.log("Sender wallet:", sender.publicKey.toString());
  console.log("Recipient address:", RECIPIENT_ADDRESS);
  console.log("Token mint:", MINT_ADDRESS);
  
  try {
    // Get the recipient's public key
    const recipientPubkey = new PublicKey(RECIPIENT_ADDRESS);
    
    // Get associated token addresses
    const senderTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(MINT_ADDRESS),
      sender.publicKey
    );
    
    const recipientTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(MINT_ADDRESS),
      recipientPubkey
    );
    
    console.log("\nToken Accounts:");
    console.log("Sender token account:", senderTokenAccount.toString());
    console.log("Recipient token account:", recipientTokenAccount.toString());
    
    // Check sender's balance
    const senderAccountInfo = await getAccount(connection, senderTokenAccount);
    console.log("\nSender's current balance:", Number(senderAccountInfo.amount) / Math.pow(10, 9), "SOLSIGN tokens");
    
    if (Number(senderAccountInfo.amount) < AMOUNT_TO_SEND) {
      console.log("❌ Insufficient balance!");
      console.log("Available:", Number(senderAccountInfo.amount) / Math.pow(10, 9), "tokens");
      console.log("Trying to send:", AMOUNT_TO_SEND / Math.pow(10, 9), "tokens");
      return;
    }
    
    // Check if recipient token account exists, if not create it
    let recipientAccountExists = false;
    try {
      await getAccount(connection, recipientTokenAccount);
      recipientAccountExists = true;
      console.log("✅ Recipient token account exists");
    } catch (error) {
      console.log("💡 Recipient doesn't have a token account yet. Creating one...");
      recipientAccountExists = false;
    }
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add instruction to create recipient's token account if it doesn't exist
    if (!recipientAccountExists) {
      console.log("Adding instruction to create recipient's token account...");
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        sender.publicKey,        // payer
        recipientTokenAccount,   // ata
        recipientPubkey,         // owner
        new PublicKey(MINT_ADDRESS) // mint
      );
      transaction.add(createATAInstruction);
    }
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,      // source
      recipientTokenAccount,   // destination
      sender.publicKey,        // owner
      AMOUNT_TO_SEND           // amount
    );
    
    transaction.add(transferInstruction);
    
    console.log("\n🚀 Sending transaction...");
    const signature = await connection.sendTransaction(transaction, [sender]);
    await connection.confirmTransaction(signature);
    
    console.log("✅ Transfer successful!");
    console.log("Transaction signature:", signature);
    console.log("Amount sent:", AMOUNT_TO_SEND / Math.pow(10, 9), "SOLSIGN tokens");
    console.log("Recipient:", RECIPIENT_ADDRESS);
    
    // Check new balances
    const newSenderBalance = await getAccount(connection, senderTokenAccount);
    console.log("\nNew sender balance:", Number(newSenderBalance.amount) / Math.pow(10, 9), "SOLSIGN tokens");
    
  } catch (error) {
    console.error("❌ Transfer failed:", error.message);
    
    if (error.message.includes("TokenAccountNotFoundError")) {
      console.log("💡 The recipient doesn't have a token account for this token yet.");
      console.log("You may need to create one first, or the recipient needs to add this token to their wallet.");
    }
  }
}

main().catch(console.error);
