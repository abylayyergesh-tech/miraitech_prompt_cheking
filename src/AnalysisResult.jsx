function parseAnalysisResponse(text) {
  if (!text || typeof text !== "string") return null;

  let raw = text.trim();
  const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (Array.isArray(parsed.main_problems) ||
        Array.isArray(parsed.goals) ||
        Array.isArray(parsed.exercise_plan))
    ) {
      return parsed;
    }
  } catch {
    /* fall through to raw text */
  }
  return null;
}

function ExerciseCard({ exercise, index }) {
  const { name, body_region, type, description, scheme, precautions, doctor_checkpoints } =
    exercise;

  return (
    <article className="exercise-card">
      <header className="exercise-header">
        <span className="exercise-number">{index + 1}</span>
        <div className="exercise-title-wrap">
          <h4 className="exercise-name">{name}</h4>
          <div className="exercise-tags">
            {body_region && <span className="tag tag-region">{body_region}</span>}
            {type && <span className="tag tag-type">{type}</span>}
          </div>
        </div>
      </header>

      {description && <p className="exercise-description">{description}</p>}

      {scheme && (
        <div className="scheme-grid">
          {scheme.sets != null && (
            <div className="scheme-item">
              <span className="scheme-label">Sets</span>
              <span className="scheme-value">{scheme.sets}</span>
            </div>
          )}
          {scheme.reps != null && (
            <div className="scheme-item">
              <span className="scheme-label">Reps</span>
              <span className="scheme-value">{scheme.reps}</span>
            </div>
          )}
          {scheme.frequency_per_week != null && (
            <div className="scheme-item">
              <span className="scheme-label">Per week</span>
              <span className="scheme-value">{scheme.frequency_per_week}×</span>
            </div>
          )}
        </div>
      )}

      {precautions && (
        <div className="callout callout-warning">
          <span className="callout-icon">⚠</span>
          <div>
            <span className="callout-title">Precautions</span>
            <p>{precautions}</p>
          </div>
        </div>
      )}

      {doctor_checkpoints && (
        <div className="callout callout-checkpoint">
          <span className="callout-icon">👁</span>
          <div>
            <span className="callout-title">Doctor checkpoints</span>
            <p>{doctor_checkpoints}</p>
          </div>
        </div>
      )}
    </article>
  );
}

export default function AnalysisResult({ text }) {
  const data = parseAnalysisResponse(text);

  if (!data) {
    return <pre className="result-text result-raw">{text}</pre>;
  }

  return (
    <div className="analysis-report">
      {data.need_doctor_review && (
        <div className="review-banner">
          <span className="review-banner-icon">🩺</span>
          <div>
            <strong>Doctor review recommended</strong>
            <p>This analysis flagged findings that should be verified clinically.</p>
          </div>
        </div>
      )}

      {Array.isArray(data.main_problems) && data.main_problems.length > 0 && (
        <section className="report-section">
          <h3 className="section-heading section-problems">
            <span className="section-icon">●</span>
            Main Problems
          </h3>
          <ol className="problem-list">
            {data.main_problems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </section>
      )}

      {Array.isArray(data.goals) && data.goals.length > 0 && (
        <section className="report-section">
          <h3 className="section-heading section-goals">
            <span className="section-icon">✓</span>
            Goals
          </h3>
          <ul className="goal-list">
            {data.goals.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(data.exercise_plan) && data.exercise_plan.length > 0 && (
        <section className="report-section">
          <h3 className="section-heading section-exercises">
            <span className="section-icon">🏋</span>
            Exercise Plan
            <span className="section-count">{data.exercise_plan.length} exercises</span>
          </h3>
          <div className="exercise-grid">
            {data.exercise_plan.map((exercise, i) => (
              <ExerciseCard key={i} exercise={exercise} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export { parseAnalysisResponse };
