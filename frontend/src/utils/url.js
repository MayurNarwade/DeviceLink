const URL_REGEX = /https?:\/\/[^\s]+/g;

export function extractUrls(text) {
  return text.match(URL_REGEX) || [];
}

export function isValidUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}