import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
import './Help.css';

const Help = () => {
  return (
    <>
      <MenuBar />
      <div className="help-container">
        <Galaxy 
          className="help-galaxy-background"
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={240}
        />
        <div className="help-content-overlay">
          <header className="help-header">
            <h1>About SolSign</h1>
            <p>Verification and authentication on Solana with signed, on-chain documents.</p>
          </header>

          <main className="help-content">
          <section className="help-section">
            <h2>Core Capabilities</h2>
            <ul className="help-list">
              <li>
                <strong>Authentication</strong> — Connect a wallet to authenticate users using cryptographic signatures.
              </li>
              <li>
                <strong>Verification</strong> — Verify identities and actions using Solana accounts and signed messages.
              </li>
              <li>
                <strong>Document Signing</strong> — Sign PDFs and record proofs on-chain for auditability.
              </li>
              <li>
                <strong>Mint to Chain</strong> — Anchor document hashes or mint them as NFTs for provenance.
              </li>
              <li>
                <strong>Tokenization (Roadmap)</strong> — Optional tokenization of signed assets for transfer and access control.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h2>How It Works</h2>
            <ol className="help-steps">
              <li>Connect your Solana wallet.</li>
              <li>Upload a document (e.g., PDF) and review its fingerprint (hash).</li>
              <li>Sign the document hash with your wallet.</li>
              <li>Record the signature on-chain; optionally mint a token/NFT that references the document.</li>
              <li>Share a verifiable link or token for independent verification.</li>
            </ol>
          </section>

          <section className="help-section">
            <h2>Why On-Chain?</h2>
            <p>
              Putting signatures and references on-chain establishes a tamper-evident audit trail. It lets
              anyone verify authenticity without exposing the full document, preserving privacy while ensuring
              integrity and provenance.
            </p>
          </section>

          <section className="help-section">
            <h2>Next Steps & Collaboration</h2>
            <p>
              We&apos;re agile and evolving. If you have requirements around notarization workflows, access control,
              multi-sig approvals, or enterprise attestations, let&apos;s collaborate on the design.
            </p>
          </section>
          </main>
        </div>
      </div>
    </>
  );
};

export default Help;


