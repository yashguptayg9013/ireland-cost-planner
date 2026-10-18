// Pure functions: inputs in, numbers out. No DOM here, so it can be unit-tested.
import {
  BILLS,
  CITIES,
  COURSE_MONTHS,
  DEFAULT_EUR_INR,
  HOUSING,
  LIFESTYLE,
  MONTHLY,
  ONE_TIME,
  TIERS,
  VISA,
  WORK,
} from "./data.js";

export const DEFAULTS = {
  city: "dublin",
  months: 12,
  tier: "uni",
  fee: null, // null = use the tier's typical fee
  housing: "shared",
  lifestyle: "typical",
  rent: null, // null = use the city estimate
  rate: DEFAULT_EUR_INR,
};

const roundTo5 = (n) => Math.round(n / 5) * 5;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function tiersFor(city) {
  return Object.keys(TIERS).filter((t) => CITIES[city].examples[t]);
}

// Turns anything (URL params, form values) into a valid state.
export function normalize(raw = {}) {
  const s = { ...DEFAULTS };
  if (raw.city in CITIES) s.city = raw.city;
  const months = Number(raw.months);
  if (COURSE_MONTHS.includes(months)) s.months = months;
  const tiers = tiersFor(s.city);
  s.tier = tiers.includes(raw.tier) ? raw.tier : tiers.includes(DEFAULTS.tier) ? DEFAULTS.tier : tiers[0];
  if (raw.housing in HOUSING) s.housing = raw.housing;
  if (raw.lifestyle in LIFESTYLE) s.lifestyle = raw.lifestyle;
  s.fee = positive(raw.fee, 1000, 100000);
  s.rent = positive(raw.rent, 100, 6000);
  s.rate = positive(raw.rate, 50, 250, 2) ?? DEFAULT_EUR_INR;
  return s;
}

function positive(value, lo, hi, decimals = 0) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Number(clamp(n, lo, hi).toFixed(decimals)) : null;
}

export function plan(input) {
  const s = normalize(input);
  const city = CITIES[s.city];
  const factor = LIFESTYLE[s.lifestyle].factor;
  const years = Math.ceil(s.months / 12); // academic years started: IRP cards, insurance, visa-fund years

  const feePerYear = s.fee ?? TIERS[s.tier].fee;
  const tuition = Math.round((feePerYear * s.months) / 12);
  const rent = s.rent ?? city.rent[s.housing];

  const monthly = {
    rent,
    bills: BILLS[s.housing],
    groceries: roundTo5(city.groceries * factor),
    transport: city.transport,
    phone: MONTHLY.phone,
    personal: roundTo5(MONTHLY.personal * factor),
    course: MONTHLY.course,
  };
  const livingPerMonth = sum(monthly) - rent;
  const perMonth = rent + livingPerMonth;

  const oneTime = {
    visa: VISA.visaApplication,
    irp: VISA.irpFee * years,
    insurance: ONE_TIME.healthInsurancePerYear * years,
    flight: ONE_TIME.flight,
    setup: ONE_TIME.setup,
  };

  const totals = {
    tuition,
    rent: rent * s.months,
    living: livingPerMonth * s.months,
    oneTime: sum(oneTime),
  };
  const total = sum(totals);

  // What ISD wants to see. Partial later years are counted as a full €10,000,
  // because the rule says "each subsequent year" without pro-rating.
  const firstYearFee = Math.min(feePerYear, tuition);
  const paidBeforeVisa = Math.min(firstYearFee, VISA.tuitionPaidBeforeVisa);
  const visa = {
    paidBeforeVisa,
    livingProof: VISA.livingFundsPerYear,
    restOfFirstYear: firstYearFee - paidBeforeVisa,
    laterYears: years - 1,
    laterFees: tuition - firstYearFee,
    laterLiving: VISA.livingFundsPerYear * (years - 1),
  };
  visa.total = visa.paidBeforeVisa + visa.livingProof + visa.restOfFirstYear + visa.laterFees + visa.laterLiving;

  const deposit = rent;
  const timeline = {
    beforeVisa: paidBeforeVisa + VISA.visaApplication + ONE_TIME.healthInsurancePerYear,
    beforeFlying: visa.restOfFirstYear + ONE_TIME.flight,
    firstMonth: deposit + perMonth + VISA.irpFee + ONE_TIME.setup,
    everyMonth: perMonth,
  };

  const realLivingPerYear = perMonth * 12;
  const termIncome = Math.round((WORK.termHoursPerWeek * WORK.minimumWage * 52) / 12);

  return {
    state: s,
    years,
    feePerYear,
    monthly,
    livingPerMonth,
    perMonth,
    oneTime,
    totals,
    total,
    deposit,
    visa,
    timeline,
    reality: {
      realLivingPerYear,
      minimum: VISA.livingFundsPerYear,
      gap: realLivingPerYear - VISA.livingFundsPerYear,
    },
    work: { termIncome, share: termIncome / perMonth },
  };
}

function sum(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

// URL <-> state. Only values that differ from the defaults go in the URL,
// so links in a video description stay short (e.g. ?city=cork).
export function toQuery(state) {
  const s = normalize(state);
  const defaults = { ...DEFAULTS, tier: normalize({ city: s.city }).tier };
  const p = new URLSearchParams();
  for (const key of Object.keys(DEFAULTS)) {
    if (s[key] !== null && s[key] !== defaults[key]) p.set(key, String(s[key]));
  }
  return p.toString();
}

export function fromQuery(search) {
  return normalize(Object.fromEntries(new URLSearchParams(search)));
}

// ₹ in the way Indian families read it: ₹85,000 or ₹24.6 lakh.
export function formatINR(rupees) {
  const r = Math.round(rupees);
  if (Math.abs(r) >= 1e7) return `₹${trim(r / 1e7, 2)} crore`;
  if (Math.abs(r) >= 1e5) return `₹${trim(r / 1e5, 1)} lakh`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export function formatEUR(euro) {
  return `€${Math.round(euro).toLocaleString("en-IE")}`;
}

function trim(n, digits) {
  return n.toFixed(digits).replace(/\.?0+$/, "");
}
