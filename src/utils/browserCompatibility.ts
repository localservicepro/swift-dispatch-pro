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

export const getIOSVersion = (): number | null => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

export const isModernIOS = (): boolean => {
  const version = getIOSVersion();
  return version !== null && version >= 17;
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
    iosVersion: getIOSVersion(),
    isModernIOS: isModernIOS(),
    hasLocalStorage: isStorageAccessible(),
    hasWebSockets: canUseWebSockets(),
    userAgent: navigator.userAgent,
  };
};

export const showSafariInstructions = () => {
  const iosVersion = getIOSVersion();
  const isModern = isModernIOS();
  
  if (isModern) {
    return `
iOS ${iosVersion}+ Enhanced Privacy Settings:

IMPORTANT: iOS 17+ has stricter privacy that may prevent login even with settings adjusted.

Recommended Solutions:
1. Use Chrome or Firefox browser instead of Safari
2. Add this website to your Home Screen (works as a web app and bypasses some restrictions)
3. Disable Private Relay: Settings > Apple ID > iCloud > Private Relay > Turn OFF
4. Safari Settings: Settings > Safari > Privacy & Security > Turn OFF both tracking prevention options

Note: Even with these settings, iOS 17+ may still block authentication. Chrome/Firefox work better.
    `.trim();
  }
  
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
