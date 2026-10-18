import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEUR, formatINR, fromQuery, normalize, plan, toQuery } from "./calc.js";
import { CITIES, COURSE_MONTHS } from "./data.js";

test("Dublin, 12 months, shared room, typical lifestyle", () => {
  const p = plan({ city: "dublin", months: 12 });
  assert.equal(p.feePerYear, 20000);
  assert.equal(p.perMonth, 1050 + 70 + 300 + 75 + 20 + 150 + 30);
  assert.deepEqual(p.totals, { tuition: 20000, rent: 12600, living: 7740, oneTime: 1390 });
  assert.equal(p.total, 41730);
  assert.equal(p.visa.paidBeforeVisa, 6000);
  assert.equal(p.visa.restOfFirstYear, 14000);
  assert.equal(p.visa.total, 30000);
  assert.equal(p.deposit, 1050);
});

test("an 18-month course needs a second year of visa funds and a second IRP card", () => {
  const p = plan({ city: "cork", months: 18, fee: 20000 });
  assert.equal(p.years, 2);
  assert.equal(p.totals.tuition, 30000);
  assert.equal(p.visa.laterFees, 10000);
  assert.equal(p.visa.laterLiving, 10000);
  assert.equal(p.visa.total, 30000 + 20000);
  assert.equal(p.oneTime.irp, 600);
  assert.equal(p.oneTime.insurance, 400);
});

test("fees under €6,000 are paid in full before the visa", () => {
  const p = plan({ fee: 5000 });
  assert.equal(p.visa.paidBeforeVisa, 5000);
  assert.equal(p.visa.restOfFirstYear, 0);
});

test("visa funds always equal course tuition plus €10,000 per started year", () => {
  for (const city of Object.keys(CITIES)) {
    for (const months of COURSE_MONTHS) {
      const p = plan({ city, months, housing: "studio", lifestyle: "comfortable" });
      assert.equal(p.visa.total, p.totals.tuition + 10000 * Math.ceil(months / 12), `${city} ${months}`);
    }
  }
});

test("rent override replaces the city estimate and sets the deposit", () => {
  const p = plan({ city: "galway", rent: 700 });
  assert.equal(p.monthly.rent, 700);
  assert.equal(p.totals.rent, 8400);
  assert.equal(p.deposit, 700);
});

test("lifestyle scales groceries and personal spending only", () => {
  const careful = plan({ lifestyle: "budget" });
  const comfy = plan({ lifestyle: "comfortable" });
  assert.equal(careful.monthly.groceries, 240);
  assert.equal(comfy.monthly.personal, 205);
  assert.equal(careful.monthly.transport, comfy.monthly.transport);
});

test("normalize rejects bad input and picks a tier the city has", () => {
  const s = normalize({ city: "paris", months: "7", housing: "castle", fee: "-5", rate: "abc" });
  assert.equal(s.city, "dublin");
  assert.equal(s.months, 12);
  assert.equal(s.housing, "shared");
  assert.equal(s.fee, null);
  assert.equal(s.rate, 110);
  assert.equal(normalize({ city: "waterford", tier: "top" }).tier, "tu");
  assert.equal(normalize({ fee: "999999" }).fee, 100000);
  assert.equal(normalize({ rate: "109.456" }).rate, 109.46);
});

test("URL round-trip keeps only non-default values", () => {
  assert.equal(toQuery({}), "");
  assert.equal(toQuery({ city: "waterford" }), "city=waterford");
  const state = { city: "cork", months: 18, tier: "tu", fee: 16500, housing: "residence", lifestyle: "budget", rent: 950, rate: 108 };
  assert.deepEqual(fromQuery(toQuery(state)), state);
});

test("rupees read the Indian way", () => {
  assert.equal(formatINR(85000), "₹85,000");
  assert.equal(formatINR(186450), "₹1.9 lakh");
  assert.equal(formatINR(3000000), "₹30 lakh");
  assert.equal(formatINR(12345678), "₹1.23 crore");
  assert.equal(formatEUR(41730), "€41,730");
});
