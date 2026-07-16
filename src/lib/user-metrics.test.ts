import { describe, expect, it } from "vitest";
import { calculateSignalStrength } from "@/lib/user-metrics";

describe("calculateSignalStrength", () => {
  it("starts at zero and tracks signals and frequencies", () => {
    expect(calculateSignalStrength(0, 0)).toBe(0);
    expect(calculateSignalStrength(1, 0)).toBe(8);
    expect(calculateSignalStrength(0, 1)).toBe(12);
    expect(calculateSignalStrength(3, 2)).toBe(48);
  });

  it("never drops below zero or exceeds 100", () => {
    expect(calculateSignalStrength(-2, -4)).toBe(0);
    expect(calculateSignalStrength(20, 20)).toBe(100);
  });
});
