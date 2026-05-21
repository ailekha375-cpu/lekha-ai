const CHATTY_PREAMBLE_RE =
  /^(sure|here(?:'|’)s|certainly|absolutely|of course|happy to help|below is)\b/i;

export function parseEmailDraft(content: string, fallbackSubject?: string | null) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }

  while (
    lines.length &&
    CHATTY_PREAMBLE_RE.test(lines[0].trim()) &&
    /(draft|invitation|email|invite)/i.test(lines[0])
  ) {
    lines.shift();
    while (lines.length && !lines[0].trim()) {
      lines.shift();
    }
  }

  let subject = (fallbackSubject || '').trim();
  if (lines[0] && /^subject\s*:/i.test(lines[0].trim())) {
    subject = lines[0].replace(/^subject\s*:/i, '').trim() || subject;
    lines.shift();
    while (lines.length && !lines[0].trim()) {
      lines.shift();
    }
  }

  const body = lines.join('\n').trim();
  return { subject, body };
}

export function sanitizeEmailDraft(content: string) {
  return parseEmailDraft(content).body;
}
