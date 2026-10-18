// Every cost assumption lives in this file. Update it once a year
// (rents move in Daft.ie's quarterly reports; visa rules on irishimmigration.ie)
// and change LAST_CHECKED. All amounts are in euro.

export const LAST_CHECKED = "19 October 2026";

// Rupees per euro. Visitors can change it on the page.
export const DEFAULT_EUR_INR = 110;

// Immigration Service Delivery (ISD) rules for non-EEA students who need a visa.
export const VISA = {
  // Immediate access for year one, "ready access" to the same for each later year.
  livingFundsPerYear: 10000,
  // Tuition you must pay the college before applying. Fees below this are paid in full.
  tuitionPaidBeforeVisa: 6000,
  // Irish Residence Permit card: first registration and every yearly renewal.
  irpFee: 300,
  // Single-entry long-stay (D) visa fee plus the VFS service charge in India.
  visaApplication: 90,
};

// Stamp 2 work rules and the 2026 national minimum wage (age 20+).
export const WORK = {
  termHoursPerWeek: 20,
  holidayHoursPerWeek: 40,
  minimumWage: 14.15,
};

export const ONE_TIME = {
  healthInsurancePerYear: 200, // basic student plan that satisfies the visa rule
  flight: 450, // one-way India to Ireland, booked a month or two ahead
  setup: 350, // bedding, kitchen basics, a winter jacket, SIM card
};

export const HOUSING = {
  shared: { label: "Room in a shared house", short: "Shared room" },
  residence: { label: "Student residence (bills included)", short: "Student residence" },
  studio: { label: "Your own studio", short: "Own studio" },
};

// Monthly bills on top of rent: electricity, heating, broadband.
export const BILLS = { shared: 70, residence: 0, studio: 150 };

export const LIFESTYLE = {
  budget: { label: "Careful", factor: 0.8 },
  typical: { label: "Typical", factor: 1 },
  comfortable: { label: "Comfortable", factor: 1.35 },
};

// Monthly costs that scale with lifestyle (groceries come from the city).
export const MONTHLY = {
  phone: 20,
  personal: 150, // eating out, toiletries, a night out, the odd trip
  course: 30, // printing, books, software
};

// Annual non-EU tuition for a taught Master's, 2026/27. "range" is shown as a hint;
// visitors should enter the exact fee from their offer letter.
export const TIERS = {
  top: { label: "Top-ranked university", fee: 27000, range: [22000, 34000] },
  uni: { label: "University", fee: 20000, range: [16000, 28000] },
  tu: { label: "Technological university", fee: 15000, range: [13000, 18000] },
  private: { label: "Independent college", fee: 12500, range: [9500, 15000] },
};

// Rents are typical monthly asking prices from Daft.ie listings and its 2026 rent
// reports, rounded. "examples" names the institutions in each tier for that city.
export const CITIES = {
  dublin: {
    name: "Dublin",
    rent: { shared: 1050, residence: 1450, studio: 1950 },
    groceries: 300,
    transport: 75,
    examples: { top: "Trinity, UCD", uni: "DCU", tu: "TU Dublin", private: "Griffith, DBS, NCI" },
  },
  cork: {
    name: "Cork",
    rent: { shared: 800, residence: 1100, studio: 1500 },
    groceries: 270,
    transport: 50,
    examples: { uni: "UCC", tu: "MTU", private: "Griffith Cork" },
  },
  galway: {
    name: "Galway",
    rent: { shared: 800, residence: 1100, studio: 1500 },
    groceries: 270,
    transport: 45,
    examples: { uni: "University of Galway", tu: "ATU" },
  },
  limerick: {
    name: "Limerick",
    rent: { shared: 620, residence: 950, studio: 1250 },
    groceries: 260,
    transport: 45,
    examples: { uni: "University of Limerick", tu: "TUS" },
  },
  maynooth: {
    name: "Maynooth",
    rent: { shared: 850, residence: 1150, studio: 1550 },
    groceries: 270,
    transport: 40,
    examples: { uni: "Maynooth University" },
  },
  waterford: {
    name: "Waterford",
    rent: { shared: 620, residence: 900, studio: 1200 },
    groceries: 260,
    transport: 35,
    examples: { tu: "SETU" },
  },
};

export const COURSE_MONTHS = [12, 16, 18, 24];

export const SOURCES = [
  {
    label: "ISD: Information on student finances (€10,000 a year)",
    url: "https://www.irishimmigration.ie/coming-to-study-in-ireland/what-are-my-study-options/a-fee-paying-private-primary-or-secondary-school/information-on-student-finances/",
  },
  {
    label: "ISD: Student finance requirements from 30 June 2025",
    url: "https://www.irishimmigration.ie/reminder-on-student-finance-requirements-from-30-june-2025/",
  },
  {
    label: "ISD: How to apply for a long-term study visa (fees paid before applying)",
    url: "https://www.irishimmigration.ie/coming-to-study-in-ireland/what-are-my-study-visa-options/how-to-apply-for-long-term-study-visa/",
  },
  {
    label: "ISD: Registering your permission (€300 IRP fee)",
    url: "https://www.irishimmigration.ie/registering-your-immigration-permission/how-to-register-your-immigration-permission-for-the-first-time/required-documents/",
  },
  { label: "Daft.ie rent reports and live listings", url: "https://www.daft.ie/report" },
  {
    label: "Citizens Information: minimum wage",
    url: "https://www.citizensinformation.ie/en/employment/employment-rights-and-conditions/pay-and-employment/minimum-wage/",
  },
];
