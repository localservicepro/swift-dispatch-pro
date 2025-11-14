/**
 * Browser compatibility utilities for Safari and other browsers
 */

export const isSafari = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isStorageAccessible = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const canUseWebSockets = (): boolean => {
  return 'WebSocket' in window;
};

export const getBrowserInfo = () => {
  return {
    isSafari: isSafari(),
    isIOS: isIOS(),
    hasLocalStorage: isStorageAccessible(),
    hasWebSockets: canUseWebSockets(),
    userAgent: navigator.userAgent,
  };
};

export const showSafariInstructions = () => {
  return `
Safari Privacy Settings:
1. Open Safari on your device
2. Go to Settings > Safari > Privacy & Security
3. Turn OFF "Prevent Cross-Site Tracking"
4. Turn OFF "Block All Cookies"
5. Refresh this page and try logging in again

Alternative: Use Chrome or Firefox browser for the driver portal.
  `.trim();
};
