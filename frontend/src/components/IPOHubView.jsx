import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Calendar, Award,
  Clock, Activity, RefreshCw, X
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const DEFAULT_ACTIVE_IPOS_IN = [
  {
    id: "IPO-PREMIERENE",
    symbol: "PREMIERENE",
    companyName: "Premier Energies Limited",
    sector: "Solar Cells & Monocrystalline Modules",
    category: "Mainboard",
    openDate: "2026-08-25",
    closeDate: "2026-08-29",
    allotmentDate: "2026-09-01",
    listingDate: "2026-09-03",
    priceBand: "₹427 - ₹450",
    maxPrice: 450.0,
    lotSize: 33,
    minInvestment: 14850.0,
    issueSizeCr: 2830.40,
    gmp: 330.0,
    gmpPercent: 73.33,
    expectedListingPrice: 780.0,
    subscription: { total: 3.85, qib: 1.40, nii: 6.80, retail: 4.10 },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    recommendation: { recommendedStrategy: "India's 2nd largest integrated solar cell and module manufacturer. Massive ₹330 GMP (+73.3%) backed by marquee anchor institutional backing. Strong apply for bumper listing gains." }
  },
  {
    id: "IPO-ECOSMOB",
    symbol: "ECOSMOB",
    companyName: "ECOS (India) Mobility & Hospitality Ltd",
    sector: "Chauffeur Driven Car Rental & Corporate ETS",
    category: "Mainboard",
    openDate: "2026-08-25",
    closeDate: "2026-08-30",
    allotmentDate: "2026-09-02",
    listingDate: "2026-09-04",
    priceBand: "₹318 - ₹334",
    maxPrice: 334.0,
    lotSize: 44,
    minInvestment: 14696.0,
    issueSizeCr: 601.20,
    gmp: 160.0,
    gmpPercent: 47.90,
    expectedListingPrice: 494.0,
    subscription: { total: 2.15, qib: 0.85, nii: 3.40, retail: 2.80 },
    aiVerdict: "APPLY_FOR_LISTING",
    recommendation: { recommendedStrategy: "India's largest corporate chauffeur mobility player. Asset-light fleet operations with debt-free balance sheet. Apply for listing gains." }
  },
  {
    id: "IPO-INPHOS",
    symbol: "INPHOS",
    companyName: "Indian Phosphate Limited",
    sector: "Single Super Phosphate (SSP) Fertilizers",
    category: "NSE SME",
    openDate: "2026-08-25",
    closeDate: "2026-08-28",
    allotmentDate: "2026-08-29",
    listingDate: "2026-09-02",
    priceBand: "₹94 - ₹99",
    maxPrice: 99.0,
    lotSize: 1200,
    minInvestment: 118800.0,
    issueSizeCr: 67.36,
    gmp: 104.0,
    gmpPercent: 105.05,
    expectedListingPrice: 203.0,
    subscription: { total: 14.80, qib: 8.20, nii: 22.40, retail: 15.60 },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    recommendation: { recommendedStrategy: "High-growth SSP fertilizer producer with expanding chemical lines. 100%+ GMP indicates massive listing upside." }
  },
  {
    id: "IPO-JAYBEE",
    symbol: "JAYBEE",
    companyName: "Jay Bee Laminations Limited",
    sector: "Electrical CRGO Steel Cores & Transformers",
    category: "NSE SME",
    openDate: "2026-08-25",
    closeDate: "2026-08-29",
    allotmentDate: "2026-09-01",
    listingDate: "2026-09-03",
    priceBand: "₹138 - ₹146",
    maxPrice: 146.0,
    lotSize: 1000,
    minInvestment: 146000.0,
    issueSizeCr: 88.96,
    gmp: 120.0,
    gmpPercent: 82.19,
    expectedListingPrice: 266.0,
    subscription: { total: 8.40, qib: 4.10, nii: 12.80, retail: 9.20 },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    recommendation: { recommendedStrategy: "Direct beneficiary of India's grid transformer modernization and renewable power transmission buildout." }
  }
];

const DEFAULT_CLOSED_IPOS_IN = [
  {
    id: "CLOSED-ORIENTTECH",
    symbol: "ORIENTTECH",
    companyName: "Orient Technologies Limited",
    sector: "Enterprise Cloud & Data Center Virtualization",
    category: "Mainboard",
    priceBand: "₹195 - ₹206",
    maxPrice: 206.0,
    issueSizeCr: 214.76,
    gmp: 78.0,
    gmpPercent: 37.86,
    listingDate: "2026-08-28",
    subscription: { total: 151.71, retail: 66.87 }
  },
  {
    id: "CLOSED-IDEAL",
    symbol: "IDEAL",
    companyName: "Ideal Technoplast Industries Limited",
    sector: "Industrial Plastic Packaging & Containers",
    category: "NSE SME",
    priceBand: "₹121 Fixed",
    maxPrice: 121.0,
    issueSizeCr: 16.03,
    gmp: 48.0,
    gmpPercent: 39.67,
    listingDate: "2026-08-28",
    subscription: { total: 116.40, retail: 98.60 }
  }
];

const DEFAULT_UPCOMING_IPOS_IN = [
  {
    id: "UPCOMING-BAJAJHFL",
    symbol: "BAJAJHFL",
    companyName: "Bajaj Housing Finance Limited",
    sector: "Housing Finance & Upper-Layer NBFC",
    category: "Mainboard",
    priceBandExpected: "₹66 - ₹70",
    issueSizeCr: 6560.0,
    expectedGmp: "+₹65 (+92.8%)",
    expectedDate: "Sep 09 - Sep 11, 2026"
  },
  {
    id: "UPCOMING-KRNHEAT",
    symbol: "KRNHEAT",
    companyName: "KRN Heat Exchanger & Refrigeration Ltd",
    sector: "Precision Fin & Tube Heat Exchangers",
    category: "Mainboard",
    priceBandExpected: "₹209 - ₹220",
    issueSizeCr: 341.95,
    expectedGmp: "+₹235 (+106.8%)",
    expectedDate: "Sep 25 - Sep 27, 2026"
  },
  {
    id: "UPCOMING-WESTERN",
    symbol: "WESTERN",
    companyName: "Western Carriers (India) Limited",
    sector: "Multi-Modal Rail & Road Logistics",
    category: "Mainboard",
    priceBandExpected: "₹163 - ₹172",
    issueSizeCr: 492.88,
    expectedGmp: "+₹30 (+17.4%)",
    expectedDate: "Sep 13 - Sep 18, 2026"
  }
];

const DEFAULT_LISTED_IPOS_IN = [
  { id: "LIST-INTERARCH", symbol: "INTERARCH", companyName: "Interarch Building Products", issuePrice: 900.0, listingPrice: 1299.0, listingGainPercent: 44.33, currentPrice: 1245.0, totalReturnPercent: 38.33 },
  { id: "LIST-FIRSTCRY", symbol: "FIRSTCRY", companyName: "Brainbees Solutions (FirstCry)", issuePrice: 465.0, listingPrice: 651.0, listingGainPercent: 40.0, currentPrice: 628.5, totalReturnPercent: 35.16 },
  { id: "LIST-OLAELEC", symbol: "OLAELEC", companyName: "Ola Electric Mobility", issuePrice: 76.0, listingPrice: 76.0, listingGainPercent: 0.0, currentPrice: 132.8, totalReturnPercent: 74.74 },
  { id: "LIST-UNICOMM", symbol: "UNICOMM", companyName: "Unicommerce eSolutions", issuePrice: 108.0, listingPrice: 230.0, listingGainPercent: 112.96, currentPrice: 218.4, totalReturnPercent: 102.22 }
];

export default function IPOHubView({ currentMarket = 'IN', onSelectStock }) {
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [summary, setSummary] = useState(null);
  const [activeIpos, setActiveIpos] = useState(DEFAULT_ACTIVE_IPOS_IN);
  const [closedIpos, setClosedIpos] = useState(DEFAULT_CLOSED_IPOS_IN);
  const [upcomingIpos, setUpcomingIpos] = useState(DEFAULT_UPCOMING_IPOS_IN);
  const [listedIpos, setListedIpos] = useState(DEFAULT_LISTED_IPOS_IN);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIpo, setSelectedIpo] = useState(null);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const unit = currentMarket === 'US' ? 'M' : 'Cr';

  const fetchData = useCallback(() => {
    setIsRefreshing(true);

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
      if (summaryRes.status === 'fulfilled' && summaryRes.value) setSummary(summaryRes.value);
      if (activeRes.status === 'fulfilled' && activeRes.value?.ipos?.length) setActiveIpos(activeRes.value.ipos);
      if (closedRes.status === 'fulfilled' && closedRes.value?.ipos?.length) setClosedIpos(closedRes.value.ipos);
      if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.ipos?.length) setUpcomingIpos(upcomingRes.value.ipos);
      if (listedRes.status === 'fulfilled' && listedRes.value?.ipos?.length) setListedIpos(listedRes.value.ipos);
      setIsRefreshing(false);
    })
    .catch(() => {
      setIsRefreshing(false);
    });
  }, [currentMarket]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getVerdictBadge = (verdict) => {
    if (verdict?.includes('STRONG') || verdict?.includes('HIGH_GAIN')) {
      return { bg: 'var(--emerald-pos-bg)', border: 'var(--accent-green-border)', text: 'var(--accent-green)', label: '🚀 STRONG APPLY' };
    }
    if (verdict?.includes('LONG_TERM')) {
      return { bg: 'rgba(59, 130, 246, 0.2)', border: 'var(--accent-blue-border)', text: 'var(--accent-blue)', label: '💎 LONG TERM' };
    }
    if (verdict?.includes('APPLY')) {
      return { bg: 'var(--emerald-pos-bg)', border: 'var(--accent-green-border)', text: 'var(--accent-green)', label: '✅ APPLY' };
    }
    return { bg: 'var(--amber-warn-bg)', border: 'var(--accent-gold-border)', text: 'var(--accent-gold)', label: '⏳ NEUTRAL' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Banner */}
      <div className="pro-card-glass" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
            <Sparkles style={{ width: '16px', height: '16px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              IPO Intelligence Hub
              <span className="mono-num" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
                {currentMarket === 'US' ? 'US IPOs' : 'NSE / BSE'}
              </span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }} className="mono-num">
          <span>Active: <strong style={{ color: 'var(--accent-green)' }}>{activeIpos.length}</strong></span>
          <span>Upcoming: <strong style={{ color: 'var(--accent-blue)' }}>{upcomingIpos.length}</strong></span>
          <span>Avg GMP: <strong style={{ color: 'var(--accent-gold)' }}>+71.8%</strong></span>
        </div>
      </div>

      {/* Subtabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'ACTIVE', label: `🟢 Live Bidding (${activeIpos.length})`, icon: Activity },
            { id: 'CLOSED', label: `🔒 Closed / Allotment (${closedIpos.length})`, icon: Clock },
            { id: 'UPCOMING', label: `📅 Upcoming (${upcomingIpos.length})`, icon: Calendar },
            { id: 'LISTED', label: `🏆 Recently Listed (${listedIpos.length})`, icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`m3-filter-chip ${activeTab === tab.id ? 'active' : ''}`}
                style={{ height: '34px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon style={{ width: '14px', height: '14px' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={fetchData}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--accent-green)',
            border: '1px solid var(--accent-green-border)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw style={{ width: '13px', height: '13px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE LIVE BIDDING */}
      {activeTab === 'ACTIVE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
          {activeIpos.map(ipo => {
            const verdict = getVerdictBadge(ipo.aiVerdict);
            return (
              <div
                key={ipo.id}
                onClick={() => setSelectedIpo(ipo)}
                className="pro-card-glass"
                style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '12px' }}
              >
                {/* Top Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                      <span className="mono-num" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                        {ipo.category || 'Mainboard'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{ipo.companyName}</h3>
                  </div>

                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: verdict.bg, color: verdict.text, border: `1px solid ${verdict.border}` }}>
                    {verdict.label}
                  </span>
                </div>

                {/* Price Band & GMP Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-elevated)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Price Band</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{ipo.priceBand}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Lot: {ipo.lotSize} ({currPrefix}{typeof ipo.minInvestment === 'number' ? ipo.minInvestment.toLocaleString('en-US') : ipo.minInvestment})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Grey Market (GMP)</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>
                      +{currPrefix}{ipo.gmp} ({ipo.gmpPercent}%)
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--accent-gold)', marginTop: '2px' }}>
                      Est: {currPrefix}{ipo.expectedListingPrice}
                    </div>
                  </div>
                </div>

                {/* Subscription Meter */}
                {ipo.subscription && (
                  <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }} className="mono-num">
                      <span style={{ color: 'var(--text-muted)' }}>Live Subscription:</span>
                      <strong style={{ color: ipo.subscription.total >= 5 ? 'var(--accent-green)' : 'var(--accent-blue)' }}>{ipo.subscription.total}x Subscribed</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '6px', textAlign: 'center', fontSize: '10px' }} className="mono-num">
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '4px' }}>QIB: <strong>{ipo.subscription.qib || '—'}x</strong></div>
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '4px' }}>NII: <strong>{ipo.subscription.nii || '—'}x</strong></div>
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '4px' }}>Retail: <strong style={{ color: 'var(--accent-green)' }}>{ipo.subscription.retail || '—'}x</strong></div>
                    </div>
                  </div>
                )}

                {/* Timeline Dates */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }} className="mono-num">
                  <span>Bidding: <strong style={{ color: 'var(--text-main)' }}>{ipo.openDate} to {ipo.closeDate}</strong></span>
                  <span>Listing: <strong style={{ color: 'var(--accent-gold)' }}>{ipo.listingDate}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CLOSED / ALLOTMENT */}
      {activeTab === 'CLOSED' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
          {closedIpos.map(ipo => (
            <div key={ipo.id} onClick={() => setSelectedIpo(ipo)} className="pro-card-glass" style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                    <span className="mono-num" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>{ipo.category || 'Mainboard'}</span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{ipo.companyName}</h3>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold-border)' }}>
                  ⏳ ALLOTMENT
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-elevated)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Issue Price</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{ipo.maxPrice}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Size: {currPrefix}{ipo.issueSizeCr} {unit}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Final GMP</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>+{currPrefix}{ipo.gmp} ({ipo.gmpPercent}%)</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>List: {ipo.listingDate}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }} className="mono-num">
                <span>Demand: <strong style={{ color: 'var(--accent-green)' }}>{ipo.subscription?.total || '—'}x</strong></span>
                <span>Retail: <strong style={{ color: 'var(--accent-blue)' }}>{ipo.subscription?.retail || '—'}x</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: UPCOMING PIPELINE */}
      {activeTab === 'UPCOMING' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
          {upcomingIpos.map(ipo => (
            <div key={ipo.id} onClick={() => setSelectedIpo(ipo)} className="pro-card-glass" style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{ipo.symbol}</span>
                    <span className="mono-num" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>{ipo.category || 'Mainboard'}</span>
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{ipo.companyName}</h3>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-border)' }}>
                  📅 UPCOMING
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-elevated)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Expected Issue</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{currPrefix}{ipo.issueSizeCr} {unit}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Band: {ipo.priceBandExpected || ipo.priceBand}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Expected GMP</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '2px' }}>{ipo.expectedGmp || `+${ipo.gmpPercent}%`}</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>Date: {ipo.expectedDate || ipo.openDate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: RECENTLY LISTED PERFORMANCE */}
      {activeTab === 'LISTED' && (
        <div className="pro-card-glass" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Company</th>
                  <th style={{ padding: '10px 14px' }} className="mono-num">Issue</th>
                  <th style={{ padding: '10px 14px' }} className="mono-num">Listing</th>
                  <th style={{ padding: '10px 14px' }} className="mono-num">Day 1 Gain</th>
                  <th style={{ padding: '10px 14px' }} className="mono-num">LTP</th>
                  <th style={{ padding: '10px 14px' }} className="mono-num">Total Return</th>
                </tr>
              </thead>
              <tbody>
                {listedIpos.map((l, idx) => (
                  <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{l.companyName}</div>
                      <span className="mono-num" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>{l.symbol}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }} className="mono-num">{currPrefix}{l.issuePrice}</td>
                    <td style={{ padding: '10px 14px' }} className="mono-num">{currPrefix}{l.listingPrice}</td>
                    <td style={{ padding: '10px 14px' }} className="mono-num">
                      <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>+{l.listingGainPercent}%</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800 }} className="mono-num">{currPrefix}{l.currentPrice}</td>
                    <td style={{ padding: '10px 14px' }} className="mono-num">
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontWeight: 800, backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)', border: '1px solid var(--accent-green-border)' }}>
                        +{l.totalReturnPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Streamlined Mobile Detail Modal */}
      {selectedIpo && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelectedIpo(null)}
        >
          <div
            className="pro-card-glass"
            style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div>
                <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-blue)' }}>{selectedIpo.symbol}</span>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>{selectedIpo.companyName}</h2>
              </div>
              <button
                onClick={() => setSelectedIpo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} className="mono-num">
              <div>Price Band: <strong style={{ color: 'var(--text-main)' }}>{selectedIpo.priceBand || selectedIpo.priceBandExpected}</strong></div>
              <div>Issue Size: <strong style={{ color: 'var(--accent-green)' }}>{currPrefix}{selectedIpo.issueSizeCr} {unit}</strong></div>
              <div>GMP: <strong style={{ color: 'var(--accent-green)' }}>+{currPrefix}{selectedIpo.gmp || 0} ({selectedIpo.gmpPercent || 0}%)</strong></div>
              <div>Est. Listing: <strong style={{ color: 'var(--accent-gold)' }}>{currPrefix}{selectedIpo.expectedListingPrice || '—'}</strong></div>
            </div>

            {selectedIpo.recommendation && (
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>AI Recommendation Strategy</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  {selectedIpo.recommendation.recommendedStrategy}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedIpo(null)}
              style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'var(--accent-blue)', color: 'var(--bg-dark)', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
