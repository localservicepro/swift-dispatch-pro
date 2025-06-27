
interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: any;
}

class DebugLogger {
  private isEnabled = true;

  log(message: string, context?: LogContext) {
    if (!this.isEnabled) return;
    
    const logData = {
      message,
      timestamp: Date.now(),
      ...context
    };
    
    console.log(`[DEBUG] ${message}`, logData);
  }

  error(message: string, error: any, context?: LogContext) {
    const logData = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: Date.now(),
      ...context
    };
    
    console.error(`[ERROR] ${message}`, logData);
  }

  warn(message: string, context?: LogContext) {
    if (!this.isEnabled) return;
    
    const logData = {
      message,
      timestamp: Date.now(),
      ...context
    };
    
    console.warn(`[WARN] ${message}`, logData);
  }

  info(message: string, context?: LogContext) {
    if (!this.isEnabled) return;
    
    const logData = {
      message,
      timestamp: Date.now(),
      ...context
    };
    
    console.info(`[INFO] ${message}`, logData);
  }

  apiCall(endpoint: string, method: string, status: 'start' | 'success' | 'error', data?: any) {
    const logData = {
      endpoint,
      method,
      status,
      data,
      timestamp: Date.now()
    };
    
    console.log(`[API] ${method} ${endpoint} - ${status}`, logData);
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

export const debugLogger = new DebugLogger();
