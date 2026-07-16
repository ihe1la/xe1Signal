export function calculateSignalStrength(signalCount: number, frequencyCount: number) {
  return Math.min(100, Math.max(0, signalCount) * 8 + Math.max(0, frequencyCount) * 12);
}
