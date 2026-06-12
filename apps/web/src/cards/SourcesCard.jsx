import { C, Card, CardHead } from "../ui.jsx";

export default function SourcesCard({ city }) {
  if (!city.citations?.length) return null;
  return (
    <Card>
      <CardHead kicker="Check the work" title="Sources & further reading"
        sub="This page makes strong claims, so none of them should require trust. The published science it tests against, and the official datasets it computes from:" />
      <ul className="space-y-3 text-sm leading-relaxed">
        {city.citations.map((c) => (
          <li key={c.url}>
            <a href={c.url} target="_blank" rel="noreferrer" style={{ color: C.day }}>{c.label}</a>
            {c.note && <div className="text-xs mt-0.5" style={{ color: C.muted }}>{c.note}</div>}
          </li>
        ))}
      </ul>
      {city.repoUrl && (
        <p className="text-sm mt-4 pt-4 leading-relaxed" style={{ color: C.muted, borderTop: `1px solid ${C.line}` }}>
          Every chart on this page is open source — the live queries, the precompute pipelines, and the verification
          scripts that reproduce each headline number independently:{" "}
          <a href={city.repoUrl} target="_blank" rel="noreferrer" style={{ color: C.day }}>
            {city.repoUrl.replace("https://", "")}
          </a>
        </p>
      )}
    </Card>
  );
}
