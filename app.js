import { CONFIG } from "./config.js";
import {
  CITIES,
  COURSE_MONTHS,
  DEFAULT_EUR_INR,
  HOUSING,
  LAST_CHECKED,
  LIFESTYLE,
  ONE_TIME,
  SOURCES,
  TIERS,
  VISA,
  WORK,
} from "./data.js";
import { formatEUR, formatINR, fromQuery, normalize, plan, tiersFor, toQuery } from "./calc.js";

const form = document.getElementById("controls");
const results = document.getElementById("results");
const notes = document.getElementById("notes");
const peek = document.getElementById("peek");
const tooltip = document.getElementById("tooltip");

let state = fromQuery(location.search);
let current = plan(state);

const eur = formatEUR;
const inr = (e) => formatINR(e * state.rate);
const inrExact = (e) => `₹${Math.round(e * state.rate).toLocaleString("en-IN")}`;
const money = (e, { exact = false } = {}) =>
  `<span class="amt"><span class="inr">${exact ? inrExact(e) : inr(e)}</span><span class="eur">${eur(e)}</span></span>`;
const pct = (n) => `${Math.round(n * 100)}%`;
const years = (months) => `${months / 12} ${months === 12 ? "year" : "years"}`;

// Sends events to whichever of Plausible, Google Analytics or Umami is on the page.
function track(event, props = {}) {
  try {
    window.plausible?.(event, { props });
    window.gtag?.("event", event, props);
    window.umami?.track?.(event, props);
  } catch {
    // Analytics must never break the planner.
  }
}

// ---------- Controls ----------

function chips(name, legend, options, selected) {
  return `<fieldset class="field">
    <legend class="label">${legend}</legend>
    <div class="chips">
      ${options
        .map(
          (o) => `<label class="chip">
            <input type="radio" name="${name}" value="${o.value}"${String(o.value) === String(selected) ? " checked" : ""}>
            <span>${o.label}${o.sub ? `<small>${o.sub}</small>` : ""}</span>
          </label>`,
        )
        .join("")}
    </div>
  </fieldset>`;
}

function tierField() {
  const examples = CITIES[state.city].examples;
  return chips(
    "tier",
    "Type of college",
    tiersFor(state.city).map((t) => ({ value: t, label: TIERS[t].label, sub: examples[t] })),
    state.tier,
  );
}

function feeHint() {
  const [lo, hi] = TIERS[state.tier].range;
  let hint = `Typical: ${eur(lo)} to ${eur(hi)} a year. Use the fee on your offer letter.`;
  if (state.months > 12) hint += ` For ${state.months} months we count ${years(state.months)} of fees.`;
  if (state.fee !== null) hint += ` <button type="button" class="link" data-action="reset-fee">Use the typical fee</button>`;
  return hint;
}

function rentHint() {
  const estimate = CITIES[state.city].rent[state.housing];
  return `Leave empty to use our ${CITIES[state.city].name} estimate: ${eur(estimate)} for a ${HOUSING[state.housing].short.toLowerCase()}.`;
}

function renderControls() {
  form.innerHTML = `
    ${chips("city", "City", Object.entries(CITIES).map(([value, c]) => ({ value, label: c.name })), state.city)}
    ${chips("months", "Course length", COURSE_MONTHS.map((m) => ({ value: m, label: `${m} months` })), state.months)}
    <div data-slot="tier">${tierField()}</div>
    <div class="field">
      <label class="label" for="fee">Tuition fee per year</label>
      <div class="money-input"><span aria-hidden="true">€</span>
        <input id="fee" name="fee" type="number" inputmode="numeric" min="1000" max="100000" step="100" value="${current.feePerYear}">
      </div>
      <p class="hint" data-slot="fee-hint">${feeHint()}</p>
    </div>
    ${chips("housing", "Where you'll live", Object.entries(HOUSING).map(([value, h]) => ({ value, label: h.short })), state.housing)}
    ${chips("lifestyle", "How you'll spend", Object.entries(LIFESTYLE).map(([value, l]) => ({ value, label: l.label })), state.lifestyle)}
    <details class="fine"${state.rent !== null || state.rate !== DEFAULT_EUR_INR ? " open" : ""}>
      <summary>Your own rent and exchange rate</summary>
      <div class="field">
        <label class="label" for="rent">Rent per month</label>
        <div class="money-input"><span aria-hidden="true">€</span>
          <input id="rent" name="rent" type="number" inputmode="numeric" min="100" max="6000" step="10" value="${state.rent ?? ""}" placeholder="${current.monthly.rent}">
        </div>
        <p class="hint" data-slot="rent-hint">${rentHint()}</p>
      </div>
      <div class="field">
        <label class="label" for="rate">Rupees per euro</label>
        <div class="money-input"><span aria-hidden="true">₹</span>
          <input id="rate" name="rate" type="number" inputmode="decimal" min="50" max="250" step="0.5" value="${state.rate}">
        </div>
        <p class="hint">Check today's rate with your bank. Sending money abroad usually costs 1–2% more.</p>
      </div>
    </details>`;
}

// Updates the parts of the form that depend on other choices, without
// re-rendering inputs the visitor may be typing in.
function syncControls({ cityChanged = false } = {}) {
  if (cityChanged) form.querySelector('[data-slot="tier"]').innerHTML = tierField();
  const fee = form.querySelector("#fee");
  if (state.fee === null && document.activeElement !== fee) fee.value = current.feePerYear;
  form.querySelector('[data-slot="fee-hint"]').innerHTML = feeHint();
  form.querySelector("#rent").placeholder = CITIES[state.city].rent[state.housing];
  form.querySelector('[data-slot="rent-hint"]').textContent = rentHint();
}

form.addEventListener("change", (e) => {
  const { name, value, type } = e.target;
  if (type === "radio") {
    const next = { ...state, [name]: value };
    if (name === "tier") next.fee = null;
    setState(next, { cityChanged: name === "city" });
  } else if (type === "number") {
    // On blur, show the value the planner actually used (clamped, or the default).
    if (name === "fee") e.target.value = current.feePerYear;
    if (name === "rate") e.target.value = state.rate;
    if (name === "rent") e.target.value = state.rent ?? "";
  }
});

form.addEventListener("input", (e) => {
  if (e.target.type !== "number") return;
  setState({ ...state, [e.target.name]: e.target.value });
});

form.addEventListener("click", (e) => {
  if (e.target.closest('[data-action="reset-fee"]')) {
    setState({ ...state, fee: null });
    form.querySelector("#fee").value = current.feePerYear;
  }
});

form.addEventListener("submit", (e) => e.preventDefault());

let changeTimer;
function setState(next, opts = {}) {
  state = normalize(next);
  current = plan(state);
  syncControls(opts);
  renderResults();
  const query = toQuery(state);
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => track("plan_changed", summaryProps()), 2000);
}

// ---------- Results ----------

const SEGMENTS = [
  { key: "tuition", label: "Tuition", slot: 1 },
  { key: "rent", label: "Rent", slot: 2 },
  { key: "living", label: "Living costs", slot: 3 },
  { key: "oneTime", label: "One-time costs", slot: 4 },
];

function breakdown(p) {
  const parts = SEGMENTS.map((s) => ({ ...s, value: p.totals[s.key], share: p.totals[s.key] / p.total }));
  return `
    <div class="bar" role="img" aria-label="${parts.map((s) => `${s.label} ${pct(s.share)}`).join(", ")}">
      ${parts
        .map(
          (s) => `<span class="seg s${s.slot}" style="flex-grow:${s.value}" tabindex="0"
            data-tip="<b>${s.label}</b> ${inr(s.value)} · ${eur(s.value)} · ${pct(s.share)}"></span>`,
        )
        .join("")}
    </div>
    <ul class="legend">
      ${parts
        .map(
          (s) => `<li><span class="swatch s${s.slot}" aria-hidden="true"></span><span class="lg-label">${s.label}</span>
            <span class="lg-val">${money(s.value)}</span><span class="lg-pct">${pct(s.share)}</span></li>`,
        )
        .join("")}
    </ul>`;
}

function visaCard(p) {
  const v = p.visa;
  const laterTotal = v.laterLiving + v.laterFees;
  return `<article class="card visa">
    <h2 class="kicker">Money to arrange for your visa</h2>
    <p class="big">${inr(v.total)} <span>${eur(v.total)}</span></p>
    <p class="muted">Your full tuition plus ${eur(VISA.livingFundsPerYear)} for each year of the course. Visa officers check this before you fly.</p>
    <ol class="steps">
      <li>
        <div class="row"><b>Pay your college before you apply</b>${money(v.paidBeforeVisa)}</div>
        <p>At least ${eur(VISA.tuitionPaidBeforeVisa)} of tuition. Fees under ${eur(VISA.tuitionPaidBeforeVisa)} are paid in full. Your offer letter must show what you've paid.</p>
      </li>
      <li>
        <div class="row"><b>Show living-cost money you can use right away</b>${money(v.livingProof)}</div>
        <p>Bank statements covering the last 6 months, yours or a sponsor's. Large or sudden deposits must be explained, and credit cards don't count. An education bond also works.</p>
      </li>
      ${
        v.restOfFirstYear > 0
          ? `<li>
        <div class="row"><b>Have the rest of first-year tuition ready</b>${money(v.restOfFirstYear)}</div>
        <p>Your college wants it, usually before you register. Savings, or an education loan paid straight to the college.</p>
      </li>`
          : ""
      }
      ${
        v.laterYears > 0
          ? `<li>
        <div class="row"><b>Show you can cover year 2</b>${money(laterTotal)}</div>
        <p>${eur(v.laterLiving)} for living plus ${eur(v.laterFees)} of fees, for example from a sponsor's savings and income. The rule asks for ${eur(VISA.livingFundsPerYear)} for every later year, so we count the full amount even for a part year.</p>
      </li>`
          : ""
      }
    </ol>
  </article>`;
}

function realityCard(p) {
  const { realLivingPerYear, minimum, gap } = p.reality;
  const city = CITIES[state.city].name;
  const body =
    gap > 0
      ? `Living in ${city} the way you picked costs about ${eur(realLivingPerYear)} a year (${inr(realLivingPerYear)}). That's ${eur(gap)} more than the minimum, so plan with the real figure.`
      : `Your living budget comes to ${eur(realLivingPerYear)} a year, under the minimum. You still have to show the full ${eur(minimum)}.`;
  return `<article class="card note warn">
    <p class="note-title"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 1 18h18L10 2Zm0 5v5m0 2.5v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span><span class="tag">Heads up</span> ${eur(minimum)} is the visa minimum, not your budget</span></p>
    <p>${body}</p>
  </article>`;
}

function monthlyCard(p) {
  const m = p.monthly;
  const rows = [
    [`Rent (${HOUSING[state.housing].short.toLowerCase()})`, m.rent],
    ["Bills: electricity, heating, broadband", m.bills],
    ["Groceries", m.groceries],
    ["Transport", m.transport],
    ["Phone", m.phone],
    ["Eating out and personal", m.personal],
    ["Books, printing, software", m.course],
  ];
  return `<article class="card">
    <h2 class="kicker">Your monthly budget in ${CITIES[state.city].name}</h2>
    <table class="table">
      <thead><tr><th scope="col">Item</th><th scope="col">Euro</th><th scope="col">Rupees</th></tr></thead>
      <tbody>
        ${rows
          .map(([label, value]) =>
            value === 0
              ? `<tr><th scope="row">${label}</th><td colspan="2" class="muted">Included in rent</td></tr>`
              : `<tr><th scope="row">${label}</th><td>${eur(value)}</td><td>${inrExact(value)}</td></tr>`,
          )
          .join("")}
      </tbody>
      <tfoot><tr><th scope="row">Every month</th><td>${eur(p.perMonth)}</td><td>${inrExact(p.perMonth)}</td></tr></tfoot>
    </table>
  </article>`;
}

function oneTimeCard(p) {
  const o = p.oneTime;
  const n = p.years;
  const rows = [
    ["Visa fee and VFS charge", o.visa],
    [n > 1 ? `IRP card, ${eur(VISA.irpFee)} × ${n} years` : "IRP residence card", o.irp],
    [n > 1 ? `Health insurance, ${eur(ONE_TIME.healthInsurancePerYear)} × ${n} years` : "Health insurance", o.insurance],
    ["Flight from India, one way", o.flight],
    ["Settling in: bedding, kitchen, winter jacket", o.setup],
  ];
  return `<article class="card">
    <h2 class="kicker">One-time costs</h2>
    <table class="table">
      <thead><tr><th scope="col">Item</th><th scope="col">Euro</th><th scope="col">Rupees</th></tr></thead>
      <tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${eur(value)}</td><td>${inrExact(value)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row">Total</th><td>${eur(p.totals.oneTime)}</td><td>${inrExact(p.totals.oneTime)}</td></tr></tfoot>
    </table>
    <p class="hint">Plus a refundable deposit of about ${eur(p.deposit)} (${inrExact(p.deposit)}), usually one month's rent. It's not in the total because you get it back.</p>
  </article>`;
}

function timelineCard(p) {
  const t = p.timeline;
  const items = [
    ["Before your visa application", t.beforeVisa, `Tuition deposit, visa fee and health insurance. The ${eur(VISA.livingFundsPerYear)} stays in your bank on top of this.`],
    ["Before you fly", t.beforeFlying, p.visa.restOfFirstYear > 0 ? "The rest of your first-year tuition, and your flight." : "Your flight."],
    ["First month in Ireland", t.firstMonth, `Deposit, first month's rent and living costs, the ${eur(VISA.irpFee)} IRP card, and settling in.`],
    ["Every month after that", t.everyMonth, "Rent and living costs.", true],
  ];
  return `<article class="card">
    <h2 class="kicker">When you need the money</h2>
    <ol class="timeline">
      ${items.map(([when, value, what, exact]) => `<li><div class="row"><b>${when}</b>${money(value, { exact })}</div><p>${what}</p></li>`).join("")}
    </ol>
  </article>`;
}

function workCard(p) {
  return `<article class="card note">
    <p class="note-title"><span>Part-time work helps with monthly costs, not the visa</span></p>
    <p>On a Stamp 2 permission you can work up to ${WORK.termHoursPerWeek} hours a week in term and ${WORK.holidayHoursPerWeek} in the holidays (June to September, and 15 December to 15 January).
    At the €${WORK.minimumWage.toFixed(2)} minimum wage, ${WORK.termHoursPerWeek} hours a week is about ${eur(p.work.termIncome)} a month before tax,
    ${p.work.share >= 1 ? "enough to cover your monthly costs if you get steady hours" : `roughly ${pct(p.work.share)} of your monthly costs`}.
    Finding a job can take a few weeks, and wages can't count towards your visa funds.</p>
  </article>`;
}

function shareUrl(source) {
  const base = CONFIG.siteUrl || `${location.origin}${location.pathname}`;
  const query = new URLSearchParams(toQuery(state));
  if (source) {
    query.set("utm_source", source);
    query.set("utm_medium", "share");
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

// A booking page when one is set, otherwise an email with the plan link already in it.
function bookingLink() {
  if (CONFIG.bookingUrl) {
    try {
      const url = new URL(CONFIG.bookingUrl);
      url.searchParams.set("utm_source", "cost-planner");
      url.searchParams.set("utm_medium", "cta");
      url.searchParams.set("utm_content", state.city);
      return `href="${url}" target="_blank" rel="noopener"`;
    } catch {
      // Fall through to email.
    }
  }
  const subject = `1:1 call (${CONFIG.bookingPrice}): my Ireland Master's plan`;
  const body = `Hi,\n\nI'd like to book a ${CONFIG.bookingLength} 1:1 call about my plan:\n${shareUrl("email")}\n\nTimes that suit me:\n`;
  return `href="mailto:${CONFIG.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}"`;
}

function ctaCard() {
  return `<aside class="card cta" id="book">
    <h2>Want someone to check your plan?</h2>
    <p>On a ${CONFIG.bookingLength} 1:1 call we go through your budget, how much to borrow, and what your visa bank statements need to show.</p>
    <a class="btn primary big" ${bookingLink()} data-action="book">Book a 1:1 call (${CONFIG.bookingPrice})</a>
    <p class="small">${CONFIG.bookingUrl ? "Bring this page's link to the call. It keeps your numbers." : "This opens an email with your plan's link already in it."}</p>
    ${CONFIG.aboutCallUrl ? `<a class="yt" href="${CONFIG.aboutCallUrl}" target="_blank" rel="noopener" data-action="about_call">What we cover on the call ↗</a><br>` : ""}
    ${
      CONFIG.youtubeUrl
        ? `<a class="yt" href="${CONFIG.youtubeUrl}" target="_blank" rel="noopener" data-action="youtube">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z" fill="currentColor"/></svg>
      Watch the Ireland vlog on YouTube</a>`
        : ""
    }
  </aside>`;
}

function renderResults() {
  const p = current;
  const city = CITIES[state.city];
  results.innerHTML = `
    <p class="summary">${city.name} · ${state.months} months · ${city.examples[state.tier]} · ${HOUSING[state.housing].short} · ${LIFESTYLE[state.lifestyle].label} spending</p>
    <article class="card total">
      <h2 class="kicker">Total for your ${state.months}-month Master's in ${city.name}</h2>
      <p class="hero-num">${inr(p.total)}</p>
      <p class="hero-sub">${eur(p.total)} · about ${inrExact(p.perMonth)} (${eur(p.perMonth)}) a month to live · at ₹${state.rate} to €1</p>
      ${breakdown(p)}
    </article>
    ${visaCard(p)}
    ${realityCard(p)}
    <div class="actions">
      <button type="button" class="btn wa" data-action="whatsapp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .3-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" fill="currentColor"/></svg>
        Send to family on WhatsApp</button>
      <button type="button" class="btn" data-action="copy">Copy link</button>
      <button type="button" class="btn" data-action="print">Save as PDF</button>
    </div>
    ${monthlyCard(p)}
    ${oneTimeCard(p)}
    ${timelineCard(p)}
    ${workCard(p)}
    ${ctaCard()}`;

  peek.innerHTML = `<span><small>Total</small>${inr(p.total)}</span><span><small>Visa funds</small>${inr(p.visa.total)}</span><span class="go">See plan ↓</span>`;
}

function summaryProps() {
  return {
    city: state.city,
    months: state.months,
    tier: state.tier,
    housing: state.housing,
    total_eur: current.total,
  };
}

function shareText() {
  const city = CITIES[state.city];
  return [
    `My Ireland Master's plan: ${city.name}, ${state.months} months, ${city.examples[state.tier]}, ${HOUSING[state.housing].short.toLowerCase()}`,
    `• Total: ${inr(current.total)} (${eur(current.total)})`,
    `• Visa funds to arrange: ${inr(current.visa.total)} (${eur(current.visa.total)})`,
    `• Living costs: ${inrExact(current.perMonth)} a month`,
    `Full breakdown: ${shareUrl("whatsapp")}`,
  ].join("\n");
}

results.addEventListener("click", async (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "whatsapp") {
    track("whatsapp_share", summaryProps());
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener");
  } else if (action === "copy") {
    track("copy_link", summaryProps());
    const button = e.target.closest("button");
    const url = shareUrl("link");
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "Link copied";
      setTimeout(() => (button.textContent = "Copy link"), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  } else if (action === "print") {
    track("save_pdf", summaryProps());
    window.print();
  } else if (action === "book") {
    track("book_call_click", summaryProps());
  } else if (action === "youtube") {
    track("youtube_click", summaryProps());
  } else if (action === "about_call") {
    track("about_call_click", summaryProps());
  }
});

// ---------- Chart tooltip ----------

function showTip(target, x, y) {
  tooltip.innerHTML = target.dataset.tip;
  tooltip.hidden = false;
  const box = tooltip.getBoundingClientRect();
  const left = Math.min(Math.max(8, x - box.width / 2), window.innerWidth - box.width - 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(8, y - box.height - 12)}px`;
}

results.addEventListener("pointermove", (e) => {
  const seg = e.target.closest("[data-tip]");
  if (seg) showTip(seg, e.clientX, e.clientY);
  else tooltip.hidden = true;
});
results.addEventListener("pointerleave", () => (tooltip.hidden = true));
results.addEventListener("focusin", (e) => {
  const seg = e.target.closest("[data-tip]");
  if (!seg) return;
  const r = seg.getBoundingClientRect();
  showTip(seg, r.left + r.width / 2, r.top);
});
results.addEventListener("focusout", () => (tooltip.hidden = true));
window.addEventListener("scroll", () => (tooltip.hidden = true), { passive: true });

// ---------- Footer ----------

function renderNotes() {
  notes.innerHTML = `
    <h2>Where the numbers come from</h2>
    <p>Visa rules and fees are from Immigration Service Delivery (ISD), which runs Irish immigration. Rents are typical asking prices from Daft.ie listings and its 2026 rent reports, rounded. Tuition is a typical 2026/27 non-EU fee for each type of college; your offer letter has the real one. Groceries, transport and other living costs are our estimates for a student.</p>
    <ul>${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join("")}</ul>
    <p class="disclaimer">These are planning estimates, not immigration or financial advice. Rules and prices change, so check irishimmigration.ie and your offer letter before you apply. Figures checked ${LAST_CHECKED}.</p>`;
  document.querySelectorAll("[data-last-checked]").forEach((el) => (el.textContent = LAST_CHECKED));
}

// ---------- Mobile summary bar ----------
// On a phone the form fills the screen, so a bar at the bottom shows the totals
// changing while the visitor picks options, until the results scroll into view.
new IntersectionObserver(([entry]) => {
  peek.hidden = entry.isIntersecting || entry.boundingClientRect.top < 0;
}).observe(results);

renderControls();
renderResults();
renderNotes();
track("plan_viewed", { ...summaryProps(), source: new URLSearchParams(location.search).get("utm_source") || "direct" });
