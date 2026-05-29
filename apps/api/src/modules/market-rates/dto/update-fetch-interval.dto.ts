import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class UpdateFetchIntervalDto {
  @ApiProperty({
    description:
      "Minimum seconds between external metal-price API fetches. " +
      "Examples: 1 (per second), 60 (per minute), 3600 (per hour), 86400 (per day).",
    minimum: 1,
    maximum: 2_592_000, // 30 days
    example: 86400,
  })
  @IsInt()
  @Min(1)
  @Max(2_592_000)
  fetchIntervalSeconds!: number;
}
