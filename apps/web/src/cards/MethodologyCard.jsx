import { C, Card, CardHead } from "../ui.jsx";

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-1" style={{ color: C.text }}>{title}</h4>
      <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{children}</p>
    </div>
  );
}

export default function MethodologyCard({ city }) {
  return (
    <Card id="methodology">
      <CardHead kicker="Methodology" title="How to read these numbers — and what they can't tell you"
        sub="Every figure on this page is recomputed from the official record by a committed pipeline. Here is exactly how, and the limits we don't paper over." />

      <Section title="What the change is — and isn't">
        The warming you see here is the <em>combined</em> effect of at least four things, and a single
        station can't fully separate them: (1) the regional/global climate trend, (2) the urban heat
        island as {city.urbanShort} was built up around the gauge, (3) local land-use and land-cover
        change, and (4) changes in instruments and observing practice over 130 years. We never claim a
        number is "climate change" alone. The control-experiment card is the honest tool here: differencing
        {" "}{city.shortName} against an open-desert station that shares the regional climate isolates the
        part that is the city itself (~half of the night warming since 1948), and the global-context card
        sets both against published background rates.
      </Section>

      <Section title="Trends and uncertainty">
        Trends are ordinary least-squares fits to yearly means over the selected window, reported per
        decade. The ± is a 95% interval from a <strong>moving-block bootstrap</strong>: we resample the
        fit residuals in multi-year blocks (so short-range year-to-year persistence is preserved) a
        thousand times and take the 2.5–97.5 percentile spread of the slope. That runs wider than a
        textbook OLS standard error, which assumes each year is independent. It still does not capture
        every source of climate autocorrelation, so read it as a floor on the uncertainty. The headline
        trends are large enough that they stay clearly significant under this wider interval.
      </Section>

      <Section title="Why a fixed 1970s baseline">
        Anomalies compare each year with this station's own {city.baseline.start}–{city.baseline.end}
        {" "}average — a <em>fixed</em> reference, not a rolling 30-year "normal." Rolling normals quietly
        fold decades of past warming into what counts as "normal," which hides exactly the trend we're
        trying to show. The 1970s are recent enough to have a dense, modern observing record and early
        enough to predate most of the metro's explosive growth.
      </Section>

      <Section title="Station continuity">
        The live record is NOAA's ThreadEx threaded series for Phoenix (<code>PHXthr 9</code>), which
        splices the downtown gauge (1896–1933) onto Sky Harbor (1933–present); cards that lean on the
        early record say so. The hourly diurnal curves stitch two ISD station identifiers
        (<code>99999923183</code> pre-1973, <code>72278023183</code> after). Station moves, instrument
        swaps, and observing-practice changes can introduce artificial steps; we don't independently
        homogenize, which is another reason the urban–rural <em>difference</em> — where shared artifacts
        tend to cancel — is the load-bearing comparison rather than any single absolute trend.
      </Section>

      <Section title="Data hygiene and freshness">
        Years missing more than 36 days of observations are excluded, as is the still-incomplete current
        year (both computed dynamically — no hardcoded cutoffs). Precomputed datasets are stamped with
        their build date and coverage year; the page shows what they run through and warns if any has
        fallen behind the live record. Reproduce or audit any figure with the stdlib pipelines in
        {" "}<code>analysis/</code> — <code>verify_v0.py</code> re-derives the headline numbers from an
        independent NOAA dataset and shape-checks every published asset on each CI run.
      </Section>
    </Card>
  );
}
