/**
 * Utility functions for cryptographic hashing
 */

/**
 * Converts a data URL to Uint8Array
 * @param dataURL - Data URL string (e.g., "data:image/jpeg;base64,...")
 * @returns Uint8Array of the binary data
 */
function dataURLToUint8Array(dataURL: string): Uint8Array {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64String = dataURL.split(',')[1];
  
  // Convert base64 to binary
  const binaryString = atob(base64String);
  
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Computes SHA-256 hash of input data and returns as base64 string
 * @param input - Data URL string or Uint8Array
 * @returns Promise<string> - Base64-encoded SHA-256 hash
 */
export async function sha256Base64(input: string | Uint8Array): Promise<string> {
  try {
    let data: Uint8Array;
    
    if (typeof input === 'string') {
      // Handle data URL
      data = dataURLToUint8Array(input);
    } else {
      // Handle Uint8Array directly
      data = input;
    }
    
    // Compute SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to base64
    const hashArray = new Uint8Array(hashBuffer);
    const base64String = btoa(String.fromCharCode(...hashArray));
    
    return base64String;
  } catch (error) {
    console.error('Error computing SHA-256 hash:', error);
    throw new Error('Failed to compute hash');
  }
}

/**
 * Computes SHA-256 hash of input data and returns as hex string
 * @param input - Data URL string or Uint8Array
 * @returns Promise<string> - Hex-encoded SHA-256 hash
 */
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  try {
    let data: Uint8Array;
    
    if (typeof input === 'string') {
      // Handle data URL
      data = dataURLToUint8Array(input);
    } else {
      // Handle Uint8Array directly
      data = input;
    }
    
    // Compute SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex
    const hashArray = new Uint8Array(hashBuffer);
    const hexString = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hexString;
  } catch (error) {
    console.error('Error computing SHA-256 hash:', error);
    throw new Error('Failed to compute hash');
  }
}