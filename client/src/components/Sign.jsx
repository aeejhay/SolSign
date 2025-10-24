import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import MenuBar from './MenuBar';
import Galaxy from './Galaxy';
import './Sign.css';

// Lazy import to avoid bundling weight until needed
let pdfjsLib;
let interactInstance;
let QRCode;
let PDFLib;

const Sign = () => {
  const { connected, wallet } = useWallet();

  // Core state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageCanvases, setPageCanvases] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);

  // Signature state
  const [signatureType, setSignatureType] = useState('drawn'); // 'drawn' | 'image' | 'text'
  const [signatureImageBlob, setSignatureImageBlob] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [typedFont, setTypedFont] = useState('Georgia');

  // Element placement state
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Digital proof state
  const [docHash, setDocHash] = useState('');
  const [digitalProof, setDigitalProof] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Blockchain state
  const [ssignAmount, setSsignAmount] = useState(1); // Amount of SSIGN to deduct
  const [ssignBalance, setSsignBalance] = useState(0); // User's SSIGN balance
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Elements, 3: Submit, 4: Export

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
      if (!QRCode) {
        const qr = await import('qrcode');
        QRCode = qr.default || qr;
      }
      if (!PDFLib) {
        const pdf = await import('pdf-lib');
        PDFLib = pdf.PDFDocument;
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
    await processPdfFile(f);
  };

  const processPdfFile = async (file) => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file');
      return;
    }
    
    setPdfFile(file);
    setPdfName(file.name);
    setCurrentStep(2);
    setElements([]);
    setDocHash('');
    setDigitalProof(null);
    setQrCodeDataUrl('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(f => f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFile) {
      await processPdfFile(pdfFile);
    } else {
      setError('Please drop a valid PDF file');
    }
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

  // Initialize drag/resize for elements
  useEffect(() => {
    if (!interactInstance || !pdfContainerRef.current) return;
    
    const destroyers = [];
    const container = pdfContainerRef.current;
    
    // Small delay to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      // Make all element overlays draggable and resizable
      elements.forEach(element => {
        const elementEl = document.querySelector(`[data-element-id="${element.id}"]`);
        if (!elementEl) return;
        
        const destroyer = interactInstance(elementEl)
        .draggable({
          inertia: false,
          modifiers: [
              interactInstance.modifiers.restrictRect({ 
                restriction: container, 
                endOnly: true 
              })
          ],
          listeners: {
              start(event) {
                setSelectedElement(element.id);
                setIsDragging(true);
              },
            move(event) {
              const { dx, dy } = event;
                updateElement(element.id, {
                  x: Math.max(0, element.x + dx),
                  y: Math.max(0, element.y + dy)
                });
              },
              end() {
                setIsDragging(false);
            }
          }
        })
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          listeners: {
              start(event) {
                setSelectedElement(element.id);
              },
            move(event) {
              const { width, height, deltaRect } = event.rect;
              const deltaLeft = deltaRect?.left || 0;
              const deltaTop = deltaRect?.top || 0;
              updateElement(element.id, {
                x: element.x + deltaLeft,
                y: element.y + deltaTop,
                width: Math.max(20, width),
                height: Math.max(20, height)
              });
            }
          },
          modifiers: [
              interactInstance.modifiers.restrictSize({ 
                min: { width: 40, height: 20 } 
              })
            ]
          });
        
        destroyers.push(destroyer);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      destroyers.forEach((d) => d && d.unset && d.unset());
    };
  }, [interactInstance, elements, currentPage]);

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

  // Element management functions
  const addElement = (type, data) => {
    // Get PDF page dimensions to position at bottom
    const pageCanvas = pageCanvases[currentPage];
    const pageHeight = pageCanvas ? pageCanvas.height : 600;
    const pageWidth = pageCanvas ? pageCanvas.width : 800;
    
    const newElement = {
      id: Date.now() + Math.random(),
      type,
      data,
      x: 50,
      y: pageHeight - 100, // Position at bottom of page
      width: type === 'signature' ? 160 : 120,
      height: type === 'signature' ? 60 : 30,
      page: currentPage
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const updateElement = (id, updates) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const removeElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  // Reset transaction state
  const resetTransaction = () => {
    setTxHash('');
    setDocHash('');
    setDigitalProof(null);
    setQrCodeDataUrl('');
    setError('');
    setIsSubmitting(false);
    setCurrentStep(1);
  };

  // Check SSIGN balance
  const checkSSignBalance = useCallback(async () => {
    if (!wallet?.adapter?.publicKey) {
      console.error('No wallet connected or no public key');
      return;
    }
    
    try {
      console.log('Checking SSIGN balance for wallet:', wallet.adapter.publicKey.toString());
      const { getTokenBalance, SOLSIGN_TOKEN_CONFIG } = await import('../utils/web3');
      const { Connection } = await import('@solana/web3.js');
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const balance = await getTokenBalance(connection, wallet.adapter.publicKey.toString(), SOLSIGN_TOKEN_CONFIG.mintAddress);
      const formattedBalance = balance / Math.pow(10, SOLSIGN_TOKEN_CONFIG.decimals);
      console.log('SSIGN balance found:', formattedBalance);
      setSsignBalance(formattedBalance);
    } catch (err) {
      console.error('Error checking SSIGN balance:', err);
      setSsignBalance(0);
    }
  }, [wallet?.adapter?.publicKey]);

  // Check SSIGN balance when reaching submit step
  useEffect(() => {
    if (currentStep === 3 && wallet?.adapter?.publicKey) {
      checkSSignBalance();
    }
  }, [currentStep, wallet?.adapter?.publicKey, checkSSignBalance]);

  // Digital proof generation
  const generateDigitalProof = useCallback(async (pdfBytes) => {
    try {
      // Compute SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setDocHash(hashHex);
      
      // Build proof object
      const proof = {
        docHash: hashHex,
        signerPubkey: connected ? 'wallet-pubkey' : 'anonymous', // Will be replaced with actual pubkey
        signedAt: new Date().toISOString(),
        txSig: null // Will be filled after blockchain transaction
      };
      
      setDigitalProof(proof);
      
      // Generate QR code
      if (QRCode) {
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(proof), {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      }
      
      return { hashHex, proof };
    } catch (error) {
      console.error('Error generating digital proof:', error);
      throw error;
    }
  }, [connected, QRCode]);

  const handleSubmit = async () => {
    if (!pdfFile) { setError('Please upload a PDF'); return; }
    if (isSubmitting) { 
      setError('Transaction already in progress. Please wait...'); 
      return; 
    }
    if (txHash) { 
      setError('Transaction already completed. Please refresh to start a new one.'); 
      return; 
    }
    
    setError('');
    setIsSubmitting(true);
    setTxHash('');
    setCurrentStep(4);
    
    try {
      // Step 1: Generate document hash
      const pdfBytes = await pdfFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setDocHash(hashHex);
      
      // Step 2: Create SSIGN burn transaction
      let txSignature = null;
      try {
        const { createSSignTransaction } = await import('../utils/web3');
        
        // Create transaction to burn 1 SSIGN
        txSignature = await createSSignTransaction(ssignAmount, hashHex, wallet?.adapter);
        setTxHash(txSignature);
        
        // Create proof with transaction signature
        const proof = {
          docHash: hashHex,
          signerPubkey: wallet?.adapter?.publicKey?.toString() || 'anonymous',
          signedAt: new Date().toISOString(),
          txSig: txSignature,
          ssignAmount: ssignAmount,
          explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
        };
        setDigitalProof(proof);
        
        // Generate QR code with Solana explorer link
        if (QRCode) {
          const explorerUrl = `https://explorer.solana.com/tx/${txSignature}`;
          const qrDataUrl = await QRCode.toDataURL(explorerUrl, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          setQrCodeDataUrl(qrDataUrl);
        }
        
        // Save transaction to database
        try {
          const dbResponse = await fetch('/api/save-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash: txSignature,
              docHash: hashHex,
              signerPubkey: wallet?.adapter?.publicKey?.toString(),
              ssignAmount: ssignAmount,
              signedAt: new Date().toISOString(),
              explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
            })
          });
          
          if (dbResponse.ok) {
            const dbResult = await dbResponse.json();
            console.log('✅ Transaction saved to database:', dbResult);
          } else {
            console.warn('⚠️ Failed to save transaction to database:', await dbResponse.text());
          }
        } catch (dbErr) {
          console.warn('⚠️ Database save failed:', dbErr);
        }
        
      } catch (chainErr) {
        console.error('❌ SSIGN transaction failed:', chainErr);
        setError('Transaction failed: ' + chainErr.message);
        setIsSubmitting(false);
        return;
      }
      
      setCurrentStep(5);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportFinalPdf = async () => {
    if (!pdfFile || !digitalProof) return;
    
    try {
      setError('');
      
      // Create form data with all elements
      const form = new FormData();
      form.append('pdf', pdfFile);
      form.append('elements', JSON.stringify(elements));
      form.append('digitalProof', JSON.stringify(digitalProof));
      form.append('qrCode', qrCodeDataUrl);
      
      const res = await fetch('/api/export-signed-pdf', { 
        method: 'POST', 
        body: form 
      });
      
      if (!res.ok) throw new Error('Failed to export PDF');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfName.replace(/\.pdf$/i, '') + '.signed.pdf';
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error(err);
      setError('Failed to export PDF: ' + err.message);
    }
  };

  return (
    <>
      <MenuBar />
      <div className="sign-container">
        <Galaxy 
          className="sign-galaxy-background"
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={240}
        />
        <div className="sign-content-overlay">
          <header className="sign-header">
            <h1>Sign a Document</h1>
            <p>Upload a PDF, place elements, generate proof, and securely finalize.</p>
          </header>

          {!connected ? (
          <div className="sign-gate">
            <p>Please connect your wallet to continue.</p>
            <WalletMultiButton className="connect-button" />
          </div>
        ) : (
            <main className="sign-content">
              {/* Step Progress */}
              <div className="step-progress">
                {[1, 2, 3, 4].map(step => (
                  <div 
                    key={step} 
                    className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
                  >
                    <div className="step-number">{step}</div>
                    <div className="step-label">
                      {step === 1 && 'Upload'}
                      {step === 2 && 'Elements'}
                      {step === 3 && 'Submit'}
                      {step === 4 && 'Export'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 1: PDF Upload */}
              {currentStep === 1 && (
                <div className="step-content">
                  <div 
                    className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="upload-content">
                      <div className="upload-icon">📄</div>
                      <h3>Upload PDF Document</h3>
                      <p>Drag and drop your PDF here, or click to browse</p>
                      <input 
                        id="pdf-input" 
                        type="file" 
                        accept="application/pdf,.pdf" 
                        onChange={handlePdfChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="pdf-input" className="upload-button">
                        Choose PDF File
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Element Placement */}
              {currentStep === 2 && pdfFile && (
                <div className="step-content two-column">
                  <div className="left-panel">
                    <div className="pdf-viewer" ref={pdfContainerRef}>
                      {pageCanvases[currentPage] && (
                        <div className="pdf-page-container">
                          <img 
                            src={pageCanvases[currentPage].toDataURL()} 
                            alt={`PDF page ${currentPage}`}
                            className="pdf-page"
                          />
                          {elements.length === 0 && (
                            <div className="placement-hint">
                              <p>👆 Add elements from the right panel, then drag them to position</p>
                            </div>
                          )}
                          {elements
                            .filter(el => el.page === currentPage)
                            .map(element => (
                              <div
                                key={element.id}
                                data-element-id={element.id}
                                className={`element-overlay ${selectedElement === element.id ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                                style={{
                                  position: 'absolute',
                                  left: element.x,
                                  top: element.y,
                                  width: element.width,
                                  height: element.height,
                                  border: selectedElement === element.id ? '2px solid #4f46e5' : '1px dashed #666',
                                  cursor: 'move',
                                  zIndex: selectedElement === element.id ? 10 : 1
                                }}
                                onClick={() => setSelectedElement(element.id)}
                                onMouseDown={(e) => {
                                  if (e.button === 0) { // Left mouse button
                                    setSelectedElement(element.id);
                                    setIsDragging(true);
                                    
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const startElementX = element.x;
                                    const startElementY = element.y;
                                    
                                    const handleMouseMove = (e) => {
                                      const dx = e.clientX - startX;
                                      const dy = e.clientY - startY;
                                      updateElement(element.id, {
                                        x: Math.max(0, startElementX + dx),
                                        y: Math.max(0, startElementY + dy)
                                      });
                                    };
                                    
                                    const handleMouseUp = () => {
                                      setIsDragging(false);
                                      document.removeEventListener('mousemove', handleMouseMove);
                                      document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                  }
                                }}
                              >
                                {element.type === 'signature' && element.data && (
                                  <img 
                                    src={URL.createObjectURL(element.data)} 
                                    alt="Signature"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                )}
                                {element.type === 'text' && (
                                  <div style={{ padding: '4px', fontSize: '12px' }}>{element.data}</div>
                                )}
                                {element.type === 'date' && (
                                  <div style={{ padding: '4px', fontSize: '12px' }}>{new Date().toLocaleDateString()}</div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {totalPages > 1 && (
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
              </div>

                  <div className="right-panel">
                      <div className="element-tools">
                      <h3>Add Elements</h3>
                      <p className="tool-hint">Click to add elements, then drag them on the PDF to position</p>
                      
                      {/* Signature Tools */}
              <div className="signature-tabs">
                <div className="tab-buttons">
                          <button 
                            className={signatureType === 'drawn' ? 'active' : ''} 
                            onClick={() => setSignatureType('drawn')}
                          >
                            Draw
                          </button>
                          <button 
                            className={signatureType === 'image' ? 'active' : ''} 
                            onClick={() => setSignatureType('image')}
                          >
                            Upload
                          </button>
                          <button 
                            className={signatureType === 'text' ? 'active' : ''} 
                            onClick={() => setSignatureType('text')}
                          >
                            Type
                          </button>
                </div>

                {signatureType === 'drawn' && (
                  <div className="tab-panel">
                            <canvas ref={drawCanvasRef} width={400} height={150} className="draw-canvas" />
                    <div className="row">
                              <button onClick={async () => {
                                const blob = await exportDrawnToBlob();
                                if (blob) addElement('signature', blob);
                              }}>
                                Add Signature
                              </button>
                              <button onClick={() => {
                                const c = drawCanvasRef.current;
                                const ctx = c.getContext('2d');
                                ctx.clearRect(0, 0, c.width, c.height);
                              }}>
                                Clear
                              </button>
                    </div>
                  </div>
                )}

                {signatureType === 'image' && (
                  <div className="tab-panel">
                            <input 
                              type="file" 
                              accept="image/png,image/jpeg" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) addElement('signature', file);
                              }} 
                            />
                    <p className="hint">Prefer transparent PNG for best results.</p>
                </div>
              )}

                {signatureType === 'text' && (
                  <div className="tab-panel">
                            <input 
                              type="text" 
                              placeholder="Type your name" 
                              value={typedText} 
                              onChange={(e) => setTypedText(e.target.value)} 
                            />
                    <select value={typedFont} onChange={(e) => setTypedFont(e.target.value)}>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Courier New</option>
                    </select>
                            <button onClick={async () => {
                              const blob = await exportTypedToBlob();
                              if (blob) addElement('signature', blob);
                            }}>
                              Add Signature
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Other Elements */}
                      <div className="other-elements">
                        <button 
                          className="element-button"
                          onClick={() => addElement('text', 'Custom Text')}
                        >
                          + Add Text
                        </button>
                        <button 
                          className="element-button"
                          onClick={() => addElement('date', new Date().toLocaleDateString())}
                        >
                          + Add Date
                        </button>
                      </div>

                      {/* Element List */}
                      {elements.length > 0 && (
                        <div className="elements-list">
                          <h4>Placed Elements</h4>
                          {elements.map(element => (
                            <div 
                              key={element.id} 
                              className={`element-item ${selectedElement === element.id ? 'selected' : ''}`}
                              onClick={() => setSelectedElement(element.id)}
                            >
                              <span>{element.type} (Page {element.page})</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeElement(element.id);
                                }}
                                className="remove-button"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button 
                        className="primary-button"
                        onClick={() => setCurrentStep(3)}
                        disabled={elements.length === 0}
                      >
                        Continue to Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Submit Transaction */}
              {currentStep === 3 && (
                <div className="step-content">
                  <div className="submit-section">
                    <h3>Submit to Blockchain</h3>
                    <p>Burn 1 SSIGN token as proof of signing (real devnet transaction)</p>
                    
                    <div className="transaction-details">
                      <div className="detail-row">
                        <span className="label">Wallet Status:</span>
                        <span className="value">{wallet?.adapter?.publicKey ? 'Connected' : 'Not Connected'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Wallet Address:</span>
                        <span className="value">{wallet?.adapter?.publicKey?.toString()?.slice(0, 8)}...{wallet?.adapter?.publicKey?.toString()?.slice(-8)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Your SSIGN Balance:</span>
                        <span className="value">{ssignBalance.toFixed(4)} SSIGN</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Amount to burn:</span>
                        <span className="value">{ssignAmount} SSIGN</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Purpose:</span>
                        <span className="value">Document signing proof (token burn)</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Network:</span>
                        <span className="value">Solana Devnet</span>
                      </div>
                    </div>

                    {ssignBalance < ssignAmount && (
                      <div className="warning-message">
                        <p>⚠️ Insufficient SSIGN balance. You have {ssignBalance.toFixed(4)} SSIGN but need {ssignAmount} SSIGN.</p>
                        <p>Please ensure you have SSIGN tokens in your wallet or contact support.</p>
                      </div>
                    )}

                    <div className="transaction-preview">
                      <h4>Burn Transaction Preview</h4>
                      <div className="preview-card">
                        <p><strong>Action:</strong> Burn SSIGN Tokens</p>
                        <p><strong>From:</strong> Your Wallet</p>
                        <p><strong>Amount:</strong> {ssignAmount} SSIGN (permanently destroyed)</p>
                        <p><strong>Effect:</strong> Reduces total SSIGN supply</p>
                        <p><strong>Memo:</strong> SOLSIGN_BURN: Document signing proof</p>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button 
                        className="secondary-button"
                        onClick={async () => {
                          try {
                            const { requestDevnetTokens } = await import('../utils/web3');
                            await requestDevnetTokens(wallet?.adapter?.publicKey?.toString());
                            alert('Devnet SOL airdrop successful! You can now proceed with the transaction.');
                          } catch (error) {
                            alert('Airdrop failed: ' + error.message);
                          }
                        }}
                        disabled={!wallet?.adapter?.publicKey}
                      >
                        Get Devnet SOL
                      </button>
                      
                      <button 
                        className="secondary-button"
                        onClick={checkSSignBalance}
                        disabled={!wallet?.adapter?.publicKey}
                      >
                        Refresh SSIGN Balance
                      </button>
                      
                      <button 
                        className="primary-button submit-button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || ssignBalance < ssignAmount}
                      >
                        {isSubmitting ? 'Burning SSIGN Tokens...' : 'Burn SSIGN & Sign Document'}
                      </button>
                      
                      {txHash && (
                        <button 
                          className="secondary-button"
                          onClick={resetTransaction}
                        >
                          Start New Transaction
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Transaction Status */}
              {currentStep === 4 && (
                <div className="step-content">
                  <div className="submission-status">
                    <h3>Transaction Status</h3>
                    {isSubmitting ? (
                      <div className="loading">
                        <div className="spinner"></div>
                        <p>Burning SSIGN tokens...</p>
                        <p className="loading-detail">Please confirm burn transaction in Phantom wallet</p>
                      </div>
                    ) : (
                      <div className="status-result">
                        {txHash ? (
                          <div className="success">
                            <h4>✅ Transaction Confirmed</h4>
                            <div className="transaction-info">
                              <p><strong>Amount:</strong> {ssignAmount} SSIGN burned (permanently destroyed)</p>
                              <p><strong>Transaction:</strong> {txHash}</p>
                              <p><strong>Status:</strong> Confirmed on Solana Devnet</p>
                              <p><strong>Effect:</strong> Total SSIGN supply reduced</p>
                            </div>
                            {qrCodeDataUrl && (
                              <div className="qr-preview">
                                <h5>Transaction QR Code</h5>
                                <img src={qrCodeDataUrl} alt="Transaction QR Code" />
                              </div>
                            )}
                            <button 
                              className="primary-button"
                              onClick={() => setCurrentStep(5)}
                            >
                              Continue to Export PDF
                            </button>
                          </div>
                        ) : (
                          <div className="error">
                            <h4>❌ Transaction Failed</h4>
                            <p>{error}</p>
                            <button 
                              className="primary-button"
                              onClick={() => setCurrentStep(3)}
                            >
                              Try Again
                </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Export */}
              {currentStep === 5 && (
                <div className="step-content">
                  <div className="export-section">
                    <h3>🎉 Document Successfully Signed!</h3>
                    <p>Your document has been cryptographically signed and verified on the Solana blockchain.</p>
                    
                    <div className="export-preview">
                      {qrCodeDataUrl && (
                        <div className="qr-preview-large">
                          <h4>📱 Digital Proof QR Code</h4>
                          <div className="qr-container">
                            <img src={qrCodeDataUrl} alt="Transaction QR Code" className="qr-code-large" />
                            <p className="qr-instructions">
                              Scan this QR code to verify the transaction on Solana Explorer
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {digitalProof && (
                        <div className="proof-preview">
                          <h4>📄 Proof Details</h4>
                          <div className="proof-details-scrollable">
                            <div className="detail-item">
                              <span className="label">Transaction Hash:</span>
                              <span className="value">{txHash}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Document Hash:</span>
                              <span className="value">{docHash}</span>
                            </div>
                            {digitalProof.signerPubkey && (
                              <div className="detail-item">
                                <span className="label">Signer:</span>
                                <span className="value">{digitalProof.signerPubkey}</span>
                              </div>
                            )}
                            {digitalProof.signedAt && (
                              <div className="detail-item">
                                <span className="label">Signed At:</span>
                                <span className="value">{new Date(digitalProof.signedAt).toLocaleString()}</span>
                              </div>
                            )}
                            {digitalProof.ssignAmount && (
                              <div className="detail-item">
                                <span className="label">SSIGN Burned:</span>
                                <span className="value">{digitalProof.ssignAmount} tokens</span>
                              </div>
                            )}
                            {digitalProof.explorerUrl && (
                              <div className="detail-item">
                                <span className="label">Explorer URL:</span>
                                <span className="value">{digitalProof.explorerUrl}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="export-actions">
                      <button 
                        className="primary-button export-button"
                        onClick={exportFinalPdf}
                      >
                        📄 Download Signed PDF
                      </button>
                      
                      {txHash && (
                        <button 
                          className="explorer-button"
                          onClick={() => window.open(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`, '_blank')}
                        >
                          🔍 View in Solana Explorer
                        </button>
                      )}
                      
                      <button 
                        className="secondary-button"
                        onClick={resetTransaction}
                      >
                        🔄 Sign Another Document
                      </button>
                    </div>
                  </div>
                </div>
              )}

                {error && <div className="status-text error">{error}</div>}
          </main>
        )}
        </div>
      </div>
    </>
  );
};

export default Sign;
