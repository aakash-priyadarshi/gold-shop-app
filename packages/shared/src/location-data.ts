/**
 * Location data for dropdown menus
 * States and major cities organized by country code
 */

export interface StateData {
  code: string;
  name: string;
}

export interface CityData {
  name: string;
  state: string; // state code
}

// ── India States & Union Territories ──────────────────────
export const INDIA_STATES: StateData[] = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "DD", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "PY", name: "Puducherry" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

// ── Nepal Provinces ──────────────────────
export const NEPAL_STATES: StateData[] = [
  { code: "P1", name: "Koshi Province" },
  { code: "P2", name: "Madhesh Province" },
  { code: "P3", name: "Bagmati Province" },
  { code: "P4", name: "Gandaki Province" },
  { code: "P5", name: "Lumbini Province" },
  { code: "P6", name: "Karnali Province" },
  { code: "P7", name: "Sudurpashchim Province" },
];

// ── UAE Emirates ──────────────────────
export const UAE_STATES: StateData[] = [
  { code: "AUH", name: "Abu Dhabi" },
  { code: "AJM", name: "Ajman" },
  { code: "DXB", name: "Dubai" },
  { code: "FUJ", name: "Fujairah" },
  { code: "RAK", name: "Ras Al Khaimah" },
  { code: "SHJ", name: "Sharjah" },
  { code: "UAQ", name: "Umm Al Quwain" },
];

// ── Major Cities by State (India) ──────────────────────
export const INDIA_CITIES: CityData[] = [
  // Andhra Pradesh
  { name: "Visakhapatnam", state: "AP" },
  { name: "Vijayawada", state: "AP" },
  { name: "Guntur", state: "AP" },
  { name: "Nellore", state: "AP" },
  { name: "Tirupati", state: "AP" },
  { name: "Rajahmundry", state: "AP" },
  { name: "Kakinada", state: "AP" },
  { name: "Kurnool", state: "AP" },
  { name: "Anantapur", state: "AP" },
  // Assam
  { name: "Guwahati", state: "AS" },
  { name: "Silchar", state: "AS" },
  { name: "Dibrugarh", state: "AS" },
  { name: "Jorhat", state: "AS" },
  // Bihar
  { name: "Patna", state: "BR" },
  { name: "Gaya", state: "BR" },
  { name: "Muzaffarpur", state: "BR" },
  { name: "Bhagalpur", state: "BR" },
  { name: "Darbhanga", state: "BR" },
  { name: "Purnia", state: "BR" },
  // Chandigarh
  { name: "Chandigarh", state: "CH" },
  // Chhattisgarh
  { name: "Raipur", state: "CT" },
  { name: "Bhilai", state: "CT" },
  { name: "Bilaspur", state: "CT" },
  { name: "Korba", state: "CT" },
  // Delhi
  { name: "New Delhi", state: "DL" },
  { name: "Delhi", state: "DL" },
  // Goa
  { name: "Panaji", state: "GA" },
  { name: "Margao", state: "GA" },
  { name: "Vasco da Gama", state: "GA" },
  // Gujarat
  { name: "Ahmedabad", state: "GJ" },
  { name: "Surat", state: "GJ" },
  { name: "Vadodara", state: "GJ" },
  { name: "Rajkot", state: "GJ" },
  { name: "Bhavnagar", state: "GJ" },
  { name: "Jamnagar", state: "GJ" },
  { name: "Junagadh", state: "GJ" },
  { name: "Gandhinagar", state: "GJ" },
  { name: "Anand", state: "GJ" },
  { name: "Navsari", state: "GJ" },
  // Haryana
  { name: "Gurugram", state: "HR" },
  { name: "Faridabad", state: "HR" },
  { name: "Ambala", state: "HR" },
  { name: "Panipat", state: "HR" },
  { name: "Karnal", state: "HR" },
  { name: "Hisar", state: "HR" },
  { name: "Rohtak", state: "HR" },
  // Himachal Pradesh
  { name: "Shimla", state: "HP" },
  { name: "Manali", state: "HP" },
  { name: "Dharamshala", state: "HP" },
  // Jammu and Kashmir
  { name: "Srinagar", state: "JK" },
  { name: "Jammu", state: "JK" },
  // Jharkhand
  { name: "Ranchi", state: "JH" },
  { name: "Jamshedpur", state: "JH" },
  { name: "Dhanbad", state: "JH" },
  { name: "Bokaro", state: "JH" },
  // Karnataka
  { name: "Bengaluru", state: "KA" },
  { name: "Mysuru", state: "KA" },
  { name: "Mangaluru", state: "KA" },
  { name: "Hubli-Dharwad", state: "KA" },
  { name: "Belagavi", state: "KA" },
  { name: "Gulbarga", state: "KA" },
  { name: "Davanagere", state: "KA" },
  { name: "Bellary", state: "KA" },
  { name: "Shimoga", state: "KA" },
  // Kerala
  { name: "Thiruvananthapuram", state: "KL" },
  { name: "Kochi", state: "KL" },
  { name: "Kozhikode", state: "KL" },
  { name: "Thrissur", state: "KL" },
  { name: "Kollam", state: "KL" },
  { name: "Kannur", state: "KL" },
  { name: "Palakkad", state: "KL" },
  // Madhya Pradesh
  { name: "Bhopal", state: "MP" },
  { name: "Indore", state: "MP" },
  { name: "Jabalpur", state: "MP" },
  { name: "Gwalior", state: "MP" },
  { name: "Ujjain", state: "MP" },
  { name: "Sagar", state: "MP" },
  { name: "Dewas", state: "MP" },
  // Maharashtra
  { name: "Mumbai", state: "MH" },
  { name: "Pune", state: "MH" },
  { name: "Nagpur", state: "MH" },
  { name: "Nashik", state: "MH" },
  { name: "Thane", state: "MH" },
  { name: "Aurangabad", state: "MH" },
  { name: "Solapur", state: "MH" },
  { name: "Kolhapur", state: "MH" },
  { name: "Navi Mumbai", state: "MH" },
  { name: "Amravati", state: "MH" },
  { name: "Sangli", state: "MH" },
  // Odisha
  { name: "Bhubaneswar", state: "OR" },
  { name: "Cuttack", state: "OR" },
  { name: "Rourkela", state: "OR" },
  { name: "Berhampur", state: "OR" },
  // Punjab
  { name: "Ludhiana", state: "PB" },
  { name: "Amritsar", state: "PB" },
  { name: "Jalandhar", state: "PB" },
  { name: "Patiala", state: "PB" },
  { name: "Bathinda", state: "PB" },
  { name: "Mohali", state: "PB" },
  // Rajasthan
  { name: "Jaipur", state: "RJ" },
  { name: "Jodhpur", state: "RJ" },
  { name: "Udaipur", state: "RJ" },
  { name: "Kota", state: "RJ" },
  { name: "Ajmer", state: "RJ" },
  { name: "Bikaner", state: "RJ" },
  { name: "Alwar", state: "RJ" },
  { name: "Bhilwara", state: "RJ" },
  // Tamil Nadu
  { name: "Chennai", state: "TN" },
  { name: "Coimbatore", state: "TN" },
  { name: "Madurai", state: "TN" },
  { name: "Tiruchirappalli", state: "TN" },
  { name: "Salem", state: "TN" },
  { name: "Tirunelveli", state: "TN" },
  { name: "Erode", state: "TN" },
  { name: "Vellore", state: "TN" },
  { name: "Thoothukudi", state: "TN" },
  // Telangana
  { name: "Hyderabad", state: "TG" },
  { name: "Warangal", state: "TG" },
  { name: "Nizamabad", state: "TG" },
  { name: "Karimnagar", state: "TG" },
  { name: "Khammam", state: "TG" },
  { name: "Secunderabad", state: "TG" },
  // Uttar Pradesh
  { name: "Lucknow", state: "UP" },
  { name: "Kanpur", state: "UP" },
  { name: "Agra", state: "UP" },
  { name: "Varanasi", state: "UP" },
  { name: "Prayagraj", state: "UP" },
  { name: "Meerut", state: "UP" },
  { name: "Noida", state: "UP" },
  { name: "Ghaziabad", state: "UP" },
  { name: "Bareilly", state: "UP" },
  { name: "Aligarh", state: "UP" },
  { name: "Moradabad", state: "UP" },
  { name: "Gorakhpur", state: "UP" },
  { name: "Jhansi", state: "UP" },
  { name: "Mathura", state: "UP" },
  // Uttarakhand
  { name: "Dehradun", state: "UK" },
  { name: "Haridwar", state: "UK" },
  { name: "Rishikesh", state: "UK" },
  { name: "Haldwani", state: "UK" },
  // West Bengal
  { name: "Kolkata", state: "WB" },
  { name: "Howrah", state: "WB" },
  { name: "Durgapur", state: "WB" },
  { name: "Asansol", state: "WB" },
  { name: "Siliguri", state: "WB" },
  { name: "Bardhaman", state: "WB" },
  // Arunachal Pradesh
  { name: "Itanagar", state: "AR" },
  // Manipur
  { name: "Imphal", state: "MN" },
  // Meghalaya
  { name: "Shillong", state: "ML" },
  // Mizoram
  { name: "Aizawl", state: "MZ" },
  // Nagaland
  { name: "Kohima", state: "NL" },
  { name: "Dimapur", state: "NL" },
  // Sikkim
  { name: "Gangtok", state: "SK" },
  // Tripura
  { name: "Agartala", state: "TR" },
  // Puducherry
  { name: "Puducherry", state: "PY" },
  // Ladakh
  { name: "Leh", state: "LA" },
];

// ── Nepal Cities ──────────────────────
export const NEPAL_CITIES: CityData[] = [
  { name: "Kathmandu", state: "P3" },
  { name: "Pokhara", state: "P4" },
  { name: "Lalitpur", state: "P3" },
  { name: "Bharatpur", state: "P3" },
  { name: "Birgunj", state: "P2" },
  { name: "Biratnagar", state: "P1" },
  { name: "Dharan", state: "P1" },
  { name: "Janakpur", state: "P2" },
  { name: "Butwal", state: "P5" },
  { name: "Hetauda", state: "P3" },
  { name: "Nepalgunj", state: "P5" },
  { name: "Bhaktapur", state: "P3" },
  { name: "Dhangadhi", state: "P7" },
  { name: "Itahari", state: "P1" },
];

// ── UAE Cities ──────────────────────
export const UAE_CITIES: CityData[] = [
  { name: "Dubai", state: "DXB" },
  { name: "Abu Dhabi", state: "AUH" },
  { name: "Sharjah", state: "SHJ" },
  { name: "Ajman", state: "AJM" },
  { name: "Ras Al Khaimah", state: "RAK" },
  { name: "Fujairah", state: "FUJ" },
  { name: "Umm Al Quwain", state: "UAQ" },
  { name: "Al Ain", state: "AUH" },
];

// ── Lookup helpers ──────────────────────

/**
 * Get states for a given country code
 */
export function getStatesForCountry(countryCode: string): StateData[] {
  switch (countryCode) {
    case "IN":
      return INDIA_STATES;
    case "NP":
      return NEPAL_STATES;
    case "AE":
      return UAE_STATES;
    default:
      return [];
  }
}

/**
 * Get cities for a given country code, optionally filtered by state
 */
export function getCitiesForCountry(
  countryCode: string,
  stateCode?: string,
): CityData[] {
  let cities: CityData[];
  switch (countryCode) {
    case "IN":
      cities = INDIA_CITIES;
      break;
    case "NP":
      cities = NEPAL_CITIES;
      break;
    case "AE":
      cities = UAE_CITIES;
      break;
    default:
      return [];
  }
  if (stateCode) {
    return cities.filter((c) => c.state === stateCode);
  }
  return cities;
}

/**
 * Get state name from code
 */
export function getStateName(
  countryCode: string,
  stateCode: string,
): string | undefined {
  const states = getStatesForCountry(countryCode);
  return states.find((s) => s.code === stateCode)?.name;
}

/**
 * Get country name from code (for display)
 */
export function getCountryName(code: string): string {
  const map: Record<string, string> = {
    IN: "India",
    NP: "Nepal",
    AE: "UAE",
    US: "United States",
    GB: "United Kingdom",
    UK: "United Kingdom",
    EU: "Europe",
    AU: "Australia",
    CA: "Canada",
  };
  return map[code] || code;
}
