// set-metadata.js
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import {
  createMetadataAccountV3,
  updateMetadataAccountV2,
  findMetadataPda,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";

// ---- EDIT THESE ----
const RPC = "https://api.devnet.solana.com";
const MINT = "GCKTY2xJ1ZEvnEPnLLrLZXRvKyTr7uDQsq3NBATbDoCw";
const URI  = "https://adrianjandongan.me/solsign/metadata.json";
// --------------------

const KEYPAIR_PATH = "soul_adrian.json";

async function main() {
  const umi = createUmi(RPC);
  umi.use(mplTokenMetadata());

  // load keypair (your update authority / payer)
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8")));
  const kp = umi.eddsa.createKeypairFromSecretKey(secret);
  umi.use(keypairIdentity(kp));

  const mintPk = publicKey(MINT);
  const metadataPda = findMetadataPda(umi, { mint: mintPk });

  // Check account balance
  try {
    const balance = await umi.rpc.getBalance(kp.publicKey);
    console.log(`Account balance: ${balance / 1e9} SOL`);
    
    if (balance < 5000000) { // 0.005 SOL minimum
      console.error("Insufficient balance. Please fund the account with at least 0.005 SOL");
      console.error("You can get free SOL for devnet at: https://faucet.solana.com/");
      process.exit(1);
    }
  } catch (e) {
    console.error("Account not found or has no balance. Please fund the account with SOL");
    console.error("You can get free SOL for devnet at: https://faucet.solana.com/");
    console.error("Account address:", kp.publicKey);
    process.exit(1);
  }

  // Try to create first; if it already exists, update it
  try {
    const ix = createMetadataAccountV3(umi, {
      metadata: metadataPda,
      mint: mintPk,
      mintAuthority: kp.publicKey,
      payer: kp.publicKey,
      updateAuthority: kp.publicKey,
      data: {
        name: "SOLSIGN",
        symbol: "SSIGN",
        uri: URI,        // must be a publicly reachable JSON
        sellerFeeBasisPoints: 0, // fungible tokens usually 0
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    });
    const sig = await ix.sendAndConfirm(umi);
    console.log("Created metadata. Tx:", Buffer.from(sig.signature).toString("hex"));
  } catch (e) {
    console.log("Create failed (likely exists). Attempting update…", e.message || e);
    
    // Try to delete and recreate the metadata account
    try {
      // First, let's try to update with proper structure
      const ix = updateMetadataAccountV2(umi, {
        metadata: metadataPda,
        updateAuthority: kp.publicKey,
        data: {
          name: "SOLSIGN",
          symbol: "SSIGN", 
          uri: URI,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        primarySaleHappened: null,
        isMutable: true,
        newUpdateAuthority: null,
      });
      const sig = await ix.sendAndConfirm(umi);
      console.log("Updated metadata. Tx:", Buffer.from(sig.signature).toString("hex"));
    } catch (updateError) {
      console.error("Update failed:", updateError.message);
      console.log("Metadata account may need to be recreated. The existing account has empty data.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
