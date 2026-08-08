import { readFileSync } from "fs";
import { resolve } from "path";

describe("double-entry ledger migration guards", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "prisma/migrations/20260808002000_double_entry_general_ledger/migration.sql",
    ),
    "utf8",
  );

  it("enforces DRAFT to POSTED and rejects later header or line mutation", () => {
    expect(sql).toContain("'DRAFT', 'POSTED'");
    expect(sql).toContain("Journal entries must be inserted as DRAFT");
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "JournalEntry"');
    expect(sql).toContain("OLD.\"status\" = 'POSTED'");
    expect(sql).toContain("NEW.\"status\" = 'POSTED'");
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"');
    expect(sql).toContain("old_parent_status = 'POSTED'");
    expect(sql).toContain("new_parent_status = 'POSTED'");
  });

  it("revalidates tenant ownership on inserts and re-parenting updates", () => {
    expect(sql).toContain('BEFORE INSERT OR UPDATE ON "JournalLine"');
    expect(sql).toContain("entry_shop <> account_shop");
  });

  it("requires line currency and totals to match the journal header", () => {
    expect(sql).toContain("line_currency <> header_currency");
    expect(sql).toContain("debit_npr <> header_canonical_amount");
    expect(sql).toContain("debit_tx <> header_transaction_amount");
  });
});
