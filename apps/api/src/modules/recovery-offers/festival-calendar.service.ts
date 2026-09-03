import { Injectable } from "@nestjs/common";
import { getUpcomingFestivals, Observer } from "@ishubhamx/panchangam-js";
import Holidays from "date-holidays";

const DAY_MS = 24 * 60 * 60 * 1000;
type PanchangFestival = ReturnType<typeof getUpcomingFestivals>[number];

export const FESTIVAL_RELIGIONS = [
  "HINDU",
  "MUSLIM",
  "BUDDHIST",
  "JEWISH",
  "SIKH",
  "CHRISTIAN",
] as const;

export type FestivalReligion = (typeof FESTIVAL_RELIGIONS)[number];
export type FestivalCountry = "IN" | "NP" | "AE" | "US" | "UK";
export type FestivalDateAccuracy = "CALCULATED" | "MOON_SIGHTING" | "FIXED";

export interface FestivalCalendarEvent {
  id: string;
  name: string;
  religion: FestivalReligion;
  date: string;
  countries: FestivalCountry[];
  dateAccuracy: FestivalDateAccuracy;
  source: "PANCHANGAM" | "DATE_HOLIDAYS" | "FIXED_CALENDAR";
}

export interface FestivalCalendarResult {
  startYear: number;
  endYear: number;
  generatedAt: string;
  events: FestivalCalendarEvent[];
  notices: string[];
}

type PanchangLocation = {
  country: "IN" | "NP";
  observer: Observer;
  timezoneOffset: number;
};

type PanchangPreset = {
  name: string;
  religion: "HINDU" | "BUDDHIST" | "SIKH";
};

const PANCHANG_LOCATIONS: PanchangLocation[] = [
  {
    country: "IN",
    observer: new Observer(28.6139, 77.209, 216),
    timezoneOffset: 330,
  },
  {
    country: "NP",
    observer: new Observer(27.7172, 85.324, 1400),
    timezoneOffset: 345,
  },
];

const HINDU_PRESETS: Array<[RegExp, string]> = [
  [/^Makar Sankranti/, "Makar Sankranti / Pongal"],
  [/^Vasant Panchami/, "Vasant Panchami"],
  [/^Maha Shivaratri$/, "Maha Shivaratri"],
  [/^Holi \(/, "Holi"],
  [/^Ugadi \/ Gudi Padwa$/, "Ugadi / Gudi Padwa"],
  [/^Rama Navami$/, "Rama Navami"],
  [/^Akshaya Tritiya$/, "Akshaya Tritiya"],
  [/^Raksha Bandhan$/, "Raksha Bandhan"],
  [/^Janmashtami \(/, "Krishna Janmashtami"],
  [/^Ganesh Chaturthi$/, "Ganesh Chaturthi"],
  [/^Dhanteras \(/, "Dhanteras"],
  [/^Diwali \(/, "Diwali"],
  [/^Bhai Dooj \(/, "Bhai Dooj"],
  [/^Chhath Puja — Sandhya Arghya/, "Chhath Puja"],
];

const MUSLIM_PRESETS: Array<[RegExp, string]> = [
  [/^First day of Ramadan$/, "Ramadan begins"],
  [/Eid al-Fitr|End of Ramadan/i, "Eid al-Fitr"],
  [/Eid al-Adha|Feast of the Sacrifice/i, "Eid al-Adha"],
  [/^Islamic New Year$/, "Islamic New Year"],
  [/Mawlid|Birthday of Muhammad/i, "Mawlid al-Nabi"],
];

const JEWISH_PRESETS: Array<[RegExp, string]> = [
  [/^Purim$/, "Purim"],
  [/^Passover \(Pesach\)$/, "Passover (Pesach)"],
  [/^Shavuot/, "Shavuot"],
  [/^Rosh Hashanah \(Yom Teruah\)$/, "Rosh Hashanah"],
  [/^Day of Atonement \(Yom Kippur\)$/, "Yom Kippur"],
  [/^Feast of Tabernacles \(Sukkot\)$/, "Sukkot"],
  [/^Hanukkah$/, "Hanukkah"],
];

const CHRISTIAN_PRESETS: Array<[RegExp, string]> = [
  [/^Good Friday$/, "Good Friday"],
  [/^Easter Sunday$/, "Easter Sunday"],
  [/^Christmas Eve$/, "Christmas Eve"],
  [/^Christmas Day$/, "Christmas Day"],
];

const MUSLIM_COUNTRIES: FestivalCountry[] = ["IN", "NP", "AE", "US", "UK"];
const JEWISH_COUNTRIES: FestivalCountry[] = ["IN", "NP", "AE", "US", "UK"];
const CHRISTIAN_COUNTRIES: FestivalCountry[] = ["IN", "NP", "AE", "US", "UK"];
const SIKH_COUNTRIES: FestivalCountry[] = ["IN", "US", "UK"];
const BUDDHIST_COUNTRIES: FestivalCountry[] = ["IN", "NP"];

function daysInRange(startYear: number, endYear: number) {
  return Math.round(
    (Date.UTC(endYear + 1, 0, 1) - Date.UTC(startYear, 0, 1)) / DAY_MS,
  );
}

function asDateOnly(value: Date | string) {
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function matchPreset(
  value: string,
  presets: Array<[RegExp, string]>,
): string | null {
  for (const [pattern, name] of presets) {
    if (pattern.test(value)) return name;
  }
  return null;
}

function panchangPreset(
  festival: PanchangFestival,
  country: "IN" | "NP",
): PanchangPreset | null {
  if (/^Buddha Purnima$/.test(festival.name)) {
    return { name: "Buddha Purnima / Vesak", religion: "BUDDHIST" };
  }
  if (/^Hola Mohalla$/.test(festival.name) && country === "IN") {
    return { name: "Hola Mohalla", religion: "SIKH" };
  }
  if (/^Guru Nanak Jayanti/.test(festival.name) && country === "IN") {
    return { name: "Guru Nanak Gurpurab", religion: "SIKH" };
  }
  if (/^Navaratri Ghatasthapana$/.test(festival.name)) {
    return {
      name:
        country === "NP" ? "Dashain begins (Ghatasthapana)" : "Navratri begins",
      religion: "HINDU",
    };
  }
  if (/^Vijaya Dashami/.test(festival.name)) {
    return {
      name:
        country === "NP"
          ? "Dashain (Vijaya Dashami)"
          : "Dussehra (Vijaya Dashami)",
      religion: "HINDU",
    };
  }
  if (/^Diwali \(/.test(festival.name) && country === "NP") {
    return { name: "Tihar / Laxmi Puja", religion: "HINDU" };
  }
  if (/^Bhai Dooj \(/.test(festival.name) && country === "NP") {
    return { name: "Bhai Tika", religion: "HINDU" };
  }
  const hinduName = matchPreset(festival.name, HINDU_PRESETS);
  return hinduName ? { name: hinduName, religion: "HINDU" } : null;
}

@Injectable()
export class FestivalCalendarService {
  private readonly cache = new Map<string, FestivalCalendarResult>();

  getCalendar(startYear: number, years = 3): FestivalCalendarResult {
    const endYear = startYear + years - 1;
    const cacheKey = `${startYear}:${endYear}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const eventMap = new Map<string, FestivalCalendarEvent>();
    const addEvent = (event: Omit<FestivalCalendarEvent, "id">) => {
      const key = `${event.religion}:${event.name}:${event.date}`;
      const existing = eventMap.get(key);
      if (existing) {
        existing.countries = [
          ...new Set([...existing.countries, ...event.countries]),
        ].sort() as FestivalCountry[];
        return;
      }
      eventMap.set(key, {
        ...event,
        id: `${event.religion.toLowerCase()}-${slugify(event.name)}-${event.date}`,
        countries: [...event.countries].sort(),
      });
    };

    this.addPanchangEvents(startYear, endYear, addEvent);
    this.addDateHolidayEvents(startYear, endYear, addEvent);
    this.addFixedEvents(startYear, endYear, addEvent);

    const result: FestivalCalendarResult = {
      startYear,
      endYear,
      generatedAt: new Date().toISOString(),
      events: [...eventMap.values()].sort(
        (left, right) =>
          left.date.localeCompare(right.date) ||
          left.name.localeCompare(right.name),
      ),
      notices: [
        "Islamic dates are calculated in advance and may move by one day after local moon-sighting announcements.",
        "Jewish holidays begin at sunset on the evening before the calendar date shown.",
      ],
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  private addPanchangEvents(
    startYear: number,
    endYear: number,
    addEvent: (event: Omit<FestivalCalendarEvent, "id">) => void,
  ) {
    for (const location of PANCHANG_LOCATIONS) {
      const festivals = getUpcomingFestivals({
        date: new Date(Date.UTC(startYear, 0, 1)),
        observer: location.observer,
        days: daysInRange(startYear, endYear),
        timezoneOffset: location.timezoneOffset,
        categories: ["major", "solar"],
      });

      const firstOccurrence = new Map<
        string,
        { festival: PanchangFestival; preset: PanchangPreset }
      >();
      for (const festival of festivals) {
        const preset = panchangPreset(festival, location.country);
        if (!preset) continue;
        const date = asDateOnly(festival.date);
        const year = date.slice(0, 4);
        const key = `${preset.religion}:${preset.name}:${year}`;
        const existing = firstOccurrence.get(key);
        if (!existing || date < asDateOnly(existing.festival.date)) {
          firstOccurrence.set(key, { festival, preset });
        }
      }

      for (const { festival, preset } of firstOccurrence.values()) {
        addEvent({
          name: preset.name,
          religion: preset.religion,
          date: asDateOnly(festival.date),
          countries:
            preset.religion === "SIKH"
              ? SIKH_COUNTRIES
              : preset.religion === "BUDDHIST"
                ? BUDDHIST_COUNTRIES
                : [location.country],
          dateAccuracy: "CALCULATED",
          source: "PANCHANGAM",
        });
      }
    }
  }

  private addDateHolidayEvents(
    startYear: number,
    endYear: number,
    addEvent: (event: Omit<FestivalCalendarEvent, "id">) => void,
  ) {
    const providers: Array<{
      holidays: Holidays;
      religion: "MUSLIM" | "JEWISH" | "CHRISTIAN";
      presets: Array<[RegExp, string]>;
      countries: FestivalCountry[];
      accuracy: FestivalDateAccuracy;
    }> = [
      {
        holidays: new Holidays("AE", { languages: ["en"] }),
        religion: "MUSLIM",
        presets: MUSLIM_PRESETS,
        countries: MUSLIM_COUNTRIES,
        accuracy: "MOON_SIGHTING",
      },
      {
        holidays: new Holidays("IL", { languages: ["en"] }),
        religion: "JEWISH",
        presets: JEWISH_PRESETS,
        countries: JEWISH_COUNTRIES,
        accuracy: "CALCULATED",
      },
      {
        holidays: new Holidays("GB", { languages: ["en"] }),
        religion: "CHRISTIAN",
        presets: CHRISTIAN_PRESETS,
        countries: CHRISTIAN_COUNTRIES,
        accuracy: "CALCULATED",
      },
    ];

    for (let year = startYear; year <= endYear; year += 1) {
      for (const provider of providers) {
        for (const holiday of provider.holidays.getHolidays(year, "en")) {
          if (holiday.substitute) continue;
          const name = matchPreset(holiday.name, provider.presets);
          if (!name) continue;
          addEvent({
            name,
            religion: provider.religion,
            date: asDateOnly(holiday.date),
            countries: provider.countries,
            dateAccuracy: provider.accuracy,
            source: "DATE_HOLIDAYS",
          });
        }
      }
    }
  }

  private addFixedEvents(
    startYear: number,
    endYear: number,
    addEvent: (event: Omit<FestivalCalendarEvent, "id">) => void,
  ) {
    for (let year = startYear; year <= endYear; year += 1) {
      addEvent({
        name: "Lohri",
        religion: "SIKH",
        date: `${year}-01-13`,
        countries: SIKH_COUNTRIES,
        dateAccuracy: "FIXED",
        source: "FIXED_CALENDAR",
      });
      addEvent({
        name: "Vaisakhi",
        religion: "SIKH",
        date: `${year}-04-14`,
        countries: SIKH_COUNTRIES,
        dateAccuracy: "FIXED",
        source: "FIXED_CALENDAR",
      });
      addEvent({
        name: "Bodhi Day",
        religion: "BUDDHIST",
        date: `${year}-12-08`,
        countries: BUDDHIST_COUNTRIES,
        dateAccuracy: "FIXED",
        source: "FIXED_CALENDAR",
      });
    }
  }
}
