import React, { useState, useEffect } from 'react';
import { 
  Bot, Users, ShieldAlert, TrendingUp, CheckCircle2, 
  AlertTriangle, Sparkles, MessageSquare, Cpu, BarChart2,
  RefreshCw, Scale, Award, ArrowRight, DollarSign, Activity
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function TradingAgentsCommitteeView({ symbol, currentMarket }) {
  const [provider, setProvider] = useState('google');
  const [researchDepth, setResearchDepth] = useState('standard');
  const [models, setModels] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch available LLM providers
    apiFetch('/api/tradingagents/models')
      .then(res => res.json())
      .then(data => {
        if (data?.providers) setModels(data.providers);
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/tradingagents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          llmProvider: provider,
          researchDepth
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} analysis error`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.warn("TradingAgents fetch notice:", err);
      // Fulfill via fallback
      try {
        const fallbackRes = await apiFetch(`/api/tradingagents/report/${encodeURIComponent(symbol)}?provider=${provider}`);
        const fallbackData = await fallbackRes.json();
        setReport(fallbackData);
      } catch (e) {
        setError("Failed to run multi-agent committee analysis.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [symbol, provider, researchDepth]);

  const currencySymbol = currentMarket === 'US' ? '$' : '₹';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">TradingAgents Multi-Agent Committee</h2>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-md font-mono">
                TauricResearch v0.3.1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous LangGraph multi-agent debate (Fundamental, Technical, Risk Management, Execution Arbiter).
            </p>
          </div>
        </div>

        {/* Model & Depth Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">LLM Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="google" className="bg-slate-900">Google Gemini Pro (18-mo Free)</option>
              <option value="openai" className="bg-slate-900">OpenAI (GPT-4o / GPT-5)</option>
              <option value="anthropic" className="bg-slate-900">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="deepseek" className="bg-slate-900">DeepSeek (V3 / R1)</option>
              <option value="ollama" className="bg-slate-900">Ollama Local</option>
              <option value="autonomous_quant" className="bg-slate-900">Autonomous Quant Graph</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Debate Depth:</span>
            <select
              value={researchDepth}
              onChange={(e) => setResearchDepth(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="standard" className="bg-slate-900">Standard (1 Round)</option>
              <option value="deep" className="bg-slate-900">Deep (Multi-Round Debate)</option>
            </select>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Re-Run Committee'}
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Bot className="w-10 h-10 text-emerald-400 animate-bounce mx-auto mb-3" />
          <h3 className="text-slate-200 font-semibold">Running TradingAgents Multi-Agent Simulation...</h3>
          <p className="text-xs text-slate-400 mt-1">
            Fundamental & Technical Analysts are compiling data, Bull & Bear researchers are debating trade thesis.
          </p>
        </div>
      ) : report ? (
        <>
          {/* Executive Verdict Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  <Award className="w-4 h-4" /> Multi-Agent Consensus Decision
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-slate-100">{report.symbol}</h2>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                    report.action?.toLowerCase().includes('buy')
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}>
                    {report.action}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                  {report.final_verdict}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Conviction</div>
                  <div className="text-lg font-bold text-emerald-400">{report.convictionScore}/100</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Risk : Reward</div>
                  <div className="text-lg font-bold text-slate-200">{report.riskRewardRatio}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Stop Loss</div>
                  <div className="text-lg font-bold text-rose-400">{currencySymbol}{report.stopLoss}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Target 1</div>
                  <div className="text-lg font-bold text-emerald-400">{currencySymbol}{report.targetPrices?.[0]}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Specialized Analyst Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Market Data Analyst */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  Market Data & Liquidity Analyst
                </div>
                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded">
                  {report.agents?.market_data_analyst?.status}
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.agents?.market_data_analyst?.observations?.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Technical & Pattern Analyst */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Technical & Pattern Analyst
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded">
                  {report.agents?.technical_analyst?.status}
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.agents?.technical_analyst?.signals?.map((sig, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Fundamental Analyst */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Fundamental & Valuation Analyst
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded">
                  {report.agents?.fundamental_analyst?.status}
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.agents?.fundamental_analyst?.metrics?.map((met, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{met}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. News & Sentiment Analyst */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <Activity className="w-4 h-4 text-purple-400" />
                  News & Macro Sentiment Analyst
                </div>
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold rounded">
                  Score: {report.agents?.news_sentiment_analyst?.sentimentScore}/100
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {report.agents?.news_sentiment_analyst?.catalysts?.map((cat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{cat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bull vs Bear Multi-Agent Debate Transcript */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-200 mb-4">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Multi-Agent Bull vs Bear Debate Transcript
            </div>
            <div className="space-y-3">
              {report.debate_transcript?.map((msg, i) => {
                const isBull = msg.speaker.includes('Bull');
                return (
                  <div key={i} className={`p-4 rounded-xl border flex flex-col gap-1 ${
                    isBull ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {msg.speaker}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Round {Math.floor(i / 2) + 1}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{msg.argument}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Management Committee Approvals */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-200 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Risk Management Committee Review
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(report.risk_committee || {}).map(([role, detail], i) => (
                <div key={i} className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="text-xs font-bold text-slate-300 capitalize mb-1">
                    {role.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-2 my-1">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded">
                      {detail.vote}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{detail.note}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
