export function buildSafeExportFileName(
  originalName: string | undefined,
  extension: 'txt' | 'csv'
): string {
  const fallback = `clearshare-sanitized.${extension}`;
  if (!originalName) return fallback;

  const baseOnly = originalName.split(/[/\\]/).pop() ?? 'document';
  const stripped = baseOnly.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '-');
  const cleanBase = stripped.replace(/^-+|-+$/g, '') || 'document';
  return `sanitized-${cleanBase}.${extension}`;
}

export function downloadSanitizedFile(
  content: string,
  fileName: string,
  mimeType: 'text/plain;charset=utf-8' | 'text/csv;charset=utf-8' | 'application/json;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function copyTextToClipboard(content: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }
  await navigator.clipboard.writeText(content);
  return true;
}
