import React, { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { ErrorBanner, EmptyState, Spinner } from './ui/primitives';

const PAGE_SIZE = 10;

export default function AuditTrailViewer() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);

  const fetchAudit = useCallback(() => {
    setLoading(true);
    let url = `/api/audit-trail?limit=100`;
    if (filterSymbol.trim()) url += `&symbol=${encodeURIComponent(filterSymbol.trim())}`;
    if (filterType !== 'ALL') url += `&eventType=${filterType}`;

    apiFetch(url)
      .then(async res => {
        const d = typeof res?.json === 'function' ? await res.json() : res;
        setRecords(d.records || []);
        setFetchError(null);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Audit trail fetch notice:", err);
        setFetchError(err.message);
        setLoading(false);
      });
  }, [filterSymbol, filterType]);

  useEffect(() => {
    const timer = setTimeout(fetchAudit, 400);
    return () => clearTimeout(timer);
  }, [fetchAudit]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    setPage(1);
  }, [filterSymbol, filterType]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRecords = records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-elevated)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-blue-bg)',
            border: '1px solid var(--accent-blue-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText style={{ width: '22px', height: '22px', color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Decision Trace & Audit Trail</h2>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', color: 'var(--accent-blue)' }}>
                IMMUTABLE LOGS
              </span>
            </div>
            <p className="hide-on-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Detailed audit trail answering <em>"Why did the agent generate this signal?"</em> and <em>"Why was this order executed?"</em>.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
            placeholder="Filter symbol..."
            aria-label="Filter audit records by symbol"
            className="pro-input-field"
            style={{ fontSize: '11px', padding: '4px 8px', width: '120px' }}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter audit records by event type"
            className="pro-input-field"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            <option value="ALL">All Event Types</option>
            <option value="AI_QUERY">Assistant Queries & Inferences</option>
            <option value="ORDER_FILLED">Order Executions</option>
            <option value="ORDER_REJECTED">Risk Rejections</option>
          </select>

          <button
            onClick={fetchAudit}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--bg-dark)',
              fontWeight: 800,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Audit Records List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Spinner />
          </div>
        ) : fetchError ? (
          <ErrorBanner message={`Failed to load audit trail: ${fetchError}`} onRetry={fetchAudit} />
        ) : records.length > 0 ? (
          <>
            {pageRecords.map(rec => {
            const isExpanded = expandedId === rec.auditId;
            const isFilled = rec.eventType === 'ORDER_FILLED';
            const isRejected = rec.eventType === 'ORDER_REJECTED';

            return (
              <div
                key={rec.auditId}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Collapsed Bar */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} audit record for ${rec.symbol}`}
                  onClick={() => toggleExpand(rec.auditId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(rec.auditId);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: isFilled ? 'var(--accent-green-bg)' : (isRejected ? 'var(--accent-red-bg)' : 'var(--accent-blue-bg)'),
                      color: isFilled ? 'var(--accent-green)' : (isRejected ? 'var(--accent-red)' : 'var(--accent-blue)')
                    }}>
                      {rec.eventType}
                    </span>

                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)' }}>
                      {rec.symbol}
                    </span>

                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {rec.rationaleAnswer || rec.userQuery || 'Automated execution event'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {rec.timestamp}
                    </span>
                    {isExpanded ? <ChevronUp style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} /> : <ChevronDown style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-card)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    fontSize: '12px'
                  }}>
                    
                    {/* Plain English "Why?" Banner */}
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(41, 121, 255, 0.08)',
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--accent-blue)',
                      color: 'var(--text-main)',
                      lineHeight: 1.4
                    }}>
                      <strong>Reasoning Summary:</strong> {rec.rationaleAnswer}
                    </div>

                    {/* Market State Snapshot at Moment of Decision */}
                    {rec.marketStateSnapshot && Object.keys(rec.marketStateSnapshot).length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Verified Market State Snapshot (Timestamp: {rec.marketDataTimestamp})
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {Object.entries(rec.marketStateSnapshot).map(([k, v]) => (
                            <span key={k} style={{ backgroundColor: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                              <strong className="mono-num" style={{ color: 'var(--text-main)' }}>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence: Observed Data vs Inferences vs Uncertainties */}
                    {rec.aiEvidence && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        
                        {rec.aiEvidence.inference && rec.aiEvidence.inference.length > 0 && (
                          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '6px' }}>🧠 Quantitative Inferences:</div>
                            <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {rec.aiEvidence.inference.map((inf, i) => <li key={i}>{inf}</li>)}
                            </ul>
                          </div>
                        )}

                        {rec.aiEvidence.uncertainty && rec.aiEvidence.uncertainty.length > 0 && (
                          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '6px' }}>⚖️ Uncertainty Factors:</div>
                            <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {rec.aiEvidence.uncertainty.map((unc, i) => <li key={i}>{unc}</li>)}
                            </ul>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Risk Checks Results */}
                    {rec.riskEvaluation && rec.riskEvaluation.checks && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Pre-Trade Risk Gates Evaluation ({rec.riskEvaluation.passedChecks}/{rec.riskEvaluation.totalChecks} Passed)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {rec.riskEvaluation.checks.map((chk, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                              {chk.passed ? (
                                <CheckCircle2 style={{ width: '13px', height: '13px', color: 'var(--accent-green)', flexShrink: 0 }} />
                              ) : (
                                <XCircle style={{ width: '13px', height: '13px', color: 'var(--accent-red)', flexShrink: 0 }} />
                              )}
                              <span style={{ fontWeight: 700, color: chk.passed ? 'var(--text-main)' : 'var(--accent-red)' }}>{chk.ruleName}:</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{chk.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
            })}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '14px 0 4px' }}>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: safePage <= 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft style={{ width: '14px', height: '14px' }} />
                </button>
                <span className="mono-num" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page {safePage} of {totalPages} · {records.length} records
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: safePage >= totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="🗂️"
            title="No audit records found"
            subtitle="No audit records matching the current filter criteria. Adjust filters or refresh."
          />
        )}
      </div>

    </div>
  );
}
