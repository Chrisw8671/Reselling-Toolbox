"use client";

import { useState, useCallback, useEffect } from "react";

interface SearchResult {
  id: string;
  ebayItemId: string;
  title: string;
  currentPrice: number;
  imageUrl: string | null;
  itemUrl: string;
  condition: string | null;
  avgSoldPrice: number | null;
  soldSampleSize: number | null;
  estimatedMargin: number | null;
  aiAnalysis: string | null;
  aiConfidence: number | null;
  aiRecommendation: string | null;
  status: string;
  scannedAt: string;
}

interface EbaySearch {
  id: string;
  name: string;
  keywords: string;
  category: string | null;
  condition: string | null;
  maxBuyPrice: number | null;
  minProfitMargin: number;
  active: boolean;
  lastRunAt: string | null;
  totalResults: number;
  profitableCount: number;
}

interface Props {
  searches: EbaySearch[];
  initialSearchId: string | null;
}

function recommendationBadge(rec: string | null) {
  if (rec === "buy")
    return (
      <span
        style={{
          background: "#22c55e",
          color: "#fff",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        BUY
      </span>
    );
  if (rec === "maybe")
    return (
      <span
        style={{
          background: "#f59e0b",
          color: "#fff",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        MAYBE
      </span>
    );
  if (rec === "skip")
    return (
      <span
        style={{
          background: "#6b7280",
          color: "#fff",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        SKIP
      </span>
    );
  return (
    <span
      style={{
        background: "#e5e7eb",
        color: "#374151",
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 12,
      }}
    >
      Pending
    </span>
  );
}

export default function EbayFinderResults({ searches, initialSearchId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSearchId);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buy" | "maybe" | "skip">("buy");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchList, setSearchList] = useState<EbaySearch[]>(searches);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const loadResults = useCallback(async (id: string, rec: string, pg = 1) => {
    setLoading(true);
    const res = await fetch(`/api/ebay-finder/results?searchId=${id}&recommendation=${rec}&page=${pg}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setPage(data.page ?? 1);
    setPageCount(data.pageCount ?? 1);
    setLoading(false);
  }, []);

  // Auto-load results if a search is pre-selected (e.g. after creating a new search)
  useEffect(() => {
    if (initialSearchId) loadResults(initialSearchId, "buy");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectSearch(id: string) {
    setSelectedId(id);
    setRunMsg(null);
    setPage(1);
    await loadResults(id, filter, 1);
  }

  async function handleFilterChange(rec: "all" | "buy" | "maybe" | "skip") {
    setFilter(rec);
    setPage(1);
    if (selectedId) await loadResults(selectedId, rec, 1);
  }

  async function runSearch() {
    if (!selectedId) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch("/api/ebay-finder/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunMsg(`Error: ${data.error ?? "Unknown error"}`);
      } else {
        setRunMsg(
          `Done — scanned ${data.total} listings, ${data.profitable} met your margin threshold, ${data.analysed} analysed by AI.`,
        );
        // Refresh results and search list
        setPage(1);
        await loadResults(selectedId, filter, 1);
        const listRes = await fetch("/api/ebay-finder/searches");
        setSearchList(await listRes.json());
      }
    } catch {
      setRunMsg("Network error — please try again.");
    }
    setRunning(false);
  }

  async function dismiss(resultId: string) {
    await fetch("/api/ebay-finder/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resultId }),
    });
    setResults((prev) => prev.filter((r) => r.id !== resultId));
  }

  async function deleteSearch(id: string) {
    if (!confirm("Delete this search and all its results?")) return;
    setDeletingId(id);
    await fetch(`/api/ebay-finder/searches?id=${id}`, { method: "DELETE" });
    setSearchList((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setResults([]);
    }
    setDeletingId(null);
  }

  const selected = searchList.find((s) => s.id === selectedId);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {/* Left panel: search list */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div className="tableWrap" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border, #e5e7eb)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Saved Searches</span>
            <a href="/ebay-finder/new" className="btn" style={{ fontSize: 12, padding: "4px 10px" }}>
              + New
            </a>
          </div>

          {searchList.length === 0 && (
            <p style={{ padding: 16, color: "var(--muted, #6b7280)", fontSize: 14 }}>
              No searches yet.{" "}
              <a href="/ebay-finder/new" style={{ color: "inherit", textDecoration: "underline" }}>
                Create one
              </a>
            </p>
          )}

          {searchList.map((s) => (
            <div
              key={s.id}
              onClick={() => selectSearch(s.id)}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border, #e5e7eb)",
                cursor: "pointer",
                background: s.id === selectedId ? "var(--hover, #f9fafb)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSearch(s.id);
                  }}
                  disabled={deletingId === s.id}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "0 2px",
                  }}
                  title="Delete search"
                >
                  ×
                </button>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {s.keywords}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 8 }}>
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  {s.profitableCount} profitable
                </span>
                <span className="muted">{s.totalResults} total</span>
              </div>
              {s.lastRunAt && (
                <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                  Last run: {new Date(s.lastRunAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: results */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selected && (
          <div className="tableWrap" style={{ padding: 32, textAlign: "center", color: "var(--muted, #6b7280)" }}>
            Select a saved search on the left to view results, or{" "}
            <a href="/ebay-finder/new" style={{ color: "inherit", textDecoration: "underline" }}>
              create a new one
            </a>
            .
          </div>
        )}

        {selected && (
          <>
            {/* Header */}
            <div
              className="tableWrap"
              style={{ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  Keywords: <strong>{selected.keywords}</strong>
                  {selected.condition && <> · Condition: {selected.condition}</>}
                  {selected.maxBuyPrice && <> · Max: £{selected.maxBuyPrice}</>}
                  {" · "}Min margin: {selected.minProfitMargin}%
                </div>
              </div>
              <button onClick={runSearch} disabled={running} className="btn">
                {running ? "Scanning…" : "Run Search"}
              </button>
            </div>

            {runMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  marginBottom: 12,
                  background: runMsg.startsWith("Error") ? "#fee2e2" : "#dcfce7",
                  color: runMsg.startsWith("Error") ? "#991b1b" : "#166534",
                  fontSize: 14,
                }}
              >
                {runMsg}
              </div>
            )}

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["buy", "maybe", "all", "skip"] as const).map((rec) => (
                <button
                  key={rec}
                  onClick={() => handleFilterChange(rec)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--border, #e5e7eb)",
                    background: filter === rec ? "#111827" : "transparent",
                    color: filter === rec ? "#fff" : "inherit",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: filter === rec ? 600 : 400,
                  }}
                >
                  {rec === "all" ? "All" : rec === "buy" ? "Buy" : rec === "maybe" ? "Maybe" : "Skip"}
                </button>
              ))}
            </div>

            {/* Results */}
            {loading && (
              <div className="muted" style={{ padding: 20, textAlign: "center" }}>
                Loading results…
              </div>
            )}

            {!loading && results.length === 0 && (
              <div
                className="tableWrap"
                style={{ padding: 32, textAlign: "center", color: "var(--muted, #6b7280)" }}
              >
                No results yet. Click <strong>Run Search</strong> to scan eBay.
              </div>
            )}

            {!loading && pageCount > 1 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); loadResults(selectedId!, filter, p); }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border, #e5e7eb)",
                    background: "transparent",
                    cursor: page <= 1 ? "default" : "pointer",
                    opacity: page <= 1 ? 0.4 : 1,
                    fontSize: 13,
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: 13, color: "var(--muted, #6b7280)" }}>
                  Page {page} of {pageCount}
                </span>
                <button
                  disabled={page >= pageCount}
                  onClick={() => { const p = page + 1; setPage(p); loadResults(selectedId!, filter, p); }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border, #e5e7eb)",
                    background: "transparent",
                    cursor: page >= pageCount ? "default" : "pointer",
                    opacity: page >= pageCount ? 0.4 : 1,
                    fontSize: 13,
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {!loading &&
              results.map((r) => (
                <div
                  key={r.id}
                  className="tableWrap"
                  style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}
                >
                  <div style={{ display: "flex", gap: 14, padding: 14, alignItems: "flex-start" }}>
                    {/* Thumbnail */}
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.title}
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 6,
                          background: "#e5e7eb",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <a
                          href={r.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}
                        >
                          {r.title}
                        </a>
                        {recommendationBadge(r.aiRecommendation)}
                        {r.aiConfidence != null && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {r.aiConfidence}% conf.
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
                        <div>
                          <span className="muted" style={{ fontSize: 12 }}>
                            Buy price
                          </span>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            £{r.currentPrice.toFixed(2)}
                          </div>
                        </div>
                        {r.avgSoldPrice != null && (
                          <div>
                            <span className="muted" style={{ fontSize: 12 }}>
                              Avg sold ({r.soldSampleSize})
                            </span>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>
                              £{r.avgSoldPrice.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {r.estimatedMargin != null && r.avgSoldPrice != null && (
                          <>
                            <div>
                              <span className="muted" style={{ fontSize: 12 }}>
                                Gross margin
                              </span>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 16,
                                  color: r.estimatedMargin >= 30 ? "#16a34a" : r.estimatedMargin >= 15 ? "#d97706" : "#dc2626",
                                }}
                              >
                                {r.estimatedMargin.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <span className="muted" style={{ fontSize: 12 }}>
                                Net profit
                              </span>
                              {(() => {
                                const net = r.avgSoldPrice * 0.87 - 4 - r.currentPrice;
                                return (
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 16,
                                      color: net >= 5 ? "#16a34a" : net >= 0 ? "#d97706" : "#dc2626",
                                    }}
                                  >
                                    £{net.toFixed(2)}
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}
                        {r.condition && (
                          <div>
                            <span className="muted" style={{ fontSize: 12 }}>
                              Condition
                            </span>
                            <div style={{ fontSize: 13 }}>{r.condition}</div>
                          </div>
                        )}
                      </div>

                      {r.aiAnalysis && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: "#374151",
                            cursor: "pointer",
                          }}
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          {expandedId === r.id ? (
                            <>
                              <span className="muted">AI: </span>
                              {r.aiAnalysis}{" "}
                              <span className="muted" style={{ fontSize: 12 }}>
                                (collapse)
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="muted">AI: </span>
                              {r.aiAnalysis.slice(0, 120)}
                              {r.aiAnalysis.length > 120 ? "… " : " "}
                              <span className="muted" style={{ fontSize: 12 }}>
                                (expand)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <a
                        href={r.itemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ fontSize: 12, padding: "4px 10px", textAlign: "center" }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => dismiss(r.id)}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          border: "1px solid var(--border, #e5e7eb)",
                          borderRadius: 6,
                          background: "transparent",
                          cursor: "pointer",
                          color: "#6b7280",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
