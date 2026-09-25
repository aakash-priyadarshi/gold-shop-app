import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ConfirmWorkshopMovementDto } from "./workshop-movement.dto";

describe("ConfirmWorkshopMovementDto runtime metadata", () => {
  it("loads and validates nested finished-goods details", () => {
    const dto = plainToInstance(ConfirmWorkshopMovementDto, {
      readingId: "reading-1",
      finishedGoods: { nameEn: "Measured ring", jewelleryType: "RING" },
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.finishedGoods?.nameEn).toBe("Measured ring");
  });
});
