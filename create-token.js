import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import {
  createMetadataAccountV3,
  findMetadataPda,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner } from "@metaplex-foundation/umi";
import pkg from "@metaplex-foundation/mpl-toolbox";
const { createMint, mintTo, createTokenAccount } = pkg;
import fs from "fs";

const RPC = "https://api.devnet.solana.com";
const URI = "https://adrianjandongan.me/solsign/metadata.json";
const KEYPAIR_PATH = "soul_adrian.json";

async function main() {
  const umi = createUmi(RPC);
  umi.use(mplTokenMetadata());

  // load keypair
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8")));
  const kp = umi.eddsa.createKeypairFromSecretKey(secret);
  umi.use(keypairIdentity(kp));

  console.log("Creating new token mint...");
  console.log("Your wallet address:", kp.publicKey);

  // Create a new mint with 88,888,888 supply
  const mint = generateSigner(umi);
  const decimals = 9;
  const totalSupply = 88888888 * Math.pow(10, decimals); // 88,888,888 tokens with 9 decimals

  console.log("Creating mint...");
  await createMint(umi, {
    mint,
    decimals,
    mintAuthority: kp.publicKey,
  });

  console.log("New mint created:", mint.publicKey);
  console.log("Total supply: 88,888,888 tokens (will be minted after metadata creation)");

  console.log("✅ Token mint created successfully!");
  console.log("New mint address:", mint.publicKey);
  console.log("Mint authority:", kp.publicKey);
  
  console.log("\n📝 Next steps:");
  console.log("1. Update set-metadata.js with the new mint address:", mint.publicKey);
  console.log("2. Run the metadata update script");
  console.log("3. Mint the 88,888,888 tokens");

}

main().catch(console.error);
