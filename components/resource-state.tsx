export function ResourceState({ state, loading, error, retry, retryLabel }: {
  state: "loading" | "error"; loading: string; error: string; retry: () => void; retryLabel: string;
}) {
  if (state === "error") {
    return (
      <div className="resource-state">
        <p role="alert">{error}</p>
        <button type="button" className="text-action" onClick={retry}>{retryLabel}</button>
      </div>
    );
  }
  return (
    <div className="resource-state" role="status">
      <span aria-hidden="true" className="skeleton" />
      <span>{loading}</span>
    </div>
  );
}
