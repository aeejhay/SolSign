import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import MenuBar from './MenuBar';
import './Sign.css';

// Lazy import to avoid bundling weight until needed
let pdfjsLib;
let interactInstance;

const Sign = () => {
  const { connected } = useWallet();

  // Core state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageCanvases, setPageCanvases] = useState({});

  // Signature state
  const [signatureType, setSignatureType] = useState('drawn'); // 'drawn' | 'image' | 'text'
  const [signatureImageBlob, setSignatureImageBlob] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [typedFont, setTypedFont] = useState('Georgia');

  // Placement state in canvas pixels
  const [placement, setPlacement] = useState({ x: 40, y: 40, width: 160, height: 60 });
  const [signaturePage, setSignaturePage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Refs
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const pdfContainerRef = useRef(null);

  // Load libs on demand
  useEffect(() => {
    (async () => {
      if (!pdfjsLib) {
        const mod = await import('pdfjs-dist/build/pdf');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        mod.GlobalWorkerOptions.workerSrc = workerSrc.default;
        pdfjsLib = mod;
      }
      if (!interactInstance) {
        const i = await import('interactjs');
        interactInstance = i.default || i;
      }
    })();
  }, []);

  const isPdf = useMemo(() => {
    return pdfFile?.type === 'application/pdf' || pdfName.toLowerCase().endsWith('.pdf');
  }, [pdfFile, pdfName]);

  const handlePdfChange = async (e) => {
    const f = e.target.files?.[0];
    setError('');
    setTxHash('');
    if (!f) return;
    setPdfFile(f);
    setPdfName(f.name);
  };

  // Render PDF pages
  useEffect(() => {
    const render = async () => {
      if (!pdfFile || !pdfjsLib) return;
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        
        // Render all pages
        const canvases = {};
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          canvases[pageNum] = canvas;
        }
        setPageCanvases(canvases);
      } catch (err) {
        console.error(err);
        setError('Failed to render PDF');
      }
    };
    render();
  }, [pdfFile]);

  // Initialize drag/resize for overlay
  useEffect(() => {
    if (!interactInstance || !overlayRef.current || !pdfContainerRef.current) return;
    const el = overlayRef.current;
    const parent = pdfContainerRef.current;
    const destroyers = [];

    destroyers.push(
      interactInstance(el)
        .draggable({
          inertia: false,
          modifiers: [
            interactInstance.modifiers.restrictRect({ restriction: parent, endOnly: true })
          ],
          listeners: {
            move(event) {
              const { dx, dy } = event;
              setPlacement((p) => ({ ...p, x: Math.max(0, p.x + dx), y: Math.max(0, p.y + dy) }));
            }
          }
        })
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          listeners: {
            move(event) {
              const { width, height, deltaRect } = event.rect;
              setPlacement((p) => ({
                x: p.x + (deltaRect.left || 0),
                y: p.y + (deltaRect.top || 0),
                width: Math.max(20, width),
                height: Math.max(20, height)
              }));
            }
          },
          modifiers: [
            interactInstance.modifiers.restrictSize({ min: { width: 40, height: 20 } })
          ]
        })
    );

    return () => {
      destroyers.forEach((d) => d && d.unset && d.unset());
    };
  }, [interactInstance, currentPage]);

  // Basic drawing on a small canvas to create signature image when in 'drawn'
  useEffect(() => {
    if (signatureType !== 'drawn') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    };

    const onDown = (e) => { drawing = true; const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const onMove = (e) => { if (!drawing) return; const { x, y } = getPos(e); ctx.lineTo(x, y); ctx.stroke(); };
    const onUp = () => { drawing = false; };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown);
    canvas.addEventListener('touchmove', onMove);
    canvas.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [signatureType]);

  const exportDrawnToBlob = useCallback(async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  const exportTypedToBlob = useCallback(async () => {
    if (!typedText) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'transparent';
    // Draw white background transparent by not filling
    ctx.fillStyle = '#111';
    ctx.font = `48px ${typedFont}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText, 20, canvas.height / 2);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, [typedText, typedFont]);

  const onSignatureImageUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSignatureImageBlob(f);
  };

  const prepareSignatureBlob = useCallback(async () => {
    if (signatureType === 'drawn') return await exportDrawnToBlob();
    if (signatureType === 'image') return signatureImageBlob;
    if (signatureType === 'text') return await exportTypedToBlob();
    return null;
  }, [signatureType, signatureImageBlob, exportDrawnToBlob, exportTypedToBlob]);

  const handleSubmit = async () => {
    if (!pdfFile) { setError('Please upload a PDF'); return; }
    setError('');
    setIsSubmitting(true);
    setTxHash('');
    try {
      const sigBlob = await prepareSignatureBlob();
      if (!sigBlob) throw new Error('Please provide a signature');

      const form = new FormData();
      form.append('pdf', pdfFile);
      form.append('signatureType', signatureType);
      if (signatureType === 'text') {
        form.append('signatureText', typedText);
      } else {
        form.append('signatureImage', new File([sigBlob], 'signature.png', { type: 'image/png' }));
      }
      form.append('pageNumber', String(signaturePage));
      form.append('placement', JSON.stringify(placement));

      const res = await fetch('/api/sign-document', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Failed to sign document');
      const data = await res.json();

      // Optional: commit hash on-chain
      try {
        const { commitDocumentHash } = await import('../utils/web3');
        const tx = await commitDocumentHash(data.sha256);
        setTxHash(tx || '');
      } catch (chainErr) {
        console.warn('On-chain commit skipped/failed:', chainErr);
      }

      // Offer download
      if (data.signedPdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.signedPdfBase64}`;
        link.download = pdfName.replace(/\.pdf$/i, '') + '.signed.pdf';
        link.click();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <MenuBar />
      <div className="sign-container">
        <header className="sign-header">
          <h1>Sign a Document</h1>
          <p>Upload a PDF, place your signature, and securely finalize.</p>
        </header>

        {!connected ? (
          <div className="sign-gate">
            <p>Please connect your wallet to continue.</p>
            <WalletMultiButton className="connect-button" />
          </div>
        ) : (
          <main className="sign-content two-column">
            <section className="left-panel">
              <label className="file-label" htmlFor="pdf-input">Choose PDF</label>
              <input id="pdf-input" type="file" accept="application/pdf,.pdf" onChange={handlePdfChange} />

              {totalPages > 0 && (
                <div className="page-navigation">
                  <button 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}

              <div className="pdf-viewer" ref={pdfContainerRef} style={{ position: 'relative' }}>
                {pageCanvases[currentPage] && (
                  <div 
                    style={{ 
                      position: 'relative',
                      display: 'inline-block'
                    }}
                  >
                    <img 
                      src={pageCanvases[currentPage].toDataURL()} 
                      alt={`PDF page ${currentPage}`}
                      style={{ display: 'block' }}
                    />
                    {pdfFile && signatureImageBlob && (
                      <div
                        ref={overlayRef}
                        className="signature-overlay"
                        style={{
                          position: 'absolute',
                          left: placement.x,
                          top: placement.y,
                          width: placement.width,
                          height: placement.height,
                          outline: '2px dashed #4f46e5',
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          backgroundImage: `url(${URL.createObjectURL(signatureImageBlob)})`,
                          cursor: 'move'
                        }}
                        title="Drag/resize to position your signature"
                      />
                    )}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="signature-page-selector">
                  <label>Place signature on page:</label>
                  <select 
                    value={signaturePage} 
                    onChange={(e) => {
                      setSignaturePage(Number(e.target.value));
                      setCurrentPage(Number(e.target.value));
                    }}
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            <section className="right-panel">
              <div className="signature-tabs">
                <div className="tab-buttons">
                  <button className={signatureType === 'drawn' ? 'active' : ''} onClick={() => setSignatureType('drawn')}>Draw</button>
                  <button className={signatureType === 'image' ? 'active' : ''} onClick={() => setSignatureType('image')}>Upload</button>
                  <button className={signatureType === 'text' ? 'active' : ''} onClick={() => setSignatureType('text')}>Type</button>
                </div>

                {signatureType === 'drawn' && (
                  <div className="tab-panel">
                    <canvas ref={drawCanvasRef} width={500} height={200} className="draw-canvas" />
                    <div className="row">
                      <button onClick={async () => setSignatureImageBlob(await exportDrawnToBlob())}>Use Drawing</button>
                      <button onClick={() => { const c = drawCanvasRef.current; const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); setSignatureImageBlob(null); }}>Clear</button>
                    </div>
                  </div>
                )}

                {signatureType === 'image' && (
                  <div className="tab-panel">
                    <input type="file" accept="image/png,image/jpeg" onChange={onSignatureImageUpload} />
                    <p className="hint">Prefer transparent PNG for best results.</p>
                </div>
              )}

                {signatureType === 'text' && (
                  <div className="tab-panel">
                    <input type="text" placeholder="Type your name" value={typedText} onChange={(e) => setTypedText(e.target.value)} />
                    <select value={typedFont} onChange={(e) => setTypedFont(e.target.value)}>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Courier New</option>
                    </select>
                    <button onClick={async () => setSignatureImageBlob(await exportTypedToBlob())}>Use Typed</button>
                </div>
              )}

              <div className="actions">
                  <button className="primary-button" onClick={handleSubmit} disabled={!pdfFile || isSubmitting}>
                    {isSubmitting ? 'Signing…' : 'Securely Sign & Commit'}
                </button>
                </div>

                {error && <div className="status-text error">{error}</div>}
                {txHash && <div className="status-text">Tx: {txHash}</div>}
            </div>
            </section>
          </main>
        )}
      </div>
    </>
  );
};

export default Sign;
