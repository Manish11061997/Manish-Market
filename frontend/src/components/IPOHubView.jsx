import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Calendar, CheckCircle2,
  ArrowUpRight, Users, ShieldAlert, Award,
  Check, Clock, Zap, Activity, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Modal, EmptyState, Spinner } from './ui/primitives';

export default function IPOHubView({ currentMarket = 'IN', onSelectStock }) {
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE', 'CLOSED', 'UPCOMING', 'LISTED'
  const [summary, setSummary] = useState(null);
  const [activeIpos, setActiveIpos] = useState([]);
  const [closedIpos, setClosedIpos] = useState([]);
  const [upcomingIpos, setUpcomingIpos] = useState([]);
  const [listedIpos, setListedIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal State
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [modalTab, setModalTab] = useState('RECOMMENDATION'); // 'RECOMMENDATION', 'SUBSCRIPTION', 'BUSINESS', 'VALUATION'

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const unit = currentMarket === 'US' ? 'M' : 'Cr';

  const fetchData = useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setIsRefreshing(true);

    const safeJson = async (p) => {
      try {
        const res = await p;
        if (!res) return null;
        return typeof res.json === 'function' ? await res.json() : res;
      } catch (err) {
        console.warn("IPO sub-fetch error:", err);
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
      if (summaryRes.status === 'fulfilled' && summaryRes.value) setSummary(summaryRes.value);
      if (activeRes.status === 'fulfilled' && activeRes.value?.ipos) setActiveIpos(activeRes.value.ipos);
      if (closedRes.status === 'fulfilled' && closedRes.value?.ipos) setClosedIpos(closedRes.value.ipos);
      if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.ipos) setUpcomingIpos(upcomingRes.value.ipos);
      if (listedRes.status === 'fulfilled' && listedRes.value?.ipos) setListedIpos(listedRes.value.ipos);
      setLoading(false);
      setIsRefreshing(false);
    })
    .catch(err => {
      console.error("IPO fetch error:", err);
      setLoading(false);
      setIsRefreshing(false);
    });
  }, [currentMarket]);

  useEffect(() => {
    fetchData(true);
    // Background polling every 30s to catch new exchange bidding and listing transitions
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getVerdictBadge = (verdict) => {
    if (verdict?.includes('STRONG') || verdict?.includes('HIGH_GAIN')) {
      return { bg: 'var(--emerald-pos-bg)', border: 'var(--accent-green-border)', text: 'var(--accent-green)', label: '🚀 STRONG APPLY' };
    }
    if (verdict?.includes('LONG_TERM')) {
      return { bg: 'rgba(59, 130, 246, 0.2)', border: 'var(--accent-blue-border)', text: 'var(--accent-blue)', label: '💎 APPLY FOR LONG TERM' };
    }
    if (verdict?.includes('APPLY')) {
      return { bg: 'var(--emerald-pos-bg)', border: 'var(--accent-green-border)', text: 'var(--accent-green)', label: '✅ APPLY FOR LISTING' };
    }
    return { bg: 'var(--amber-warn-bg)', border: 'var(--accent-gold-border)', text: 'var(--accent-gold)', label: '⏳ NEUTRAL / CAUTION' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 🚀 Top Hero Banner: Institutional IPO Intelligence Hub */}
      <div className="pro-card-glass" style={{
        padding: '6px 10px',
        background: 'linear-gradient(135deg, var(--emerald-pos-bg-soft) 0%, var(--indigo-info-bg-soft) 100%)',
        borderColor: 'var(--accent-green-border)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div style={{ padding: '3px 5px', borderRadius: '6px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
              <Sparkles style={{ width: '14px', height: '14px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                IPO Hub
                <span className="mono-num" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
                  {currentMarket === 'US' ? 'US IPOs' : 'NSE/BSE'}
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }} className="mono-num">
            <span style={{ color: 'var(--text-muted)' }}>Active: <strong style={{ color: 'var(--accent-green)' }}>{summary?.activeCount || activeIpos.length}</strong></span>
            <span>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Avg GMP: <strong style={{ color: 'var(--accent-gold)' }}>{summary?.averageGmpPercent != null ? `+${summary.averageGmpPercent}%` : '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Live Exchange Sync */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '12px' }}>
        <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
          {[
            { id: 'ACTIVE', label: `🟢 Live Bidding (${activeIpos.length})`, icon: Activity },
            { id: 'CLOSED', label: `🔒 Closed Bidding (${closedIpos.length})`, icon: Clock },
            { id: 'UPCOMING', label: `📅 Upcoming Pipeline (${upcomingIpos.length})`, icon: Calendar },
            { id: 'LISTED', label: `🏆 Recently Listed (${listedIpos.length})`, icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`m3-filter-chip ${activeTab === tab.id ? 'active' : ''}`}
                style={{ height: '36px' }}
              >
                <Icon style={{ width: '15px', height: '15px' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Sync Trigger Button */}
        <button
          onClick={() => fetchData(false)}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--accent-green)',
            border: '1px solid var(--accent-green-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw style={{ width: '13px', height: '13px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isRefreshing ? 'Syncing Exchange Data...' : 'Live Sync Feed (30s)'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Spinner size={36} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>Fetching live exchange subscription bidding rates, shares bid vs offered, and grey market premiums...</p>
        </div>
      )}

      {/* 🟢 TAB 1: ACTIVE BIDDING IPOS */}
      {!loading && activeTab === 'ACTIVE' && (
        activeIpos.length === 0 ? (
          <EmptyState
            icon="🟢"
            title="No live bidding IPOs right now"
            subtitle="New mainboard & SME issues will appear here the moment bidding opens on the exchange."
          />
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 370px), 1fr))', gap: '20px' }}>
          {activeIpos.map(ipo => {
            const verdict = getVerdictBadge(ipo.aiVerdict);
            return (
              <div
                key={ipo.id}
                role="button"
                tabIndex={0}
                aria-label={`View subscription analysis for ${ipo.companyName}`}
                onClick={() => {
                  setSelectedIpo(ipo);
                  setModalTab('RECOMMENDATION');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIpo(ipo);
                    setModalTab('RECOMMENDATION');
                  }
                }}
                className="pro-card-glass"
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderColor: ipo.gmpPercent >= 40 ? 'var(--accent-green-border)' : 'var(--md-sys-color-outline-variant)',
                  transition: 'all 0.2s ease',
                  boxShadow: ipo.gmpPercent >= 40 ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'none'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {ipo.symbol}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                          {ipo.sector}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
                        {ipo.companyName}
                      </h3>
                    </div>

                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      backgroundColor: verdict.bg,
                      color: verdict.text,
                      border: `1px solid ${verdict.border}`,
                      whiteSpace: 'nowrap'
                    }}>
                      {verdict.label}
                    </span>
                  </div>

                  {/* Pricing & GMP Banner */}
                  <div style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    margin: '10px 0',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr',
                    gap: '10px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price Band & Lot</div>
                      <div className="mono-num" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                        {ipo.priceBand}
                      </div>
                      <div className="mono-num" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Lot: <strong>{ipo.lotSize} Shares</strong> ({currPrefix}{ipo.minInvestment.toLocaleString('en-US')})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', borderLeft: '1px solid var(--md-sys-color-outline-variant)', paddingLeft: '10px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grey Market (GMP)</div>
                      <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                        +{currPrefix}{ipo.gmp} ({ipo.gmpPercent}%)
                      </div>
                      <div className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-gold)', marginTop: '2px' }}>
                        Est. List: {currPrefix}{ipo.expectedListingPrice}
                      </div>
                    </div>
                  </div>

                  {/* 📊 High-Visibility Live Subscription Breakdown Box */}
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid var(--accent-blue-border)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        <Activity style={{ width: '15px', height: '15px', color: 'var(--accent-blue)' }} />
                        <span>Live Subscription Rate:</span>
                      </div>
                      <span className="mono-num" style={{
                        fontSize: '15px',
                        fontWeight: 900,
                        color: (ipo.subscription?.total || 0) >= 5 ? 'var(--accent-green)' : ((ipo.subscription?.total || 0) >= 1 ? 'var(--accent-blue)' : 'var(--accent-gold)'),
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {ipo.subscription?.total || 0}x Subscribed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '7px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{
                        width: `${Math.min(100, ((ipo.subscription?.total || 0) / 15) * 100)}%`,
                        height: '100%',
                        backgroundColor: (ipo.subscription?.total || 0) >= 5 ? 'var(--accent-green)' : 'var(--accent-blue)',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease'
                      }} />
                    </div>

                    {/* Category Breakdown Grid */}
                    <div className="mono-num" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center', fontSize: '11px' }}>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>QIB (Inst.)</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{ipo.subscription?.qib || 0}x</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NII / HNI</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>{ipo.subscription?.nii || 0}x</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Retail (RII)</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>{ipo.subscription?.retail || 0}x</div>
                      </div>
                    </div>

                    {/* Total Amount Bid */}
                    {ipo.subscription?.totalAmountBidCr && (
                      <div className="mono-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--hover-white-6)' }}>
                        <span>Total Capital Bid:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{currPrefix}{ipo.subscription.totalAmountBidCr.toLocaleString('en-US')} {unit}</strong>
                      </div>
                    )}
                  </div>

                  {/* Core What the Company Does Brief */}
                  {ipo.businessOverview && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>What it does: </strong>
                      {ipo.businessOverview.whatTheCompanyDoes.substring(0, 130)}...
                    </div>
                  )}
                </div>

                {/* Bottom Timeline & Deep Analysis CTA */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Closes: <strong style={{ color: 'var(--accent-red)' }}>{ipo.closeDate}</strong></span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIpo(ipo);
                      setModalTab('RECOMMENDATION');
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-blue)',
                      color: 'var(--bg-dark)',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Full Subscription & Analysis</span>
                    <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* 🔒 TAB 2: CLOSED IPOS (Bidding Closed — Awaiting Allotment / Listing) */}
      {!loading && activeTab === 'CLOSED' && (
        closedIpos.length === 0 ? (
          <EmptyState
            icon="🔒"
            title="No closed IPOs awaiting allotment"
            subtitle="Issues whose bidding windows have closed will be tracked here until allotment and listing."
          />
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: '20px' }}>
          {closedIpos.map(ipo => {
            return (
              <div
                key={ipo.id}
                role="button"
                tabIndex={0}
                aria-label={`View analysis for ${ipo.companyName}`}
                className="pro-card-glass"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--border-subtle)'
                }}
                onClick={() => {
                  setSelectedIpo(ipo);
                  setModalTab('RECOMMENDATION');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIpo(ipo);
                    setModalTab('RECOMMENDATION');
                  }
                }}
              >
                <div>
                  {/* Top Category, Allotment Status & Rating */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="mono-num" style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {ipo.category}
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, backgroundColor: 'var(--amber-warn-bg)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold-border)' }}>
                        {ipo.allotmentStatus || '🔒 Bidding Closed'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      <span>⭐</span>
                      <span>{ipo.rating || '4.5 / 5.0'}</span>
                    </div>
                  </div>

                  {/* Company Name & Sector */}
                  <div style={{ marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {ipo.companyName}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStock) onSelectStock(ipo.symbol);
                        }}
                        className="mono-num"
                        style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {ipo.symbol}
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>• {ipo.sector}</span>
                    </div>
                  </div>

                  {/* Pricing, Issue Size & Locked GMP Card */}
                  <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Price Band</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{ipo.priceBand}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Issue Size</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{currPrefix}{ipo.issueSizeCr.toLocaleString('en-US')} {unit}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Locked Grey Market Premium (GMP)</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent-green)', marginTop: '2px' }}>
                          +{currPrefix}{ipo.gmp} ({ipo.gmpPercent > 0 ? `+${ipo.gmpPercent}%` : `${ipo.gmpPercent}%`})
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. Listing Price</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          {currPrefix}{ipo.expectedListingPrice}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Subscription Multiplier Box */}
                  <div style={{ backgroundColor: 'var(--emerald-pos-bg-soft)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', border: '1px solid var(--accent-green-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users style={{ width: '14px', height: '14px' }} />
                        <span>Final Subscription Multipliers</span>
                      </div>
                      <span className="mono-num" style={{
                        fontSize: '12px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--accent-green-bg)',
                        color: 'var(--accent-green)',
                        border: '1px solid var(--accent-green-border)'
                      }}>
                        {ipo.subscription?.total || 0}x Total
                      </span>
                    </div>

                    {/* Category Breakdown Grid */}
                    <div className="mono-num" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center', fontSize: '11px' }}>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>QIB (Inst.)</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{ipo.subscription?.qib || 0}x</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NII / HNI</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>{ipo.subscription?.nii || 0}x</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Retail (RII)</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>{ipo.subscription?.retail || 0}x</div>
                      </div>
                    </div>

                    {/* Total Amount Bid */}
                    {ipo.subscription?.totalAmountBidCr && (
                      <div className="mono-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--hover-white-6)' }}>
                        <span>Total Capital Bid:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{currPrefix}{ipo.subscription.totalAmountBidCr.toLocaleString('en-US')} {unit}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Timeline & Deep Analysis CTA */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }} className="mono-num">
                    <span>Allotment: <strong style={{ color: 'var(--accent-gold)' }}>{ipo.allotmentDate || 'Pending'}</strong></span>
                    <span>Listing: <strong style={{ color: 'var(--accent-green)' }}>{ipo.listingDate || 'TBD'}</strong></span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIpo(ipo);
                      setModalTab('RECOMMENDATION');
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-blue)',
                      color: 'var(--bg-dark)',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Full Analysis</span>
                    <ArrowUpRight style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* 📅 TAB 3: UPCOMING IPOS */}
      {!loading && activeTab === 'UPCOMING' && (
        upcomingIpos.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No upcoming IPOs in the pipeline"
            subtitle="DRHP-filed and announced issues will appear here with expected price bands and bidding dates."
          />
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
          {upcomingIpos.map(ipo => (
            <div
              key={ipo.id}
              role="button"
              tabIndex={0}
              aria-label={`View outlook for ${ipo.companyName}`}
              onClick={() => {
                setSelectedIpo(ipo);
                setModalTab('RECOMMENDATION');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedIpo(ipo);
                  setModalTab('RECOMMENDATION');
                }
              }}
              className="pro-card-glass"
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="mono-num" style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 800 }}>
                      {ipo.sector}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      {ipo.companyName}
                    </h3>
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStock) onSelectStock(ipo.symbol);
                        }}
                        className="mono-num"
                      style={{ fontSize: '11px', color: 'var(--accent-blue)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700 }}
                    >
                      {ipo.symbol}
                    </button>
                  </div>

                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: 'var(--amber-warn-bg)',
                    color: 'var(--accent-gold)',
                    border: '1px solid var(--accent-gold-border)'
                  }}>
                    {ipo.drhpStatus}
                  </span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', padding: '12px', margin: '14px 0', border: '1px solid var(--border-subtle)' }} className="mono-num">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expected Issue Size:</span>
                    <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{ipo.issueSizeCr.toLocaleString('en-US')} {unit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expected Price Band:</span>
                    <strong>{ipo.priceBandExpected}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expected GMP:</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>{ipo.expectedGmp}</strong>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  💡 <strong>Quantitative Outlook:</strong> {ipo.aiOutlook}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expected Bidding:</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{ipo.expectedDate}</strong>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* 🏆 TAB 3: RECENTLY LISTED PERFORMANCE */}
      {!loading && activeTab === 'LISTED' && (
        listedIpos.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No recently listed IPOs"
            subtitle="Listing-day performance and total return tracking will appear here after new listings go live."
          />
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="pro-card-glass" style={{ overflow: 'hidden', padding: 0 }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 18px' }}>Security & Sector</th>
                    <th style={{ padding: '14px 18px' }}>Listing Date</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Issue Price</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Listing Price</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Listing Day Gain</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Current LTP</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Total Return</th>
                    <th style={{ padding: '14px 18px' }} className="mono-num">Final Subscription</th>
                    <th style={{ padding: '14px 18px' }}>Action Advice</th>
                  </tr>
                </thead>
                <tbody>
                  {listedIpos.map((l, idx) => (
                    <tr
                      key={l.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>{l.companyName}</div>
                        <div className="mono-num" style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>
                          <button
                            onClick={() => onSelectStock && onSelectStock(l.symbol)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-blue)', font: 'inherit', fontWeight: 700 }}
                          >
                            {l.symbol}
                          </button>
                          {' '}• {l.sector}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{l.listingDate}</td>
                      <td style={{ padding: '14px 18px', fontWeight: 700 }} className="mono-num">{currPrefix}{l.issuePrice}</td>
                      <td style={{ padding: '14px 18px', fontWeight: 700 }} className="mono-num">{currPrefix}{l.listingPrice}</td>
                      <td style={{ padding: '14px 18px' }} className="mono-num">
                        <span style={{ color: l.listingGainPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 800 }}>
                          +{l.listingGainPercent}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--text-main)' }} className="mono-num">{currPrefix}{l.currentPrice}</td>
                      <td style={{ padding: '14px 18px' }} className="mono-num">
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: l.totalReturnPercent >= 0 ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                          color: l.totalReturnPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                          border: `1px solid ${l.totalReturnPercent >= 0 ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`
                        }}>
                          +{l.totalReturnPercent}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--accent-blue)' }} className="mono-num">
                        {l.subscriptionTotal}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="mono-num" style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 800 }}>
                          {l.aiVerdict || l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* 📑 DEEP COMPLETE IPO ANALYSIS & SUBSCRIPTION MODAL */}
      {selectedIpo && (
        <Modal
          open
          onClose={() => setSelectedIpo(null)}
          title={null}
          width="920px"
        >
          <div className="pro-card-glass" style={{
            margin: '-12px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            height: 'calc(85vh - 24px)'
          }}>
            {/* Unified Top Header Bar */}
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--md-sys-color-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div className="ticker-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
                  {selectedIpo.symbol.slice(0, 2)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedIpo.companyName}
                    </h2>
                    <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      ({selectedIpo.symbol})
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
                      {selectedIpo.aiScore}/100
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{selectedIpo.sector}</span>
                    <span>•</span>
                    <span>Issue: <strong>{currPrefix}{selectedIpo.issueSizeCr} {unit}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                    +{currPrefix}{selectedIpo.gmp} ({selectedIpo.gmpPercent}%)
                  </div>
                  <div className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Sub: <strong style={{ color: 'var(--accent-blue)' }}>{selectedIpo.subscription?.total || 0}x</strong>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIpo(null)}
                  aria-label="Close modal"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Navigation Sub-Tabs */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>
              <div className="mobile-tab-scroll" style={{ width: '100%', overflowX: 'auto' }}>
                <div className="m3-segmented-container">
                  <button
                    onClick={() => setModalTab('RECOMMENDATION')}
                    className={`m3-segmented-item ${modalTab === 'RECOMMENDATION' ? 'active' : ''}`}
                  >
                    🎯 Verdict & Strategy
                  </button>
                  <button
                    onClick={() => setModalTab('SUBSCRIPTION')}
                    className={`m3-segmented-item ${modalTab === 'SUBSCRIPTION' ? 'active' : ''}`}
                  >
                    📊 Live Bidding & Subscription
                  </button>
                  <button
                    onClick={() => setModalTab('BUSINESS')}
                    className={`m3-segmented-item ${modalTab === 'BUSINESS' ? 'active' : ''}`}
                  >
                    🏢 Business & Financials
                  </button>
                  <button
                    onClick={() => setModalTab('VALUATION')}
                    className={`m3-segmented-item ${modalTab === 'VALUATION' ? 'active' : ''}`}
                  >
                    👥 Valuation & Anchors
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
              
              {/* 📊 TAB 1: LIVE SUBSCRIPTION & BIDDING BREAKDOWN */}
              {modalTab === 'SUBSCRIPTION' && selectedIpo.subscription && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Total Subscription Hero Card */}
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--indigo-info-bg-soft)',
                    border: '1px solid var(--accent-blue-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase' }}>
                        OVERALL SUBSCRIPTION
                      </div>
                      <div className="mono-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                        {selectedIpo.subscription.total}x <span style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 700 }}>Oversubscribed</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '2px' }}>
                        {selectedIpo.subscription.demandStatus}
                      </div>
                    </div>

                    <div className="mono-num" style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TOTAL CAPITAL BID</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                        {currPrefix}{selectedIpo.subscription.totalAmountBidCr?.toLocaleString('en-US')} {unit}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Shares Bid: <strong>{selectedIpo.subscription.sharesBid}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Category Bidding Multiplier Table */}
                  <div className="pro-card-glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }} className="mono-num">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '7px 10px' }}>Investor Category</th>
                          <th style={{ padding: '7px 10px' }}>Quota</th>
                          <th style={{ padding: '7px 10px' }}>Subscription</th>
                          <th style={{ padding: '7px 10px' }}>Demand</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            🏛️ QIB (Institutional)
                          </td>
                          <td style={{ padding: '7px 10px' }}>50%</td>
                          <td style={{ padding: '7px 10px', fontWeight: 800, color: 'var(--accent-blue)', fontSize: '13px' }}>
                            {selectedIpo.subscription.qib}x
                          </td>
                          <td style={{ padding: '7px 10px', color: selectedIpo.subscription.qib >= 10 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                            {selectedIpo.subscription.qib >= 10 ? '🔥 Very Aggressive' : '🟢 Strong'}
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            💼 NII / HNI
                          </td>
                          <td style={{ padding: '7px 10px' }}>15%</td>
                          <td style={{ padding: '7px 10px', fontWeight: 800, color: 'var(--accent-gold)', fontSize: '13px' }}>
                            {selectedIpo.subscription.nii}x
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--accent-gold)', fontSize: '10px' }}>
                            bNII: {selectedIpo.subscription.nii_b || selectedIpo.subscription.nii}x • sNII: {selectedIpo.subscription.nii_s || selectedIpo.subscription.nii}x
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            👤 Retail (RII)
                          </td>
                          <td style={{ padding: '7px 10px' }}>35% (Max ₹2L)</td>
                          <td style={{ padding: '7px 10px', fontWeight: 800, color: 'var(--accent-green)', fontSize: '13px' }}>
                            {selectedIpo.subscription.retail}x
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--accent-green)' }}>
                            {selectedIpo.subscription.retailAllotmentChance}
                          </td>
                        </tr>

                        {selectedIpo.subscription.employee && (
                          <tr>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                              👔 Employee
                            </td>
                            <td style={{ padding: '7px 10px' }}>Reserved</td>
                            <td style={{ padding: '7px 10px', fontWeight: 800 }}>
                              {selectedIpo.subscription.employee}x
                            </td>
                            <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>Fully Covered</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Day-by-Day Bidding Progression */}
                  {selectedIpo.subscription.dayBreakdown && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                        📅 Day-by-Day Bidding Progression Trend
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }} className="mono-num">
                        {selectedIpo.subscription.dayBreakdown.map((day, idx) => (
                          <div key={idx} style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--accent-blue)' }}>{day.day}</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                              {day.total} Total
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              QIB: <strong>{day.qib}</strong> • NII: <strong>{day.nii}</strong> • Retail: <strong>{day.retail}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 🎯 TAB 2: BUY RECOMMENDATION & PLAYBOOK */}
              {modalTab === 'RECOMMENDATION' && selectedIpo.recommendation && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Verdict Hero Banner */}
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--emerald-pos-bg-soft)',
                    border: '1px solid var(--accent-green-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Zap style={{ width: '13px', height: '13px' }} />
                      <span>INSTITUTIONAL VERDICT</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedIpo.recommendation.verdict}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {selectedIpo.recommendation.recommendedStrategy}
                    </div>
                  </div>

                  {/* Target Price & Suitability Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }} className="mono-num">
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target Listing Price</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                        {selectedIpo.recommendation.targetListingPrice}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Investor Suitability</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {selectedIpo.recommendation.investorSuitability}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Risk Assessment</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>
                        {selectedIpo.recommendation.riskGrade}
                      </div>
                    </div>
                  </div>

                  {/* Key Strengths and Risks */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                    <div style={{ backgroundColor: 'var(--emerald-pos-bg-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--accent-green-border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                        <span>Core Strengths</span>
                      </div>
                      <ul style={{ paddingLeft: '14px', marginTop: '6px', fontSize: '10px', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                        {selectedIpo.pros?.map((p, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ backgroundColor: 'var(--accent-red-bg)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--accent-red-border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldAlert style={{ width: '13px', height: '13px' }} />
                        <span>Risk Disclosures</span>
                      </div>
                      <ul style={{ paddingLeft: '14px', marginTop: '6px', fontSize: '10px', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                        {selectedIpo.cons?.map((c, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>
              )}

              {/* 🏢 TAB 3: BUSINESS MODEL */}
              {modalTab === 'BUSINESS' && selectedIpo.businessOverview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Detailed Description */}
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '4px' }}>
                      Detailed Company Overview
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                      {selectedIpo.businessOverview.whatTheCompanyDoes}
                    </p>
                  </div>

                  {/* Core Product Lines */}
                  {selectedIpo.businessOverview.coreProducts && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', marginBottom: '6px' }}>
                        📦 Key Products & Verticals
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                        {selectedIpo.businessOverview.coreProducts.map((prod, idx) => (
                          <div key={idx} style={{ padding: '6px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check style={{ width: '12px', height: '12px', color: 'var(--accent-green)', flexShrink: 0 }} />
                            <span>{prod}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manufacturing & Moat */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '3px' }}>🏭 Facilities</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {selectedIpo.businessOverview.manufacturingCapabilities}
                      </p>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '3px' }}>🏰 Moat</div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {selectedIpo.businessOverview.industryMoat}
                      </p>
                    </div>
                  </div>

                  {/* Marquee Clients */}
                  {selectedIpo.businessOverview.marqueeClients && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Marquee Customers
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedIpo.businessOverview.marqueeClients.map((client, idx) => (
                          <span key={idx} style={{ padding: '3px 7px', borderRadius: '5px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: '10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            ⭐ {client}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 📊 3-YEAR FINANCIAL STATEMENTS */}
                  {selectedIpo.financials && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', margin: 0 }}>
                        📊 3-Year Financial Growth & Performance
                      </div>
                      
                      {/* High Level Ratio Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }} className="mono-num">
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Revenue (FY24)</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{selectedIpo.financials.revenueFY24}</div>
                          <div style={{ fontSize: '10px', color: 'var(--accent-green)' }}>CAGR: {selectedIpo.financials.cagr3Yr}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PAT (FY24)</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>{selectedIpo.financials.patFY24}</div>
                          <div style={{ fontSize: '10px', color: 'var(--accent-green)' }}>CAGR: {selectedIpo.financials.patCagr3Yr}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EBITDA Margin</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>{selectedIpo.financials.ebitdaMargin}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROE %</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>{selectedIpo.financials.ronw}</div>
                        </div>
                      </div>

                      {/* 3-Year Comparison Table */}
                      <div className="pro-card-glass table-scroll" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }} className="mono-num">
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '6px 10px' }}>Metric</th>
                              <th style={{ padding: '6px 10px' }}>FY22</th>
                              <th style={{ padding: '6px 10px' }}>FY23</th>
                              <th style={{ padding: '6px 10px' }}>FY24</th>
                              <th style={{ padding: '6px 10px' }}>Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--text-main)' }}>Revenue</td>
                              <td style={{ padding: '6px 10px' }}>{selectedIpo.financials.revenueFY22 || 'N/A'}</td>
                              <td style={{ padding: '6px 10px' }}>{selectedIpo.financials.revenueFY23}</td>
                              <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--accent-blue)' }}>{selectedIpo.financials.revenueFY24}</td>
                              <td style={{ padding: '6px 10px', color: 'var(--accent-green)' }}>+{selectedIpo.financials.cagr3Yr}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--text-main)' }}>PAT Net Profit</td>
                              <td style={{ padding: '6px 10px' }}>{selectedIpo.financials.patFY22 || 'N/A'}</td>
                              <td style={{ padding: '6px 10px' }}>{selectedIpo.financials.patFY23}</td>
                              <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--accent-green)' }}>{selectedIpo.financials.patFY24}</td>
                              <td style={{ padding: '6px 10px', color: 'var(--accent-green)' }}>+{selectedIpo.financials.patCagr3Yr}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--text-main)' }}>Basic EPS</td>
                              <td style={{ padding: '6px 10px' }}>-</td>
                              <td style={{ padding: '6px 10px' }}>-</td>
                              <td style={{ padding: '6px 10px', fontWeight: 800 }}>{selectedIpo.financials.epsFY24 || '—'}</td>
                              <td style={{ padding: '6px 10px', color: 'var(--accent-gold)' }}>P/E: {selectedIpo.financials.peRatio}x</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 👥 TAB 4: PEER VALUATION & ANCHORS */}
              {modalTab === 'VALUATION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Valuation vs Industry Peers
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                      Company P/E: <strong className="mono-num" style={{ color: 'var(--accent-green)' }}>{selectedIpo.financials?.peRatio}x</strong> vs Sector Median: <strong className="mono-num" style={{ color: 'var(--accent-gold)' }}>{selectedIpo.financials?.industryPe}x</strong>.
                    </p>
                  </div>

                  {selectedIpo.peers && (
                    <div className="pro-card-glass table-scroll" style={{ padding: 0, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }} className="mono-num">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '6px 10px' }}>Company</th>
                            <th style={{ padding: '6px 10px' }}>P/E</th>
                            <th style={{ padding: '6px 10px' }}>Market Cap</th>
                            <th style={{ padding: '6px 10px' }}>EBITDA</th>
                            <th style={{ padding: '6px 10px' }}>ROE %</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--emerald-pos-bg-soft)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--accent-green)' }}>
                              ⭐ {selectedIpo.companyName}
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--accent-green)' }}>{selectedIpo.financials?.peRatio}x</td>
                            <td style={{ padding: '6px 10px' }}>{selectedIpo.financials?.marketCapCr != null ? `${currPrefix}${selectedIpo.financials.marketCapCr.toLocaleString('en-US')} ${unit}` : '—'}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--accent-blue)' }}>{selectedIpo.financials?.ebitdaMargin}</td>
                            <td style={{ padding: '6px 10px' }}>{selectedIpo.financials?.ronw}</td>
                          </tr>

                          {selectedIpo.peers.map((peer, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--text-main)' }}>{peer.name}</td>
                              <td style={{ padding: '6px 10px', fontWeight: 700 }}>{peer.pe}x</td>
                              <td style={{ padding: '6px 10px' }}>{peer.marketCap}</td>
                              <td style={{ padding: '6px 10px' }}>{peer.ebitdaMargin || '18.5%'}</td>
                              <td style={{ padding: '6px 10px' }}>{peer.roe || '19.2%'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Fund Utilization & Anchor Book */}
                  {selectedIpo.fundUtilization && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '4px' }}>
                        🎯 Use of Proceeds
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                        <div>
                          <strong style={{ color: 'var(--accent-green)' }}>Fresh Issue ({currPrefix}{selectedIpo.freshIssueCr} {unit}): </strong>
                          {selectedIpo.fundUtilization.freshIssueUse}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--accent-gold)' }}>OFS ({currPrefix}{selectedIpo.ofsCr} {unit}): </strong>
                          {selectedIpo.fundUtilization.promoterOFS}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedIpo.anchorAllotment && (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                        <Users style={{ width: '13px', height: '13px' }} />
                        <span>Anchor Allotment ({currPrefix}{selectedIpo.anchorAllotment.amountCr} {unit})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                        {selectedIpo.anchorAllotment.marqueeInvestors.map((inv, idx) => (
                          <div key={idx} style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏛️</span>
                            <span>{inv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
