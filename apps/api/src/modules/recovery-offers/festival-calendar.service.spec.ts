import { FestivalCalendarService } from "./festival-calendar.service";

describe("FestivalCalendarService", () => {
  it("builds a six-faith festival calendar without an external API", () => {
    const service = new FestivalCalendarService();
    const calendar = service.getCalendar(2026, 1);

    expect(calendar.startYear).toBe(2026);
    expect(calendar.endYear).toBe(2026);
    expect(new Set(calendar.events.map((event) => event.religion))).toEqual(
      new Set(["HINDU", "MUSLIM", "BUDDHIST", "JEWISH", "SIKH", "CHRISTIAN"]),
    );

    expect(calendar.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Diwali",
          date: "2026-11-08",
          countries: ["IN"],
        }),
        expect.objectContaining({
          name: "Tihar / Laxmi Puja",
          date: "2026-11-08",
          countries: ["NP"],
        }),
        expect.objectContaining({
          name: "Eid al-Fitr",
          date: "2026-03-20",
          countries: ["AE", "IN", "NP", "UK", "US"],
          dateAccuracy: "MOON_SIGHTING",
        }),
        expect.objectContaining({
          name: "Buddha Purnima / Vesak",
          countries: ["IN", "NP"],
        }),
        expect.objectContaining({
          name: "Rosh Hashanah",
          date: "2026-09-12",
        }),
        expect.objectContaining({
          name: "Vaisakhi",
          date: "2026-04-14",
          countries: ["IN", "UK", "US"],
        }),
        expect.objectContaining({
          name: "Christmas Day",
          date: "2026-12-25",
        }),
      ]),
    );

    expect(new Set(calendar.events.map((event) => event.id)).size).toBe(
      calendar.events.length,
    );
    expect(
      calendar.events.every((event) => event.date.startsWith("2026-")),
    ).toBe(true);
  });

  it("reuses the generated range from its in-memory cache", () => {
    const service = new FestivalCalendarService();
    expect(service.getCalendar(2027, 1)).toBe(service.getCalendar(2027, 1));
  });
});
