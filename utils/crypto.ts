const SECRET_KEY = "levelmak_pro_secret_key_611_tmab";

/**
 * Encrypt a string using XOR + Base64
 */
export const encrypt = (text: string | null): string => {
  if (text === null || text === undefined) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  // Safe base64 encoding that supports unicode
  try {
    return "__enc__:" + btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    console.error("Base64 encryption failed, using raw result:", e);
    return "__enc__:" + result;
  }
};

/**
 * Decrypt a string using XOR + Base64
 */
export const decrypt = (cipherText: string | null): string => {
  if (cipherText === null || cipherText === undefined) return "";
  if (!cipherText.startsWith("__enc__:")) return cipherText;
  
  try {
    const base64 = cipherText.substring(8);
    let decoded = "";
    try {
      decoded = decodeURIComponent(escape(atob(base64)));
    } catch (b64Err) {
      decoded = base64; // Fallback if base64 decoding failed
    }
    
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt storage item:", e);
    return cipherText; // Return original if decryption fails
  }
};
