import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Calendar, Award,
  Clock, Activity, RefreshCw, X,
  TrendingUp, CheckCircle, AlertTriangle, ExternalLink,
  DollarSign, BarChart2, ShieldCheck, ChevronRight, Search
} from 'lucide-react';
import { apiFetch } from '../utils/api';


export default function IPOHubView({ currentMarket = 'IN', onSelectStock }) {
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [summary, setSummary] = useState(null);
  // Always start with empty arrays — data comes from API, never from stale hardcoded defaults
  const [activeIpos, setActiveIpos] = useState([]);
  const [closedIpos, setClosedIpos] = useState([]);
  const [upcomingIpos, setUpcomingIpos] = useState([]);
  const [listedIpos, setListedIpos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);   // true on first load
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [detailedIpoData, setDetailedIpoData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const unit = currentMarket === 'US' ? 'M' : 'Cr';

  // Compute live return percent if backend gives us currentPrice + issuePrice
  const enrichListed = (ipos) => ipos.map(ipo => {
    if (ipo.currentPrice && ipo.issuePrice && !ipo.totalReturnPercent) {
      return { ...ipo, totalReturnPercent: ((ipo.currentPrice - ipo.issuePrice) / ipo.issuePrice * 100).toFixed(2) };
    }
    return ipo;
  });

  const fetchData = useCallback((isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(null);

    const safeJson = async (p) => {
      try {
        const res = await p;
        if (!res) return null;
        return typeof res.json === 'function' ? await res.json() : res;
      } catch (err) {
        return null;
      }
    };

    Promise.allSettled([
      safeJson(apiFetch(`/api/ipo/summary?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/ipo/active?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/ipo/closed?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/ipo/upcoming?market=${currentMarket}`)),
      safeJson(apiFetch(`/api/ipo/listed?market=${currentMarket}`))
    ])
    .then(([summaryRes, activeRes, closedRes, upcomingRes, listedRes]) => {
      const anySuccess = [summaryRes, activeRes, closedRes, upcomingRes, listedRes]
        .some(r => r.status === 'fulfilled' && r.value);
      if (!anySuccess) {
        setFetchError('Could not reach the IPO data server. Please check your connection.');
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) setSummary(summaryRes.value);
      // Always replace state — even if empty — so stale data never stays on screen
      if (activeRes.status === 'fulfilled' && activeRes.value?.ipos !== undefined)
        setActiveIpos(activeRes.value.ipos);
      if (closedRes.status === 'fulfilled' && closedRes.value?.ipos !== undefined)
        setClosedIpos(closedRes.value.ipos);
      if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.ipos !== undefined)
        setUpcomingIpos(upcomingRes.value.ipos);
      if (listedRes.status === 'fulfilled' && listedRes.value?.ipos !== undefined)
        setListedIpos(enrichListed(listedRes.value.ipos));
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setIsLoading(false);
      setIsRefreshing(false);
    })
    .catch(() => {
      setFetchError('Failed to fetch live IPO data.');
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, [currentMarket]);

  useEffect(() => {
    fetchData(true);  // Initial load — shows skeleton
    const interval = setInterval(() => fetchData(false), 30000);  // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);


  // Load detailed prospectus if selected
  useEffect(() => {
    if (!selectedIpo) {
      setDetailedIpoData(null);
      return;
    }
    const sym = selectedIpo.symbol || selectedIpo.id;
    apiFetch(`/api/ipo/${sym}/details`)
      .then(res => (typeof res.json === 'function' ? res.json() : res))
      .then(data => {
        if (data && !data.error && !data.ipos) {
          setDetailedIpoData(data);
        } else {
          setDetailedIpoData(selectedIpo);
        }
      })
      .catch(() => {
        setDetailedIpoData(selectedIpo);
      });
  }, [selectedIpo]);

  const getVerdictBadge = (verdict) => {
    if (verdict?.includes('STRONG') || verdict?.includes('HIGH_GAIN')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#10b981', label: '🚀 STRONG APPLY' };
    }
    if (verdict?.includes('LONG_TERM')) {
      return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6', label: '💎 LONG TERM' };
    }
    if (verdict?.includes('APPLY')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', label: '✅ APPLY' };
    }
    return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b', label: '⏳ NEUTRAL' };
  };

  const filterList = (list) => {
    return list.filter(item => {
      const matchQuery = !searchQuery.trim() ||
        (item.symbol && item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.sector && item.sector.toLowerCase().includes(searchQuery.toLowerCase()));

      const isSme = item.category?.toLowerCase().includes('sme');
      const matchCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'SME' && isSme) ||
        (categoryFilter === 'MAINBOARD' && !isSme);

      return matchQuery && matchCategory;
    });
  };

  const filteredActive = filterList(activeIpos);
  const filteredClosed = filterList(closedIpos);
  const filteredUpcoming = filterList(upcomingIpos);
  const filteredListed = filterList(listedIpos);

  const computedAvgGmp = summary?.averageGmpPercent != null
    ? `+${summary.averageGmpPercent}%`
    : activeIpos.length > 0
    ? `+${(activeIpos.reduce((acc, i) => acc + (i.gmpPercent || 0), 0) / activeIpos.length).toFixed(1)}%`
    : '—';

  const modalData = detailedIpoData || selectedIpo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      {/* Top Banner with Dynamic Market Summary */}
      <div className="pro-card-glass" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
            <Sparkles style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              IPO Intelligence Hub
              <span className="mono-num" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                {currentMarket === 'US' ? 'US IPOs (NYSE / NASDAQ)' : 'NSE / BSE Primary Market'}
              </span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {lastUpdated
                ? <span>🟢 Live data · Last updated <strong style={{color:'var(--accent-green)'}}>{lastUpdated}</strong> · Auto-refreshes every 30s</span>
                : <span>{isLoading ? '⏳ Loading live IPO data...' : '100% verified exchange data, live subscription books & institutional GMP'}</span>
              }
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }} className="mono-num">
          {isLoading ? (
            // Skeleton loading badges
            [1,2,3,4].map(i => (
              <div key={i} style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', minWidth: '90px', height: '28px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : (
            <>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Live Bidding: </span>
                <strong style={{ color: 'var(--accent-green)' }}>{activeIpos.length}</strong>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Awaiting Listing: </span>
                <strong style={{ color: 'var(--accent-gold)' }}>{closedIpos.length}</strong>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Upcoming Pipeline: </span>
                <strong style={{ color: 'var(--accent-blue)' }}>{upcomingIpos.length}</strong>
              </div>
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg Active GMP: </span>
                <strong style={{ color: '#10b981' }}>{computedAvgGmp}</strong>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search, Filter Chips & Tabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        
        {/* Stage Subtabs */}
        <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center' }}>
          {[
            { id: 'ACTIVE', label: `🟢 Live Bidding (${activeIpos.length})`, icon: Activity },
            { id: 'CLOSED', label: `🔒 Closed / Allotment (${closedIpos.length})`, icon: Clock },
            { id: 'UPCOMING', label: `📅 Upcoming (${upcomingIpos.length})`, icon: Calendar },
            { id: 'LISTED', label: `🏆 Recently Listed (${listedIpos.length})`, icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`m3-filter-chip ${isActive ? 'active' : ''}`}
                style={{
                  height: '36px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 800 : 500,
                  backgroundColor: isActive ? 'var(--accent-green-bg)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent-green)' : 'var(--text-main)',
                  border: isActive ? '1px solid var(--accent-green-border)' : '1px solid var(--border-subtle)'
                }}
              >
                <Icon style={{ width: '15px', height: '15px' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: '10px', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search company or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: '34px',
                padding: '0 10px 0 32px',
                fontSize: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                outline: 'none',
                width: '190px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-elevated)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {['ALL', 'MAINBOARD', 'SME'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: categoryFilter === cat ? 800 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: categoryFilter === cat ? 'var(--accent-blue)' : 'transparent',
                  color: categoryFilter === cat ? 'var(--bg-dark)' : 'var(--text-secondary)'
                }}
              >
                {cat === 'ALL' ? 'All' : cat === 'MAINBOARD' ? 'Mainboard' : 'SME'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '34px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--accent-green)',
              border: '1px solid var(--accent-green-border)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE LIVE BIDDING */}
      {activeTab === 'ACTIVE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
          {isLoading ? (
            // Skeleton cards while loading
            [1,2,3,4].map(i => (
              <div key={i} className="pro-card-glass" style={{ padding: '14px 16px', borderRadius: '14px', height: '220px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ height: '16px', width: '60%', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', marginBottom: '10px' }} />
                <div style={{ height: '12px', width: '80%', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '12px', width: '40%', backgroundColor: 'var(--border-subtle)', borderRadius: '4px' }} />
              </div>
            ))
          ) : filteredActive.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                {fetchError ? '⚠️ IPO Data Unavailable' : '✅ No Active IPOs Today'}
              </div>
              <div style={{ fontSize: '12px' }}>
                {fetchError || 'No IPOs are currently open for bidding. Check the Upcoming tab for next openings.'}
              </div>
            </div>
          ) : filteredActive.map(ipo => {
            const verdict = getVerdictBadge(ipo.aiVerdict);
            const isSme = ipo.category?.toLowerCase().includes('sme');
            return (
              <div
                key={ipo.id}
                onClick={() => setSelectedIpo(ipo)}
                className="pro-card-glass"
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderRadius: '14px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Header Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <div style={{ maxWidth: '68%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                      <span className="mono-num" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: isSme ? 'rgba(236, 72, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: isSme ? '#ec4899' : 'var(--accent-blue)', border: isSme ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)' }}>
                        {ipo.category || 'Mainboard'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '3px 0 0 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ipo.companyName}
                    </h3>
                  </div>

                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: verdict.bg, color: verdict.text, border: `1px solid ${verdict.border}`, whiteSpace: 'nowrap' }}>
                    {verdict.label}
                  </span>
                </div>

                {/* Price Band & GMP Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price Band</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{ipo.priceBand}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Lot: {ipo.lotSize} ({currPrefix}{typeof ipo.minInvestment === 'number' ? ipo.minInvestment.toLocaleString('en-US') : ipo.minInvestment})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grey Market (GMP)</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                      +{currPrefix}{ipo.gmp} ({ipo.gmpPercent}%)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '3px' }}>
                      Est: {currPrefix}{ipo.expectedListingPrice}
                    </div>
                  </div>
                </div>

                {/* Subscription Progress Box */}
                {ipo.subscription && (
                  <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }} className="mono-num">
                      <span style={{ color: 'var(--text-muted)' }}>Subscription Demand:</span>
                      <strong style={{ color: ipo.subscription.total >= 5 ? '#10b981' : 'var(--accent-blue)' }}>
                        {ipo.subscription.total}x Subscribed
                      </strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px', textAlign: 'center', fontSize: '10px' }} className="mono-num">
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>QIB: </span><strong>{ipo.subscription.qib || '—'}x</strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>NII: </span><strong>{ipo.subscription.nii || '—'}x</strong>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Retail: </span><strong style={{ color: '#10b981' }}>{ipo.subscription.retail || '—'}x</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline & Registrar Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }} className="mono-num">
                  <div>
                    <span>Bidding: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{ipo.openDate?.slice(5)} to {ipo.closeDate?.slice(5)}</strong>
                  </div>
                  <div>
                    <span>Listing: </span>
                    <strong style={{ color: 'var(--accent-gold)' }}>{ipo.listingDate?.slice(5) || 'TBD'}</strong>
                  </div>
                </div>

                {/* Action Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Registrar: <strong style={{ color: 'var(--text-secondary)' }}>{ipo.registrar || 'Link Intime / KFintech'}</strong>
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    View Prospectus <ChevronRight style={{ width: '13px', height: '13px' }} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CLOSED / ALLOTMENT */}
      {activeTab === 'CLOSED' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
          {filteredClosed.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              No closed IPOs matching criteria.
            </div>
          ) : filteredClosed.map(ipo => (
            <div
              key={ipo.id}
              onClick={() => setSelectedIpo(ipo)}
              className="pro-card-glass"
              style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                    <span className="mono-num" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      {ipo.category || 'Mainboard'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>{ipo.companyName}</h3>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  ⏳ ALLOTMENT
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Issue Price</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{ipo.maxPrice}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Size: {currPrefix}{ipo.issueSizeCr} {unit}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Final GMP</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>+{currPrefix}{ipo.gmp} ({ipo.gmpPercent}%)</div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '3px' }}>Listing: {ipo.listingDate}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }} className="mono-num">
                <span>Total Demand: <strong style={{ color: '#10b981' }}>{ipo.subscription?.total || '—'}x</strong></span>
                <span>Retail: <strong style={{ color: 'var(--accent-blue)' }}>{ipo.subscription?.retail || '—'}x</strong></span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Registrar: <strong style={{ color: 'var(--text-secondary)' }}>{ipo.registrar || 'Link Intime / KFintech'}</strong></span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>Check Allotment Status →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: UPCOMING PIPELINE */}
      {activeTab === 'UPCOMING' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
          {filteredUpcoming.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              No upcoming IPOs found.
            </div>
          ) : filteredUpcoming.map(ipo => (
            <div
              key={ipo.id}
              onClick={() => setSelectedIpo(ipo)}
              className="pro-card-glass"
              style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                    <span className="mono-num" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      {ipo.category || 'Mainboard'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>{ipo.companyName}</h3>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  📅 UPCOMING
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Expected Issue</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{ipo.issueSizeCr} {unit}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Band: {ipo.priceBandExpected || ipo.priceBand}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Expected GMP</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{ipo.expectedGmp || `+${ipo.gmpPercent}%`}</div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '3px' }}>Opens: {ipo.expectedDate || ipo.openDate}</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Status: </strong>{ipo.drhpStatus || 'RHP Filed with SEBI'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: RECENTLY LISTED PERFORMANCE */}
      {activeTab === 'LISTED' && (
        <div className="pro-card-glass" style={{ overflow: 'hidden', padding: 0, borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Company</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Issue Price</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Listing Price</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Day 1 Gain</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Current LTP</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Total Gain</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Issue Size</th>
                  <th style={{ padding: '12px 16px' }} className="mono-num">Listing Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredListed.map((l, idx) => (
                  <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => setSelectedIpo(l)}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{l.companyName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span className="mono-num" style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>{l.symbol}</span>
                        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          {l.subscriptionTotal || 'Subscribed'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }} className="mono-num">{currPrefix}{l.issuePrice}</td>
                    <td style={{ padding: '12px 16px' }} className="mono-num">{currPrefix}{l.listingPrice}</td>
                    <td style={{ padding: '12px 16px' }} className="mono-num">
                      <span style={{ color: '#10b981', fontWeight: 800 }}>+{l.listingGainPercent}%</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800 }} className="mono-num">{currPrefix}{l.currentPrice}</td>
                    <td style={{ padding: '12px 16px' }} className="mono-num">
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        +{l.totalReturnPercent}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }} className="mono-num">
                      {currPrefix}{l.issueSizeCr} {unit}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }} className="mono-num">
                      {l.listingDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comprehensive Institutional IPO Detail Modal */}
      {selectedIpo && modalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setSelectedIpo(null)}
        >
          <div
            className="pro-card-glass"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="mono-num" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent-blue)' }}>{modalData.symbol}</span>
                  <span className="mono-num" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '5px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
                    {modalData.category || 'Mainboard'}
                  </span>
                  {modalData.listingExchange && (
                    <span className="mono-num" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '5px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {modalData.listingExchange}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 2px 0' }}>{modalData.companyName}</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{modalData.sector}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {modalData.aiVerdict && (
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, ...getVerdictBadge(modalData.aiVerdict) }}>
                    {getVerdictBadge(modalData.aiVerdict).label}
                  </span>
                )}
                <button
                  onClick={() => setSelectedIpo(null)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>

            {/* Quick Metrics 4-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }} className="mono-num">
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price Band</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.priceBand || modalData.priceBandExpected}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Face Value: {modalData.faceValue || '₹10'}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lot Size</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.lotSize || 1} shares</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Min: {currPrefix}{modalData.minInvestment?.toLocaleString?.('en-US') || modalData.minInvestment}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issue Size</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{currPrefix}{modalData.issueSizeCr} {unit}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {modalData.freshIssueCr ? `Fresh: ${currPrefix}${modalData.freshIssueCr}` : 'Book Building'}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grey Market (GMP)</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  +{currPrefix}{modalData.gmp || 0} ({modalData.gmpPercent || 0}%)
                </div>
                <div style={{ fontSize: '10px', color: 'var(--accent-gold)', marginTop: '2px' }}>
                  Est: {currPrefix}{modalData.expectedListingPrice || '—'}
                </div>
              </div>
            </div>

            {/* Profit per Lot Highlight */}
            {modalData.estProfitPerLot && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mono-num">
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                  Estimated Listing Gain Per Retail Lot:
                </span>
                <strong style={{ fontSize: '16px', color: '#10b981' }}>
                  +{currPrefix}{modalData.estProfitPerLot.toLocaleString('en-US')}
                </strong>
              </div>
            )}

            {/* Crucial Issue Timeline */}
            <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar style={{ width: '13px', height: '13px', color: 'var(--accent-blue)' }} />
                <span>Issue Timeline & Important Dates</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px', fontSize: '11px' }} className="mono-num">
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Bidding Open</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.openDate || 'TBD'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Bidding Close</div>
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>{modalData.closeDate || 'TBD'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Allotment Date</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.allotmentDate || 'TBD'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Refunds / Demat</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.refundDate || modalData.dematDate || 'TBD'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ color: '#10b981', fontSize: '10px' }}>Listing Date</div>
                  <div style={{ fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{modalData.listingDate || 'TBD'}</div>
                </div>
              </div>
            </div>

            {/* Subscription Breakdown */}
            {modalData.subscription && (
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Live Subscription Bidding Status
                  </span>
                  <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>
                    Total: {modalData.subscription.total}x
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '6px', textAlign: 'center', fontSize: '11px' }} className="mono-num">
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>QIB (Inst.)</div>
                    <strong style={{ color: 'var(--accent-blue)' }}>{modalData.subscription.qib || '—'}x</strong>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>NII / HNI</div>
                    <strong style={{ color: 'var(--accent-gold)' }}>{modalData.subscription.nii || '—'}x</strong>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Retail (RII)</div>
                    <strong style={{ color: '#10b981' }}>{modalData.subscription.retail || '—'}x</strong>
                  </div>
                  {modalData.subscription.employee && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Employee</div>
                      <strong>{modalData.subscription.employee}x</strong>
                    </div>
                  )}
                </div>
                {modalData.subscription.demandStatus && (
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold)', textAlign: 'center' }}>
                    {modalData.subscription.demandStatus}
                  </div>
                )}
              </div>
            )}

            {/* Registrar & Allotment Link */}
            {modalData.registrar && (
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official Registrar</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{modalData.registrar}</div>
                  {modalData.allotmentStatus && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '2px' }}>{modalData.allotmentStatus}</div>
                  )}
                </div>
                {modalData.registrarUrl && (
                  <a
                    href={modalData.registrarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-blue)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      textDecoration: 'none'
                    }}
                  >
                    Check Allotment Portal <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                )}
              </div>
            )}

            {/* Business Overview */}
            {modalData.businessOverview && (
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Business Profile & Market Moat
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {modalData.businessOverview.whatTheCompanyDoes}
                </div>
                {modalData.businessOverview.industryMoat && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                    Moat: {modalData.businessOverview.industryMoat}
                  </div>
                )}
              </div>
            )}

            {/* Strengths & Risks (Pros & Cons) */}
            {(modalData.pros || modalData.cons) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {modalData.pros && (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <CheckCircle style={{ width: '13px', height: '13px' }} /> Key Strengths (Pros)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {modalData.pros.map((p, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {modalData.cons && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <AlertTriangle style={{ width: '13px', height: '13px' }} /> Key Risks (Watchouts)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {modalData.cons.map((c, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Financial Highlights */}
            {modalData.financials && (
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Audited Financial Performance
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '11px' }}>
                  {modalData.financials.revenueFY26 && (
                    <div><span style={{ color: 'var(--text-muted)' }}>FY26 Revenue: </span><strong>{modalData.financials.revenueFY26}</strong></div>
                  )}
                  {modalData.financials.patFY26 && (
                    <div><span style={{ color: 'var(--text-muted)' }}>FY26 PAT: </span><strong style={{ color: '#10b981' }}>{modalData.financials.patFY26}</strong></div>
                  )}
                  {modalData.financials.cagr3Yr && (
                    <div><span style={{ color: 'var(--text-muted)' }}>3-Yr CAGR: </span><strong style={{ color: 'var(--accent-blue)' }}>{modalData.financials.cagr3Yr}</strong></div>
                  )}
                </div>
              </div>
            )}

            {/* AI Recommendation Strategy */}
            {modalData.recommendation && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                    AI Quantitative Recommendation
                  </div>
                  {modalData.aiScore && (
                    <span className="mono-num" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', backgroundColor: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>
                      AI Score: {modalData.aiScore}/100
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  {modalData.recommendation.verdict}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {modalData.recommendation.recommendedStrategy}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Target: <strong style={{ color: '#10b981' }}>{modalData.recommendation.targetListingPrice}</strong></span>
                  <span>Suitability: <strong style={{ color: 'var(--text-main)' }}>{modalData.recommendation.investorSuitability}</strong></span>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedIpo(null)}
              style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--accent-blue)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Close Prospectus
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
