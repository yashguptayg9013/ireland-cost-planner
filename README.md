# Ireland Master's Cost Planner

Pick a city and course length. The page shows tuition, rent, living costs and the funds a student must show for an Irish study visa, in euro and rupees. It ends with **Book a 1:1 call (₹500)**.

Plain HTML, CSS and JavaScript. No build step and no dependencies, so it loads fast on a phone and runs on GitHub Pages as it is.

## Run it

```bash
npm start
```

Then open http://localhost:8080. (`npm start` runs `python3 -m http.server 8080`. The page uses ES modules, so opening `index.html` straight from Finder won't work.)

```bash
npm test
```

Runs the calculation tests with Node's built-in test runner.

## Before you publish

1. **`config.js`**: set `bookingUrl` (Topmate, Calendly with payments, or a Razorpay page) and `youtubeUrl`. While `bookingUrl` is empty, the booking button opens an email to `bookingEmail` with the visitor's plan link in it. While `youtubeUrl` is empty, the YouTube link is hidden. `siteUrl` is the page's public address, which shared links use.
2. **Analytics (optional)**: paste a Plausible, Google Analytics or Umami snippet into `<head>` in `index.html`. The page already sends these events to whichever one it finds:

   | Event | When |
   |---|---|
   | `plan_viewed` | Page load, with `source` from `utm_source` |
   | `plan_changed` | Two seconds after the visitor stops changing options |
   | `whatsapp_share`, `copy_link`, `save_pdf` | Share buttons |
   | `book_call_click` | The booking button (the conversion) |
   | `youtube_click`, `about_call_click` | The YouTube link and the link to your call page |

3. **Social preview image (optional)**: WhatsApp and X show a bigger preview with a 1200×630 image. Add `og-image.png` and the line `<meta property="og:image" content="https://…/og-image.png">` (it must be a full URL).

## Put it on GitHub Pages

Same setup as the Bill Reader demo:

1. Create a repository called `ireland-cost-planner` and push this folder to it.
2. **Settings → Pages → Deploy from a branch**, pick `main` and `/ (root)`.
3. The page goes live at `https://yashguptayg9013.github.io/ireland-cost-planner/`.

## Links for video descriptions

Options go in the URL, so you can link each video to a planner that's already filled in:

| Video about | Link |
|---|---|
| Cost of living in Cork | `…/ireland-cost-planner/?city=cork&utm_source=youtube&utm_campaign=cork-costs` |
| Trinity or UCD | `…/?city=dublin&tier=top&utm_source=youtube` |
| 2-year Master's | `…/?months=24&utm_source=youtube` |
| Student residences | `…/?housing=residence&utm_source=youtube` |

Keys: `city` (dublin, cork, galway, limerick, maynooth, waterford), `months` (12, 16, 18, 24), `tier` (top, uni, tu, private), `fee`, `housing` (shared, residence, studio), `lifestyle` (budget, typical, comfortable), `rent`, `rate`. The planner ignores `utm_*` values but your analytics records them.

## How the numbers work

Every assumption lives in **`data.js`**, so the yearly update happens in one file. The maths is in `calc.js` and has tests in `calc.test.js`.

- **Total cost** = tuition + rent × months + living costs × months + one-time costs (visa fee and VFS charge, the €300 IRP card each year, health insurance each year, flight, settling in). The refundable deposit is shown but not added.
- **Visa funds**, from Immigration Service Delivery's rules:
  - at least €6,000 of tuition paid before you apply (fees under €6,000 are paid in full)
  - immediate access to €10,000 for living costs, shown with 6 months of bank statements or an education bond
  - the rest of first-year tuition
  - for courses longer than 12 months, another €10,000 plus that year's fees. The rule says "each subsequent year" without pro-rating, so a part year counts as a full €10,000.

  The total always comes to course tuition + €10,000 per year started.
- **Tuition** for courses longer than 12 months is the yearly fee × months ÷ 12.
- **Living costs** = city rent for the chosen housing + bills + groceries + transport + phone + personal + course costs. "Careful" and "Comfortable" scale groceries and personal spending by 0.8 and 1.35.

### Yearly update checklist (each September)

- [ ] Visa rules: `VISA` against the ISD student finances page
- [ ] Rents: `CITIES[*].rent` against Daft.ie's latest rent report
- [ ] Tuition ranges: `TIERS`, for the new academic year
- [ ] Minimum wage: `WORK.minimumWage` (it changes every 1 January)
- [ ] Default exchange rate: `DEFAULT_EUR_INR`
- [ ] `LAST_CHECKED`

## Product notes

- **Who it's for:** Indian students planning a Master's in Ireland, who mostly arrive from a YouTube video on a phone. The person paying is often a parent.
- **The funnel:** video → planner pre-filled for that video → WhatsApp share to family → booked call. `plan_viewed` → `book_call_click` is the number to watch.
- **Decisions:**
  - Rupees come first and big amounts are shown in lakh, the way families talk about money.
  - "Send to family on WhatsApp" sends a short summary with a link back to the same plan.
  - On a phone the form fills the screen, so a bar at the bottom shows the totals changing as you choose options.
  - The page says plainly that €10,000 is the visa minimum, not a real budget. Being honest about that builds the trust the paid call depends on.
  - Every figure links to its source and shows the date it was checked.

## Files

| File | What it does |
|---|---|
| `index.html` | Page shell and meta tags |
| `styles.css` | Layout, light and dark themes, print styles for "Save as PDF" |
| `app.js` | Form, results, sharing, analytics events |
| `calc.js` | Pure calculation, URL state and ₹ formatting |
| `data.js` | Every cost assumption and source link |
| `config.js` | Your booking, YouTube and site links |
| `calc.test.js` | Unit tests |
