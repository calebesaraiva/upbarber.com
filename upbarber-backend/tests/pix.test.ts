import { describe, expect, it } from "vitest";
import { buildPixTxid, createPixPayload } from "../src/shared/utils/pix.js";

describe("pix helpers", () => {
  it("builds a valid alphanumeric txid within Pix limits", () => {
    const txid = buildPixTxid("invoice-123");
    expect(txid).toMatch(/^[A-Z0-9]{26,35}$/);
  });

  it("generates a Pix copia e cola payload locally when needed", () => {
    const payload = createPixPayload(99.9, "UPBARBER-TESTE");
    expect(payload).toContain("BR.GOV.BCB.PIX");
    expect(payload).toMatch(/6304[A-F0-9]{4}$/);
  });
});
