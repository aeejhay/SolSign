export async function commitDocumentHash(documentHash) {
  try {
    if (!documentHash) return '';
    // Expect a 64-char hex string. If not, bail gracefully.
    const hex = documentHash.startsWith('0x') ? documentHash.slice(2) : documentHash;
    if (hex.length !== 64) return '';

    // Lazy load ethers to keep bundle small.
    const { ethers } = await import('ethers');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Replace with your deployed contract details
    const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || '';
    const CONTRACT_ABI = (await import('../contracts/ContractArtifact.json').catch(() => ({ default: [] }))).default;
    if (!CONTRACT_ADDRESS || !CONTRACT_ABI?.length) return '';

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const tx = await contract.commitDocumentHash('0x' + hex);
    const receipt = await tx.wait();
    return receipt?.hash || tx?.hash || '';
  } catch (err) {
    console.warn('commitDocumentHash error:', err);
    return '';
  }
}


