import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Layers, Clock } from 'lucide-react';
import { CONTROL_HEADERS, apiFetch } from '../utils/api';
import { ErrorBanner } from './ui/primitives';

export default function PaperTradingHub({ currentMarket = 'IN', onSelectStock }) {
  const [portfolio, setPortfolio] = useState(null);
  const [, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS');
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState(10);
  const [lotSize, setLotSize] = useState(null);
  const [price, setPrice] = useState(1310.0);
  const [stopLoss, setStopLoss] = useState(1285.0);
  const [takeProfit, setTakeProfit] = useState(1360.0);
  const [riskPreview, setRiskPreview] = useState(null);
  const [riskCheckError, setRiskCheckError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';

  const fetchPortfolio = () => {
    apiFetch(`/api/paper/portfolio`)
      .then(res => {
        if (!res.ok) throw new Error(`Portfolio HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setPortfolio(data);
        setFetchError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch paper portfolio:", err);
        setFetchError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSymbol(currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS');
  }, [currentMarket]);

  // Update default price when symbol changes
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/api/market-state/${symbol}`, { signal: controller.signal })
      .then(async res => {
        const st = typeof res?.json === 'function' ? await res.json() : res;
        if (st && st.price) {
          setPrice(st.price);
          setStopLoss(side === 'BUY' ? Math.round(st.price * 0.98 * 100) / 100 : Math.round(st.price * 1.02 * 100) / 100);
          setTakeProfit(side === 'BUY' ? Math.round(st.price * 1.04 * 100) / 100 : Math.round(st.price * 0.96 * 100) / 100);
        }
        if (st && Number.isInteger(st.lotSize) && st.lotSize > 0) {
          setQuantity(prevQty => {
            const q = Number(prevQty);
            if (!Number.isInteger(q) || q <= 0 || q % st.lotSize !== 0) return st.lotSize;
            return q;
          });
          setLotSize(st.lotSize);
        } else {
          setLotSize(null);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
      });
    return () => controller.abort();
  }, [symbol, side]);

  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum > 0;
  const priceValid = Number.isFinite(priceNum) && priceNum > 0;

  // Live pre-trade risk evaluation preview (debounced)
  useEffect(() => {
    if (!(qtyValid && priceValid)) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiFetch(`/api/risk/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        signal: controller.signal,
        body: JSON.stringify({
          symbol,
          side,
          quantity: qtyNum,
          price: priceNum,
          stopLoss: stopLoss ? Number(stopLoss) : null,
          takeProfit: takeProfit ? Number(takeProfit) : null
        })
      })
      .then(async res => {
        const data = typeof res?.json === 'function' ? await res.json() : res;
        setRiskPreview(data);
        setRiskCheckError(null);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setRiskPreview(null);
        setRiskCheckError(
          err.message === 'Risk check HTTP 403'
            ? 'Risk service rejected this request (403). Check that VITE_CONTROL_TOKEN matches the backend CONTROL_TOKEN.'
            : `Risk check unavailable: ${err.message}`
        );
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [symbol, side, quantity, price, stopLoss, takeProfit, qtyNum, priceNum, qtyValid, priceValid]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (!qtyValid) {
      setOrderFeedback({ type: 'error', msg: 'Quantity must be a whole number greater than 0.' });
      return;
    }
    if (!priceValid) {
      setOrderFeedback({ type: 'error', msg: 'Price must be a number greater than 0.' });
      return;
    }
    if (!riskPreview) {
      setOrderFeedback({ type: 'error', msg: 'Risk check pending — cannot submit' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch(`/api/paper/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        body: JSON.stringify({
          symbol,
          side,
          quantity: qtyNum,
          price: priceNum,
          stopLoss: stopLoss ? Number(stopLoss) : null,
          takeProfit: takeProfit ? Number(takeProfit) : null,
          orderType: 'MARKET'
        })
      });
      const data = typeof res?.json === 'function' ? await res.json() : res;
      setIsSubmitting(false);

      if (data.status === 'FILLED') {
        setOrderFeedback({
          type: 'success',
          msg: `✅ PAPER ORDER FILLED: ${data.side} ${data.filledQuantity} ${data.symbol} @ ${currPrefix}${data.filledPrice} (Slippage: ${currPrefix}${data.slippage})`
        });
        fetchPortfolio();
      } else if (data.status === 'RISK_REJECTED') {
        setOrderFeedback({
          type: 'error',
          msg: `🛑 RISK GATE REJECTED: ${data.errorMessage}`
        });
      } else {
        setOrderFeedback({
          type: 'warning',
          msg: `Order status: ${data.status} - ${data.errorMessage || ''}`
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setOrderFeedback({ type: 'error', msg: `Order failed: ${err.message}` });
    }
  };

  const handleReset = async () => {
    if (window.confirm("Reset Paper Trading portfolio to initial virtual balance ₹10,00,000?")) {
      try {
        await apiFetch(`/api/paper/reset`, { method: 'POST', headers: CONTROL_HEADERS });
      } catch (err) {
        setOrderFeedback({ type: 'error', msg: `Portfolio reset failed: ${err.message}` });
      }
      fetchPortfolio();
    }
  };

  const summary = portfolio?.summary || {
    initialCapital: 1000000.0,
    cashBalance: 1000000.0,
    marketValue: 0.0,
    totalEquity: 1000000.0,
    unrealizedPnl: 0.0,
    realizedPnl: 0.0,
    totalPnl: 0.0,
    pnlPercent: 0.0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {fetchError && (
        <ErrorBanner message={`Failed to load paper portfolio: ${fetchError}`} onRetry={fetchPortfolio} />
      )}

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-elevated)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck style={{ width: '24px', height: '24px', color: 'var(--accent-green)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Paper Trading & OMS Terminal</h2>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-green-bg)',
                color: 'var(--accent-green)',
                border: '1px solid var(--accent-green-border)'
              }}>
                SIMULATED EXECUTION
              </span>
            </div>
            <p className="hide-on-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Zero real broker orders. All orders pass through strict Pre-Trade Risk Engine gates before virtual execution.
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="mobile-btn-touch"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw style={{ width: '12px', height: '12px' }} />
          <span>Reset</span>
        </button>
      </div>

      {/* Account Metrics Overview Bar */}
      <div className="mobile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        
        <div style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Portfolio Equity</div>
          <div className="mono-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {currPrefix}{summary.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Available Margin</div>
          <div className="mono-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>
            {currPrefix}{summary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Holdings Value</div>
          <div className="mono-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {currPrefix}{summary.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total P&L</div>
          <div className="mono-num" style={{
            fontSize: '18px',
            fontWeight: 800,
            color: summary.totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            marginTop: '2px'
          }}>
            {summary.totalPnl >= 0 ? '+' : ''}{currPrefix}{summary.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({summary.pnlPercent}%)
          </div>
        </div>

      </div>

      {/* Main Grid: Order Placement + Open Positions */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', alignItems: 'start' }} className="grid-responsive">
        
        {/* Order Placement Form with Pre-Trade Risk Preview */}
        <div style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>Place Paper Order</h3>
            <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 700, backgroundColor: 'rgba(41, 121, 255, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>Pre-Trade Risk Active</span>
          </div>

          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Symbol Input */}
            <div>
              <label htmlFor="pt-symbol" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Symbol</label>
              <input
                id="pt-symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="pro-input-field"
                style={{ width: '100%', fontSize: '13px', fontWeight: 700, minHeight: '40px' }}
                required
              />
            </div>

            {/* Buy / Sell Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSide('BUY')}
                style={{
                  minHeight: '40px',
                  padding: '8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: side === 'BUY' ? 'var(--accent-green)' : 'var(--md-sys-color-surface-container-high)',
                  color: side === 'BUY' ? 'var(--bg-dark)' : 'var(--text-secondary)',
                  border: side === 'BUY' ? 'none' : '1px solid var(--md-sys-color-outline-variant)',
                  cursor: 'pointer'
                }}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                style={{
                  minHeight: '40px',
                  padding: '8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: side === 'SELL' ? 'var(--accent-red)' : 'var(--md-sys-color-surface-container-high)',
                  color: side === 'SELL' ? 'var(--text-primary-light)' : 'var(--text-secondary)',
                  border: side === 'SELL' ? 'none' : '1px solid var(--md-sys-color-outline-variant)',
                  cursor: 'pointer'
                }}
              >
                SELL (SHORT)
              </button>
            </div>

            {/* Quantity and Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="pt-quantity" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Quantity{lotSize ? ` (lot: ${lotSize})` : ''}
                </label>
                <input
                  id="pt-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '13px', minHeight: '40px' }}
                  required
                />
                {/* Quick Qty Helper Chips */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[10, 50, 100].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q.toString())}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        cursor: 'pointer'
                      }}
                    >
                      +{q}
                    </button>
                  ))}
                </div>
                {!qtyValid && (
                  <div style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 700, marginTop: '3px' }}>
                    Quantity must be a whole number &gt; 0
                  </div>
                )}
                {lotSize && Number.isInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) % lotSize !== 0 && (
                  <div style={{ fontSize: '10px', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '3px' }}>
                    Must be a multiple of {lotSize}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pt-price" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Price ({currPrefix})</label>
                <input
                  id="pt-price"
                  type="number"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '13px', minHeight: '40px' }}
                  required
                />
                {!priceValid && (
                  <div style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 700, marginTop: '3px' }}>
                    Price must be greater than 0
                  </div>
                )}
              </div>
            </div>

            {/* Mandatory Stop Loss and Take Profit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="pt-stop-loss" style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Stop Loss ({currPrefix}) *
                </label>
                <input
                  id="pt-stop-loss"
                  type="number"
                  step="0.05"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Mandatory SL"
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '13px', borderColor: 'var(--accent-gold-border)', minHeight: '40px' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="pt-take-profit" style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Take Profit ({currPrefix})
                </label>
                <input
                  id="pt-take-profit"
                  type="number"
                  step="0.05"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Optional TP"
                  className="pro-input-field"
                  style={{ width: '100%', fontSize: '13px', borderColor: 'var(--accent-green-border)', minHeight: '40px' }}
                />
              </div>
            </div>

            {/* Risk Gate Preview Summary */}
            {riskPreview && (
              <div style={{
                backgroundColor: riskPreview.isApproved ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                border: `1px solid ${riskPreview.isApproved ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: riskPreview.isApproved ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {riskPreview.isApproved ? '✅ PRE-TRADE RISK PASSED' : '🛑 PRE-TRADE RISK BLOCKED'}
                  </span>
                  <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Est Value: {currPrefix}{riskPreview.estimatedOrderValue?.toLocaleString('en-US')}
                  </span>
                </div>
                {riskPreview.rejectReason && (
                  <div style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                    Reason: {riskPreview.rejectReason}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Message Banner */}
            {orderFeedback && (
              <div style={{
                backgroundColor: orderFeedback.type === 'success' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                border: `1px solid ${orderFeedback.type === 'success' ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                color: orderFeedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {orderFeedback.msg}
              </div>
            )}

            {riskCheckError && (
              <div style={{
                backgroundColor: 'var(--accent-red-bg)',
                border: '1px solid var(--accent-red-border)',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-red)'
              }}>
                ⚠️ {riskCheckError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !qtyValid || !priceValid || !riskPreview || (riskPreview && !riskPreview.isApproved)}
              className="mobile-btn-touch"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                backgroundColor: side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                color: side === 'BUY' ? 'var(--bg-dark)' : 'var(--text-primary-light)',
                border: 'none',
                cursor: (!qtyValid || !priceValid || !riskPreview || (riskPreview && !riskPreview.isApproved)) ? 'not-allowed' : 'pointer',
                opacity: (!qtyValid || !priceValid || !riskPreview || (riskPreview && !riskPreview.isApproved)) ? 0.5 : 1,
                transition: 'all 0.2s ease',
                marginTop: '4px'
              }}
            >
              {isSubmitting ? 'Routing to OMS...' : `Submit Paper ${side} Order`}
            </button>

          </form>
        </div>

        {/* Right: Active Positions & Orders Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Open Positions Table */}
          <div style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--md-sys-color-outline-variant)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ width: '16px', height: '16px', color: 'var(--accent-green)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Open Positions ({portfolio?.positions?.length || 0})
                </h3>
              </div>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mark-to-Market</span>
            </div>

            {portfolio?.positions && portfolio.positions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {portfolio.positions.map(p => {
                  const isUp = p.unrealizedPnl >= 0;
                  return (
                    <div
                      key={p.symbol}
                      className="native-stock-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        border: '1px solid var(--md-sys-color-outline-variant)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ticker-avatar" style={{ width: '32px', height: '32px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--border-subtle)' }}>
                          {p.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <button
                            onClick={() => onSelectStock && onSelectStock(p.symbol)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontWeight: 800, cursor: 'pointer', padding: 0, fontSize: '13px' }}
                          >
                            {p.symbol}
                          </button>
                          <div className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            Qty: {p.quantity} • Avg: {currPrefix}{p.averagePrice}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {currPrefix}{p.currentPrice}
                        </div>
                        <div className="mono-num" style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: isUp ? 'var(--accent-green)' : 'var(--accent-red)',
                          marginTop: '2px'
                        }}>
                          {isUp ? '+' : ''}{currPrefix}{p.unrealizedPnl} ({p.pnlPercent}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No active open positions. Place a paper trade to start.
              </div>
            )}
          </div>

          {/* Orders History Table */}
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock style={{ width: '16px', height: '16px', color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Order Management Log ({portfolio?.orders?.length || 0})
                </h3>
              </div>
              <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OMS State Machine</span>
            </div>

            {portfolio?.orders && portfolio.orders.length > 0 ? (
              <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Time</th>
                      <th style={{ padding: '6px 8px' }}>Symbol</th>
                      <th style={{ padding: '6px 8px' }}>Side</th>
                      <th style={{ padding: '6px 8px' }}>Qty</th>
                      <th style={{ padding: '6px 8px' }}>Fill Price</th>
                      <th style={{ padding: '6px 8px' }}>Status</th>
                      <th style={{ padding: '6px 8px' }}>Risk Checks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.orders.slice(0, 15).map(o => (
                      <tr key={o.orderId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="mono-num" style={{ padding: '8px', color: 'var(--text-muted)' }}>{o.createdTime}</td>
                        <td style={{ padding: '8px', fontWeight: 700, color: 'var(--text-main)' }}>{o.symbol}</td>
                        <td style={{ padding: '8px', fontWeight: 800, color: o.side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{o.side}</td>
                        <td className="mono-num" style={{ padding: '8px' }}>{o.quantity}</td>
                        <td className="mono-num" style={{ padding: '8px' }}>{currPrefix}{o.filledPrice || o.requestedPrice}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: o.status === 'FILLED' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                            color: o.status === 'FILLED' ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {o.riskEvaluation ? `${o.riskEvaluation.passedChecks}/${o.riskEvaluation.totalChecks} Passed` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No recent order history recorded.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
