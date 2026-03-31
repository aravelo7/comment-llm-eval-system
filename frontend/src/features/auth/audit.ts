type AuthAuditEvent =
  | 'auth_login_success'
  | 'auth_login_failure'
  | 'auth_register_success'
  | 'auth_register_failure'
  | 'auth_logout'
  | 'auth_session_expired';

type AuthAuditPayload = {
  email?: string;
  status?: number;
  mode?: string;
  reason?: string;
  plan?: string;
};

function redactEmail(email?: string) {
  if (!email) {
    return undefined;
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return 'invalid';
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function recordAuthEvent(event: AuthAuditEvent, payload: AuthAuditPayload = {}) {
  const safePayload = {
    ...payload,
    email: redactEmail(payload.email),
  };

  if (import.meta.env.DEV) {
    console.info('[auth-event]', event, safePayload);
  }
}
