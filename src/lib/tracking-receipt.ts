export type TrackingCredential = {
  trackingCode: string;
  trackingSecret: string;
};

/** A portable receipt, never a URL and never automatic browser storage. */
export function formatTrackingReceipt(receipt: TrackingCredential) {
  return `${receipt.trackingCode}.${receipt.trackingSecret}`;
}

export function parseTrackingReceipt(value: string): TrackingCredential | null {
  const match = /^\s*(MA-[A-Z0-9]{16})\.([A-Za-z0-9_-]{43})\s*$/i.exec(value);
  if (!match) return null;
  return { trackingCode: match[1].toUpperCase(), trackingSecret: match[2] };
}
