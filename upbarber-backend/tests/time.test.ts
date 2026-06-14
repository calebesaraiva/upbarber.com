import { describe, expect, it } from "vitest";
import { dateInputValue, sameDateOnly } from "../src/shared/utils/time.js";

describe("time utils", () => {
  it("parses date-only strings without UTC drift", () => {
    const parsed = sameDateOnly("2026-06-14");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(14);
  });

  it("formats local date input values", () => {
    const value = dateInputValue(new Date(2026, 5, 14, 10, 30, 0));
    expect(value).toBe("2026-06-14");
  });
});
