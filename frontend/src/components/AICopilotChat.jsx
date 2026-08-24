import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowUpRight, Loader2, ShieldCheck, PlayCircle } from 'lucide-react';
import { CONTROL_HEADERS, apiFetch } from '../utils/api';

export default function AICopilotChat({ onSelectStock, onExecutePaperOrder }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Namaste! 🙏 I am your **Evidence-Based Market Assistant**.\n\nI strictly separate **Observed Facts** from **Quantitative Inference** and **Uncertainty**, ensuring zero invented data.\n\nAsk me any real-time query about live momentum, technical setups, circuit limits, or market breadth!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingOrder, setExecutingOrder] = useState(null);
  const chatEndRef = useRef(null);

  const executionKey = (proposal) => `${proposal.symbol}-${proposal.suggestedPrice}`;

  const presets = [
    "What is happening with RELIANCE right now?",
    "Is NVIDIA (NVDA) currently a buy or sell?",
    "What is the live market breadth and VIX status?",
    "Give me a swing trade plan for Infosys (INFY) with circuit limits"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await apiFetch(`/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        body: JSON.stringify({ message: textToSend })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.response,
          stockData: data.stockData,
          liveContext: data.liveContext,
          evidence: data.evidence,
          tradeProposal: data.tradeProposal
        }
      ]);
    } catch (err) {
      console.error("Market Assistant Chat API Error:", err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: "⚠️ Temporarily unable to reach the market server. Please verify FastAPI backend status."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const [executionToast, setExecutionToast] = useState(null);

  const handleQuickExecutePaper = async (proposal) => {
    if (!proposal) return;
    setExecutingOrder(executionKey(proposal));

    try {
      const res = await apiFetch(`/api/paper/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CONTROL_HEADERS },
        body: JSON.stringify({
          symbol: proposal.symbol,
          side: /buy/i.test(proposal.action) ? 'BUY' : 'SELL',
          quantity: proposal.lotSize || 10,
          price: proposal.suggestedPrice,
          stopLoss: proposal.stopLoss,
          takeProfit: proposal.target1,
          orderType: 'MARKET'
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const orderData = await res.json();
      setExecutingOrder(null);
      if (orderData.status === 'FILLED') {
        setExecutionToast(`✅ Paper Order Dispatched: ${proposal.symbol} @ ${proposal.currency}${proposal.suggestedPrice}`);
      } else {
        setExecutionToast(`⚠️ Order ${orderData.status}: ${orderData.errorMessage || 'Check risk limits'}`);
      }
      setTimeout(() => setExecutionToast(null), 4000);
      if (onExecutePaperOrder) onExecutePaperOrder(orderData);
    } catch (err) {
      setExecutingOrder(null);
      setExecutionToast(`❌ Order error: ${err.message}`);
      setTimeout(() => setExecutionToast(null), 4000);
    }
  };

  return (
    <div className="pro-card-glass" style={{ padding: '24px', height: '720px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,230,118,0.2)' }}>
            <Bot style={{ width: '22px', height: '22px', color: 'var(--bg-dark)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Evidence-Based Market Assistant <Sparkles style={{ width: '16px', height: '16px', color: 'var(--accent-gold)' }} />
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Strictly Separated Facts vs Inference vs Uncertainty • 0% Hallucination Policy
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: 'rgba(0, 230, 118, 0.1)', color: 'var(--accent-green)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--accent-green-border)' }}>
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          <span>VERIFIED LIVE ORDER FLOW</span>
        </div>
      </div>

      {executionToast && (
        <div style={{
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: executionToast.startsWith('✅') ? 'var(--accent-green-bg)' : 'var(--accent-gold-bg)',
          color: executionToast.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-gold)',
          border: executionToast.startsWith('✅') ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-gold-border)',
          margin: '4px 0'
        }}>
          {executionToast}
        </div>
      )}

      {/* Preset Suggestions Bar */}
      <div className="mobile-tab-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(p)}
            className="m3-filter-chip"
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles style={{ width: '12px', height: '12px', color: 'var(--accent-blue)' }} />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Thread */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', margin: '6px 0', paddingRight: '8px' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backgroundColor: msg.sender === 'user' ? 'var(--accent-gold-bg)' : 'var(--accent-green-bg)',
              color: msg.sender === 'user' ? 'var(--accent-gold)' : 'var(--accent-green)',
              border: msg.sender === 'user' ? '1px solid var(--accent-gold-border)' : '1px solid var(--accent-green-border)'
            }}>
              {msg.sender === 'user' ? <User style={{ width: '16px', height: '16px' }} /> : <Bot style={{ width: '16px', height: '16px' }} />}
            </div>

            <div style={{
              maxWidth: '88%',
              padding: '14px 18px',
              borderRadius: '16px',
              fontSize: '13px',
              lineHeight: 1.6,
              backgroundColor: msg.sender === 'user' ? 'var(--bg-elevated)' : 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              
              {/* Message Content */}
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

              {/* 1-Click Paper Order Execution Proposal Action Bar */}
              {msg.tradeProposal && (
                <div style={{
                  marginTop: '14px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-green)' }}>
                      PROPOSED PAPER EXECUTION:
                    </div>
                    <div className="mono-num" style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>
                      {msg.tradeProposal.action} {msg.tradeProposal.lotSize} Qty of {msg.tradeProposal.symbol} @ {msg.tradeProposal.currency}{msg.tradeProposal.suggestedPrice} (SL: {msg.tradeProposal.currency}{msg.tradeProposal.stopLoss})
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleQuickExecutePaper(msg.tradeProposal)}
                      disabled={executingOrder === executionKey(msg.tradeProposal)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-green)',
                        color: 'var(--bg-dark)',
                        fontWeight: 800,
                        fontSize: '11px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <PlayCircle style={{ width: '13px', height: '13px' }} />
                      <span>{executingOrder === executionKey(msg.tradeProposal) ? 'Executing...' : 'Execute Paper Trade'}</span>
                    </button>

                    <button
                      onClick={() => onSelectStock && onSelectStock(msg.tradeProposal.symbol)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--accent-blue)',
                        border: '1px solid var(--border-subtle)',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Chart</span>
                      <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
            <Loader2 style={{ width: '16px', height: '16px', color: 'var(--accent-green)', animation: 'spin 1s linear infinite' }} />
            <span>Market Assistant is verifying live market state, breadth, and circuit limits...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
        <input
          type="text"
          placeholder="Ask market query (e.g. 'Analyze Reliance breakout')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pro-input-field"
          style={{ width: '100%', fontSize: '13px', minHeight: '44px', borderRadius: '12px' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            minHeight: '44px',
            padding: '0 16px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent-blue)',
            color: 'var(--bg-dark)',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: loading || !input.trim() ? 0.5 : 1,
            flexShrink: 0
          }}
        >
          <Send style={{ width: '15px', height: '15px' }} />
          <span className="hide-on-mobile">Ask Assistant</span>
        </button>
      </form>

    </div>
  );
}
