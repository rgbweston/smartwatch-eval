function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Rule({ children }) {
  return (
    <li className="text-sm text-gray-600 mb-1.5">{children}</li>
  );
}

export default function MethodologyTab() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
      <h1 className="text-base font-bold text-gray-800 mb-1">Methodology</h1>
      <p className="text-xs text-gray-400 mb-6">How battery drain metrics are calculated from participant logs.</p>

      <Section title="1. How Battery Drain is Calculated">
        <p className="text-sm text-gray-600 mb-2">
          Battery drain is computed from <strong>consecutive log pairs</strong> per participant.
          Logs are sorted ascending by timestamp, and each adjacent pair (A, B) is evaluated to
          produce a loss rate in %/hr.
        </p>
        <p className="text-sm text-gray-600">
          Loss rate = <code className="bg-gray-100 px-1 rounded text-xs">(battery_A − battery_B) / hours_between</code>
        </p>
      </Section>

      <Section title="2. Pair Filtering Rules">
        <p className="text-sm text-gray-600 mb-2">A consecutive pair (A, B) is <strong>skipped</strong> if any of the following apply:</p>
        <ul className="list-disc list-inside space-y-1">
          <Rule>
            <strong>Gap ≤ 0 hours</strong> — duplicate or out-of-order logs are discarded.
          </Rule>
          <Rule>
            <strong>Gap &gt; 24 hours</strong> — extended non-use, a wearing break, or a charging session spanning
            multiple days. These gaps do not reflect normal wear drain.
          </Rule>
          <Rule>
            <strong>Battery at B ≥ battery at A</strong> — the device was charged between the two logs.
            A charging event makes the pair unsuitable for measuring drain.
          </Rule>
        </ul>
        <p className="text-sm text-gray-500 mt-2">
          Only pairs that pass all three filters contribute to the loss rate statistics.
        </p>
      </Section>

      <Section title="3. Daytime vs Nighttime Classification">
        <p className="text-sm text-gray-600 mb-2">
          Each valid pair is classified based on the UTC hour of log A (the earlier log):
        </p>
        <ul className="list-disc list-inside space-y-1">
          <Rule>
            <strong>Daytime</strong>: UTC hour 6–21 (6:00 am – 10:00 pm UTC, inclusive of 6, exclusive of 22)
          </Rule>
          <Rule>
            <strong>Nighttime</strong>: UTC hour 22–5 (10:00 pm – 6:00 am UTC)
          </Rule>
        </ul>
        <p className="text-sm text-gray-500 mt-2">
          All participants are in the same study timezone context; the UTC thresholds are applied uniformly.
        </p>
      </Section>

      <Section title="4. Derived Metrics">
        <ul className="list-disc list-inside space-y-1">
          <Rule>
            <strong>Avg hourly loss</strong>: arithmetic mean of all valid pair loss rates (%/hr).
          </Rule>
          <Rule>
            <strong>Avg daily loss</strong>: avg_hourly_loss × 24. Assumes continuous wear at the average rate.
          </Rule>
          <Rule>
            <strong>Daytime loss</strong>: mean loss rate across pairs classified as daytime only.
          </Rule>
          <Rule>
            <strong>Nighttime loss</strong>: mean loss rate across pairs classified as nighttime only.
          </Rule>
          <Rule>
            <strong>Per-participant metrics</strong>: same calculations scoped to each individual participant's valid pairs.
            A participant with only 1 log has no valid pairs and shows <span className="text-gray-400">—</span> for all loss metrics.
          </Rule>
          <Rule>
            <strong>By MST group / By device</strong>: rates grouped by the participant's MST group or device model,
            then averaged across per-participant averages in that group.
          </Rule>
        </ul>
      </Section>

      <Section title="5. Aggregation Method">
        <p className="text-sm text-gray-600 mb-2">
          Overall and group averages use <strong>per-participant weighting</strong>: each participant's valid pairs
          are averaged into a single value for that person, and then those participant averages are combined equally.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <Rule>
            A participant who logs every 30 minutes contributes the same weight to the overall average as one
            who logs twice a day — frequent logging does not inflate their influence on group metrics.
          </Rule>
          <Rule>
            This applies to overall, by-MST-group, and by-device breakdowns. The per-participant table
            is inherently individual and is unaffected.
          </Rule>
        </ul>
      </Section>
    </div>
  );
}
