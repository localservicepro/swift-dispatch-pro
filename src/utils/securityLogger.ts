/**
 * Security Event Logger
 * Logs authentication and authorization events for audit trails
 */

type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'signup_blocked'
  | 'unauthorized_access'
  | 'role_check_failed'
  | 'suspicious_activity';

interface SecurityEventDetails {
  userId?: string;
  email?: string;
  attemptedRole?: string;
  userRoles?: string[];
  attemptedPath?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

/**
 * Log a security event
 * In production, these should be sent to a proper logging service
 */
export const logSecurityEvent = (
  eventType: SecurityEventType,
  details: SecurityEventDetails
) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: eventType,
    ...details,
    sessionId: sessionStorage.getItem('session_id') || 'unknown'
  };

  // Console logging with security prefix
  console.warn('[SECURITY EVENT]', eventType, logEntry);

  // In production, send to logging service:
  // - Supabase activity_logs table
  // - External SIEM system
  // - CloudWatch/Datadog/etc.
  
  // For now, we'll store in sessionStorage for debugging
  const existingLogs = JSON.parse(sessionStorage.getItem('security_logs') || '[]');
  existingLogs.push(logEntry);
  
  // Keep only last 50 events in session
  if (existingLogs.length > 50) {
    existingLogs.shift();
  }
  
  sessionStorage.setItem('security_logs', JSON.stringify(existingLogs));
};

/**
 * Get recent security logs (for admin debugging)
 */
export const getSecurityLogs = (): any[] => {
  return JSON.parse(sessionStorage.getItem('security_logs') || '[]');
};

/**
 * Clear security logs
 */
export const clearSecurityLogs = () => {
  sessionStorage.removeItem('security_logs');
};
