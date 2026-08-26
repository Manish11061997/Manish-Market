import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { CONTROL_HEADERS, apiFetch } from '../utils/api';
import { Modal, ErrorBanner, EmptyState } from './ui/primitives';
import { saveCloudAlert, deleteCloudAlert, subscribeCloudAlerts } from '../utils/firebaseStore';

function getUserId() {
  if (typeof window === 'undefined') return 'guest';
  try {
    const raw = localStorage.getItem('manish_market_current_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u?.uid || u?.id || 'guest';
    }
  } catch {}
  return 'guest';
}

export default function PriceAlertsManager({ onClose, currentMarket = 'IN' }) {
  const [alerts, setAlerts] = useState([]);
  const [symbol, setSymbol] = useState(currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS');
  const [condition, setCondition] = useState('ABOVE');
  const [targetPrice, setTargetPrice] = useState(currentMarket === 'US' ? '230.00' : '1350.00');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const uid = getUserId();

  const fetchAlerts = async () => {
    try {
      const r = await apiFetch(`/api/alerts`);
      const d = typeof r?.json === 'function' ? await r.json() : r;
      if (d?.alerts) setAlerts(d.alerts);
      setFetchError(null);
    } catch (e) {
      console.warn("Failed to fetch backend alerts, using cloud fallback:", e);
    }
  };

  // Real-time Cloud Firestore subscription
  useEffect(() => {
    if (!uid || uid === 'guest') return;
    const unsub = subscribeCloudAlerts(uid, (cloudAlerts) => {
      if (Array.isArray(cloudAlerts) && cloudAlerts.length > 0) {
        setAlerts(cloudAlerts);
      }
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    setSymbol(currentMarket === 'US' ? 'NVDA' : 'RELIANCE.NS');
    setTargetPrice(currentMarket === 'US' ? '230.00' : '1350.00');
  }, [currentMarket]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const priceNum = Number(targetPrice);
    if (!symbol.trim()) {
      setValidationError('Symbol is required.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setValidationError('Target price must be a finite number greater than 0.');
      return;
    }
    setValidationError(null);
    setCreating(true);

    const newAlert = {
      id: `alt_${Date.now()}`,
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: priceNum,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    try {
      if (uid && uid !== 'guest') {
        saveCloudAlert(uid, newAlert);
      }
      setAlerts(prev => [newAlert, ...prev]);

      await apiFetch(`/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        body: JSON.stringify({ symbol, condition, targetPrice: priceNum })
      });
      fetchAlerts();
      setTargetPrice('');
    } catch (err) {
      console.warn("Notice syncing alert with backend:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      if (uid && uid !== 'guest') {
        deleteCloudAlert(uid, id);
      }
      setAlerts(prev => prev.filter(a => a.id !== id));
      await apiFetch(`/api/alerts/${id}`, { method: 'DELETE', headers: CONTROL_HEADERS });
    } catch (e) {
      console.warn("Notice deleting backend alert:", e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal open onClose={onClose} title="Real-Time Price Alerts" width="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Modal Intro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-8px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>
            <Bell style={{ width: '20px', height: '20px' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Evaluated live on incoming exchange ticks</span>
        </div>

        {fetchError && (
          <ErrorBanner message={`Alert API error: ${fetchError}`} onRetry={fetchAlerts} />
        )}

        {/* Create Form */}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-elevated)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>+ Create New Alert Rule</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: '10px' }} className="grid-responsive">
            <div>
              <label htmlFor="alert-symbol" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Symbol</label>
              <input
                id="alert-symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. RELIANCE.NS"
                className="pro-input-field mono-num"
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>

            <div>
              <label htmlFor="alert-condition" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Condition</label>
              <select
                id="alert-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="pro-input-field"
                style={{ width: '100%', fontSize: '12px' }}
              >
                <option value="ABOVE">Rises Above (&ge;)</option>
                <option value="BELOW">Drops Below (&le;)</option>
              </select>
            </div>

            <div>
              <label htmlFor="alert-target-price" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Target Price</label>
              <input
                id="alert-target-price"
                type="number"
                step="0.05"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="1350.00"
                className="pro-input-field mono-num"
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>
          </div>

          {validationError && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)' }}>
              ⚠️ {validationError}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-gold)',
              color: 'var(--bg-dark)',
              fontWeight: 800,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px'
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} /> Activate Real-Time Alert Rule
          </button>
        </form>

        {/* Active Rules List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Price Alert Rules ({alerts.length})</div>

          {alerts.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="No active alert rules"
              subtitle="Configure a price alert rule above and it will be evaluated live on every incoming exchange tick."
            />
          ) : (
            alerts.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: a.triggered ? 'var(--accent-green-bg)' : 'var(--bg-elevated)',
                  border: a.triggered ? '1px solid var(--accent-green-border)' : '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{a.symbol}</span>
                    <span style={{ fontSize: '11px', color: a.condition === 'ABOVE' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                      {a.condition === 'ABOVE' ? '▲ RISES ABOVE' : '▼ DROPS BELOW'}
                    </span>
                    <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      {(a.symbol.endsWith('.NS') || a.symbol.endsWith('.BO')) ? '₹' : '$'}{a.targetPrice}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Created: {a.createdTime} {a.triggered && `• TRIGGERED AT ${a.triggerPrice} (${a.triggerTime})`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId !== null}
                  aria-label={`Delete alert rule for ${a.symbol}`}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: deletingId === a.id ? 'wait' : 'pointer', padding: '4px', opacity: deletingId === a.id ? 0.5 : 1 }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </Modal>
  );
}
