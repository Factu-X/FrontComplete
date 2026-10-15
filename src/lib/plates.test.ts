import { describe, expect, it } from "vitest";

import { isValidMotorcyclePlate, normalizeMotorcyclePlate } from "./plates";

describe("motorcycle plate helpers", () => {
  it("normalizes plate input", () => {
    expect(normalizeMotorcyclePlate(" abc12d ")).toBe("ABC12D");
  });

  it("accepts Colombian motorcycle plate format AAA00A", () => {
    expect(isValidMotorcyclePlate("ABC12D")).toBe(true);
  });

  it("rejects invalid motorcycle plate formats", () => {
    expect(isValidMotorcyclePlate("AB123C")).toBe(false);
    expect(isValidMotorcyclePlate("ABC123")).toBe(false);
    expect(isValidMotorcyclePlate("123ABC")).toBe(false);
  });
});
