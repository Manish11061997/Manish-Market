from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class InstrumentType(str, Enum):
    EQUITY = "EQUITY"
    FUTURES = "FUTURES"
    OPTIONS = "OPTIONS"
    INDEX = "INDEX"

class OptionType(str, Enum):
    CALL = "CE"
    PUT = "PE"
    NONE = "NONE"

class Exchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    NYSE = "NYSE"
    NASDAQ = "NASDAQ"

@dataclass
class Instrument:
    exchange: Exchange
    trading_symbol: str        # e.g., "RELIANCE", "NIFTY24AUG24500CE", "NVDA"
    display_symbol: str        # e.g., "RELIANCE.NS", "NVDA"
    instrument_token: str      # Provider token e.g., "NSE_EQ_2885", "YF_RELIANCE.NS"
    isin: str                  # ISIN code e.g., "INE002A01018"
    instrument_type: InstrumentType
    name: str
    sector: str
    cap: str                   # "Large Cap", "Mid Cap", "Small Cap", "Mega Cap"
    currency: str              # "INR", "USD"
    timezone: str              # "Asia/Kolkata", "America/New_York"
    trading_session: str       # "REGULAR_NSE", "REGULAR_US"
    lot_size: int = 1
    tick_size: float = 0.05
    contract_multiplier: float = 1.0
    expiry: Optional[str] = None
    strike_price: Optional[float] = None
    option_type: OptionType = OptionType.NONE
    circuit_limit_pct: float = 20.0 # 5%, 10%, 20% or 0% for F&O/Indices
    is_active: bool = True
    provider_symbols: Dict[str, str] = field(default_factory=dict) # {"yahoo": "RELIANCE.NS", "zerodha": "2885"}

    def to_dict(self) -> dict:
        return {
            "exchange": self.exchange.value,
            "tradingSymbol": self.trading_symbol,
            "displaySymbol": self.display_symbol,
            "instrumentToken": self.instrument_token,
            "isin": self.isin,
            "instrumentType": self.instrument_type.value,
            "name": self.name,
            "sector": self.sector,
            "cap": self.cap,
            "currency": self.currency,
            "timezone": self.timezone,
            "tradingSession": self.trading_session,
            "lotSize": self.lot_size,
            "tickSize": self.tick_size,
            "contractMultiplier": self.contract_multiplier,
            "expiry": self.expiry,
            "strikePrice": self.strike_price,
            "optionType": self.option_type.value,
            "circuitLimitPct": self.circuit_limit_pct,
            "isActive": self.is_active,
            "providerSymbols": self.provider_symbols
        }

class InstrumentMasterRegistry:
    """
    Central Security Master for Multi-Exchange Instrument Definitions.
    Maintains unified mapping between Exchange Symbols, ISINs, Provider Tokens, and Derivatives specs.
    """

    def __init__(self):
        self._by_token: Dict[str, Instrument] = {}
        self._by_trading_symbol: Dict[str, Instrument] = {}
        self._by_display_symbol: Dict[str, Instrument] = {}
        self._by_isin: Dict[str, Instrument] = {}
        self._by_provider: Dict[str, Dict[str, Instrument]] = {"yahoo": {}, "internal": {}}
        self._initialize_master()

    def _register(self, inst: Instrument):
        self._by_token[inst.instrument_token] = inst
        self._by_trading_symbol[inst.trading_symbol.upper()] = inst
        self._by_display_symbol[inst.display_symbol.upper()] = inst
        if inst.isin:
            self._by_isin[inst.isin.upper()] = inst

        for provider, p_sym in inst.provider_symbols.items():
            if provider not in self._by_provider:
                self._by_provider[provider] = {}
            self._by_provider[provider][p_sym.upper()] = inst

    def _initialize_master(self):
        # 1. Indian Indices
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="NIFTY50", display_symbol="NIFTY50",
            instrument_token="NSE_IDX_NIFTY50", isin="IN9000000001", instrument_type=InstrumentType.INDEX,
            name="Nifty 50 Index", sector="Index", cap="Benchmark", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=25, tick_size=0.05, circuit_limit_pct=0.0,
            provider_symbols={"yahoo": "^NSEI", "internal": "NIFTY50"}
        ))
        self._register(Instrument(
            exchange=Exchange.BSE, trading_symbol="SENSEX", display_symbol="SENSEX",
            instrument_token="BSE_IDX_SENSEX", isin="IN9000000002", instrument_type=InstrumentType.INDEX,
            name="BSE Sensex Index", sector="Index", cap="Benchmark", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=10, tick_size=0.05, circuit_limit_pct=0.0,
            provider_symbols={"yahoo": "^BSESN", "internal": "SENSEX"}
        ))
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="NIFTYBANK", display_symbol="NIFTYBANK",
            instrument_token="NSE_IDX_NIFTYBANK", isin="IN9000000003", instrument_type=InstrumentType.INDEX,
            name="Nifty Bank Index", sector="Index", cap="Sectoral", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=15, tick_size=0.05, circuit_limit_pct=0.0,
            provider_symbols={"yahoo": "^NSEBANK", "internal": "NIFTYBANK"}
        ))
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="NIFTYIT", display_symbol="NIFTYIT",
            instrument_token="NSE_IDX_NIFTYIT", isin="IN9000000004", instrument_type=InstrumentType.INDEX,
            name="Nifty IT Index", sector="Index", cap="Sectoral", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=25, tick_size=0.05, circuit_limit_pct=0.0,
            provider_symbols={"yahoo": "^CNXIT", "internal": "NIFTYIT"}
        ))

        # 2. Indian Equities
        indian_equities = [
            ("RELIANCE", "RELIANCE.NS", "INE002A01018", "Reliance Industries Ltd", "Energy & Oil", "Large Cap", 250, 0.05, 10.0),
            ("TCS", "TCS.NS", "INE467B01029", "Tata Consultancy Services Ltd", "IT Services", "Large Cap", 175, 0.05, 10.0),
            ("HDFCBANK", "HDFCBANK.NS", "INE040A01034", "HDFC Bank Ltd", "Banking & Financials", "Large Cap", 550, 0.05, 10.0),
            ("INFY", "INFY.NS", "INE009A01021", "Infosys Ltd", "IT Services", "Large Cap", 400, 0.05, 10.0),
            ("ICICIBANK", "ICICIBANK.NS", "INE090A01021", "ICICI Bank Ltd", "Banking & Financials", "Large Cap", 700, 0.05, 10.0),
            ("BHARTIARTL", "BHARTIARTL.NS", "INE397D01024", "Bharti Airtel Ltd", "Telecom", "Large Cap", 475, 0.05, 10.0),
            ("ITC", "ITC.NS", "INE154A01025", "ITC Ltd", "FMCG", "Large Cap", 1600, 0.05, 10.0),
            ("SBIN", "SBIN.NS", "INE062A01020", "State Bank of India", "Banking & Financials", "Large Cap", 750, 0.05, 10.0),
            ("LT", "LT.NS", "INE018A01030", "Larsen & Toubro Ltd", "Infrastructure & Capital Goods", "Large Cap", 150, 0.05, 10.0),
            ("AXISBANK", "AXISBANK.NS", "INE238A01034", "Axis Bank Ltd", "Banking & Financials", "Large Cap", 625, 0.05, 10.0),
            ("BAJFINANCE", "BAJFINANCE.NS", "INE296A01024", "Bajaj Finance Ltd", "Banking & Financials", "Large Cap", 125, 0.05, 10.0),
            ("MARUTI", "MARUTI.NS", "INE585B01010", "Maruti Suzuki India Ltd", "Automotive & EV", "Large Cap", 50, 0.05, 10.0),
            ("SUNPHARMA", "SUNPHARMA.NS", "INE044A01036", "Sun Pharmaceutical Industries Ltd", "Pharma & Healthcare", "Large Cap", 350, 0.05, 10.0),
            ("HCLTECH", "HCLTECH.NS", "INE860A01027", "HCL Technologies Ltd", "IT Services", "Large Cap", 350, 0.05, 10.0),
            ("M&M", "M&M.NS", "INE101A01026", "Mahindra & Mahindra Ltd", "Automotive & EV", "Large Cap", 350, 0.05, 10.0),
            ("NTPC", "NTPC.NS", "INE733E01010", "NTPC Ltd", "Power & Energy", "Large Cap", 1500, 0.05, 10.0),
            ("TITAN", "TITAN.NS", "INE280A01028", "Titan Company Ltd", "Consumer & Retail", "Large Cap", 175, 0.05, 10.0),
            ("POWERGRID", "POWERGRID.NS", "INE752E01010", "Power Grid Corporation of India", "Power & Energy", "Large Cap", 1800, 0.05, 10.0),
            ("ULTRACEMCO", "ULTRACEMCO.NS", "INE481G01011", "UltraTech Cement Ltd", "Materials & Cement", "Large Cap", 50, 0.05, 10.0),
            ("TRENT", "TRENT.NS", "INE849A01020", "Trent Ltd (Tata)", "Consumer & Retail", "Mid Cap", 100, 0.05, 10.0),
            ("HAL", "HAL.NS", "INE066F01012", "Hindustan Aeronautics Ltd", "Defence & Aerospace", "Mid Cap", 150, 0.05, 10.0),
            ("BEL", "BEL.NS", "INE263A01024", "Bharat Electronics Ltd", "Defence & Aerospace", "Mid Cap", 2850, 0.05, 10.0),
            ("IRFC", "IRFC.NS", "INE053F01010", "Indian Railway Finance Corporation", "PSU & Railways", "Mid Cap", 3500, 0.05, 20.0),
            ("RECLTD", "RECLTD.NS", "INE020B01018", "REC Ltd", "PSU & Power Finance", "Mid Cap", 1000, 0.05, 10.0),
            ("SUZLON", "SUZLON.NS", "INE040H01021", "Suzlon Energy Ltd", "Renewable Energy", "Small Cap", 5000, 0.05, 5.0),
            ("ZOMATO", "ZOMATO.NS", "INE758T01015", "Zomato Ltd (Eternal)", "Consumer Tech", "Mid Cap", 2000, 0.05, 10.0),
            ("PAYTM", "PAYTM.NS", "INE982J01020", "One 97 Communications (Paytm)", "Fintech", "Small Cap", 1000, 0.05, 10.0),
            ("JIOFIN", "JIOFIN.NS", "INE758E01017", "Jio Financial Services Ltd", "Banking & Financials", "Mid Cap", 1500, 0.05, 10.0),
            ("KPITTECH", "KPITTECH.NS", "INE04I401011", "KPIT Technologies Ltd", "Auto Tech & Software", "Mid Cap", 400, 0.05, 10.0),
            ("VIDYAWIRES", "VIDYAWIRES.NS", "INE0VID01019", "Vidya Wires Ltd", "Electrical & Industrial", "Small Cap", 1000, 0.05, 20.0)
        ]

        for sym, d_sym, isin, name, sector, cap, lot, tick, circuit in indian_equities:
            self._register(Instrument(
                exchange=Exchange.NSE, trading_symbol=sym, display_symbol=d_sym,
                instrument_token=f"NSE_EQ_{isin[-6:]}", isin=isin, instrument_type=InstrumentType.EQUITY,
                name=name, sector=sector, cap=cap, currency="INR", timezone="Asia/Kolkata",
                trading_session="REGULAR_NSE", lot_size=lot, tick_size=tick, circuit_limit_pct=circuit,
                provider_symbols={"yahoo": d_sym, "internal": sym, "zerodha": isin[-6:]}
            ))

        # 3. US Indices
        self._register(Instrument(
            exchange=Exchange.NYSE, trading_symbol="SP500", display_symbol="SP500",
            instrument_token="US_IDX_GSPC", isin="US78378X1072", instrument_type=InstrumentType.INDEX,
            name="S&P 500 Index", sector="US Index", cap="Benchmark", currency="USD", timezone="America/New_York",
            trading_session="REGULAR_US", lot_size=1, tick_size=0.01, circuit_limit_pct=7.0,
            provider_symbols={"yahoo": "^GSPC", "internal": "SP500"}
        ))
        self._register(Instrument(
            exchange=Exchange.NASDAQ, trading_symbol="NASDAQ", display_symbol="NASDAQ",
            instrument_token="US_IDX_IXIC", isin="US6311011026", instrument_type=InstrumentType.INDEX,
            name="NASDAQ Composite Index", sector="US Index", cap="Benchmark", currency="USD", timezone="America/New_York",
            trading_session="REGULAR_US", lot_size=1, tick_size=0.01, circuit_limit_pct=7.0,
            provider_symbols={"yahoo": "^IXIC", "internal": "NASDAQ"}
        ))
        self._register(Instrument(
            exchange=Exchange.NYSE, trading_symbol="DOW", display_symbol="DOW",
            instrument_token="US_IDX_DJI", isin="US2605661048", instrument_type=InstrumentType.INDEX,
            name="Dow Jones Industrial Average", sector="US Index", cap="Benchmark", currency="USD", timezone="America/New_York",
            trading_session="REGULAR_US", lot_size=1, tick_size=0.01, circuit_limit_pct=7.0,
            provider_symbols={"yahoo": "^DJI", "internal": "DOW"}
        ))

        # 4. US Equities
        us_equities = [
            ("NVDA", "NVDA", "US67066G1040", "NVIDIA Corporation", "Semiconductors & AI", "Mega Cap", 1, 0.01, 20.0),
            ("AAPL", "AAPL", "US0378331005", "Apple Inc", "Consumer Electronics", "Mega Cap", 1, 0.01, 20.0),
            ("MSFT", "MSFT", "US5949181045", "Microsoft Corporation", "Software & Cloud", "Mega Cap", 1, 0.01, 20.0),
            ("AMZN", "AMZN", "US0231351067", "Amazon.com Inc", "E-Commerce & Cloud", "Mega Cap", 1, 0.01, 20.0),
            ("GOOGL", "GOOGL", "US02079K3059", "Alphabet Inc (Google)", "Internet & Search", "Mega Cap", 1, 0.01, 20.0),
            ("META", "META", "US30303M1027", "Meta Platforms (Facebook)", "Social Media & AI", "Mega Cap", 1, 0.01, 20.0),
            ("TSLA", "TSLA", "US88160R1014", "Tesla Inc", "Automotive & EV", "Large Cap", 1, 0.01, 20.0),
            ("AMD", "AMD", "US0079031078", "Advanced Micro Devices", "Semiconductors", "Large Cap", 1, 0.01, 20.0),
            ("BRK-B", "BRK-B", "US0846707026", "Berkshire Hathaway Inc", "Financial Conglomerate", "Mega Cap", 1, 0.01, 20.0),
            ("JPM", "JPM", "US46625H1005", "JPMorgan Chase & Co", "Banking & Financials", "Large Cap", 1, 0.01, 20.0),
            ("LLY", "LLY", "US5324571083", "Eli Lilly and Company", "Pharma & Biotech", "Large Cap", 1, 0.01, 20.0),
            ("AVGO", "AVGO", "US11135F1012", "Broadcom Inc", "Semiconductors", "Large Cap", 1, 0.01, 20.0),
            ("WMT", "WMT", "US9311421039", "Walmart Inc", "Retail & FMCG", "Large Cap", 1, 0.01, 20.0),
            ("V", "V", "US92826C8394", "Visa Inc", "Financial Payments", "Large Cap", 1, 0.01, 20.0),
            ("NFLX", "NFLX", "US64110L1061", "Netflix Inc", "Streaming Media", "Large Cap", 1, 0.01, 20.0)
        ]

        for sym, d_sym, isin, name, sector, cap, lot, tick, circuit in us_equities:
            self._register(Instrument(
                exchange=Exchange.NASDAQ if sym in ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "NFLX"] else Exchange.NYSE,
                trading_symbol=sym, display_symbol=d_sym,
                instrument_token=f"US_EQ_{isin[-6:]}", isin=isin, instrument_type=InstrumentType.EQUITY,
                name=name, sector=sector, cap=cap, currency="USD", timezone="America/New_York",
                trading_session="REGULAR_US", lot_size=lot, tick_size=tick, circuit_limit_pct=circuit,
                provider_symbols={"yahoo": d_sym, "internal": sym}
            ))

        # 5. Derivatives (Futures & Options Samples)
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="NIFTY24AUGFUT", display_symbol="NIFTY-FUT",
            instrument_token="NSE_FUT_NIFTY24AUG", isin="IN9000FUT001", instrument_type=InstrumentType.FUTURES,
            name="Nifty 50 Aug Future", sector="Derivatives", cap="Benchmark", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=25, tick_size=0.05, expiry="2026-08-27",
            provider_symbols={"internal": "NIFTY24AUGFUT"}
        ))
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="NIFTY24AUG24500CE", display_symbol="NIFTY 24500 CE",
            instrument_token="NSE_OPT_NIFTY24500CE", isin="IN9000OPT001", instrument_type=InstrumentType.OPTIONS,
            name="Nifty 24500 Call Option", sector="Derivatives", cap="Benchmark", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=25, tick_size=0.05, expiry="2026-08-27",
            strike_price=24500.0, option_type=OptionType.CALL,
            provider_symbols={"internal": "NIFTY24AUG24500CE"}
        ))
        self._register(Instrument(
            exchange=Exchange.NSE, trading_symbol="RELIANCE24AUG1320CE", display_symbol="RELIANCE 1320 CE",
            instrument_token="NSE_OPT_REL1320CE", isin="IN9000OPT002", instrument_type=InstrumentType.OPTIONS,
            name="Reliance 1320 Call Option", sector="Derivatives", cap="Large Cap", currency="INR", timezone="Asia/Kolkata",
            trading_session="REGULAR_NSE", lot_size=250, tick_size=0.05, expiry="2026-08-27",
            strike_price=1320.0, option_type=OptionType.CALL,
            provider_symbols={"internal": "RELIANCE24AUG1320CE"}
        ))

        logger.info(f"Instrument Master initialized with {len(self._by_token)} registered securities across NSE, BSE, NYSE, NASDAQ.")

    def lookup(self, identifier: str) -> Optional[Instrument]:
        """
        Universal lookup supporting trading symbol, display symbol, token, ISIN, or provider symbol.
        """
        if not identifier:
            return None
        clean = identifier.strip().upper().lstrip("$")
        
        # 1. Exact Token
        if clean in self._by_token:
            return self._by_token[clean]
        # 2. Display Symbol
        if clean in self._by_display_symbol:
            return self._by_display_symbol[clean]
        # 3. Trading Symbol
        if clean in self._by_trading_symbol:
            return self._by_trading_symbol[clean]
        # 4. ISIN
        if clean in self._by_isin:
            return self._by_isin[clean]
        # 5. Yahoo Provider Map
        if clean in self._by_provider.get("yahoo", {}):
            return self._by_provider["yahoo"][clean]
        # 6. Normalize .NS suffix
        if not clean.endswith(".NS") and f"{clean}.NS" in self._by_display_symbol:
            return self._by_display_symbol[f"{clean}.NS"]
        if clean.endswith(".NS") and clean.replace(".NS", "") in self._by_trading_symbol:
            return self._by_trading_symbol[clean.replace(".NS", "")]

        # Fuzzy Name Search
        for inst in self._by_token.values():
            if clean.lower() in inst.name.lower():
                return inst

        return None

    def get_provider_symbol(self, identifier: str, provider: str = "yahoo") -> str:
        """Get provider-specific symbol for market data querying."""
        inst = self.lookup(identifier)
        if not inst:
            return identifier
        return inst.provider_symbols.get(provider, inst.display_symbol)

    def get_all_instruments(self, exchange: Optional[Exchange] = None, instrument_type: Optional[InstrumentType] = None) -> List[Instrument]:
        results = list(self._by_token.values())
        if exchange:
            results = [i for i in results if i.exchange == exchange]
        if instrument_type:
            results = [i for i in results if i.instrument_type == instrument_type]
        return results

# Global Instrument Master Singleton
instrument_master = InstrumentMasterRegistry()
