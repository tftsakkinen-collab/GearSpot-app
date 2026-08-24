/**
 * Action Logger utility for capturing recent UI events and errors.
 * Used by the bug reporting modal to attach diagnostic telemetry.
 */

export interface ActionLogEntry {
  timestamp: string;
  action: string;
  details?: Record<string, unknown> | string;
}

const MAX_LOGS = 20;
const logs: ActionLogEntry[] = [];

/**
 * Record a user action or system event.
 */
export function logAction(action: string, details?: Record<string, unknown> | string) {
  const entry: ActionLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    ...(details ? { details } : {}),
  };

  logs.push(entry);

  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

/**
 * Retrieve the recent action logs.
 */
export function getRecentActionLogs(): ActionLogEntry[] {
  if (logs.length === 0 && typeof window !== "undefined") {
    return [
      {
        timestamp: new Date().toISOString(),
        action: "APP_INIT",
        details: { url: window.location.href },
      },
    ];
  }
  return [...logs];
}

// Automatically record page load event in client environment
if (typeof window !== "undefined") {
  logAction("PAGE_LOADED", {
    href: window.location.href,
    screen: `${window.innerWidth}x${window.innerHeight}`,
  });
}
