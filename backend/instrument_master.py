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

        # 2. Indian Equities - Full Nifty 50 + Nifty Next 50 Highlights + Key Midcaps
        indian_equities = [
            # ── Nifty 50 Large Caps ──────────────────────────────────────────────
            ("RELIANCE",    "RELIANCE.NS",    "INE002A01018", "Reliance Industries Ltd",               "Energy & Oil",                   "Large Cap", 250,   0.05, 10.0),
            ("TCS",         "TCS.NS",          "INE467B01029", "Tata Consultancy Services Ltd",         "IT Services",                    "Large Cap", 175,   0.05, 10.0),
            ("HDFCBANK",    "HDFCBANK.NS",     "INE040A01034", "HDFC Bank Ltd",                         "Banking & Financials",            "Large Cap", 550,   0.05, 10.0),
            ("INFY",        "INFY.NS",         "INE009A01021", "Infosys Ltd",                           "IT Services",                    "Large Cap", 400,   0.05, 10.0),
            ("ICICIBANK",   "ICICIBANK.NS",    "INE090A01021", "ICICI Bank Ltd",                        "Banking & Financials",            "Large Cap", 700,   0.05, 10.0),
            ("BHARTIARTL",  "BHARTIARTL.NS",   "INE397D01024", "Bharti Airtel Ltd",                     "Telecom",                        "Large Cap", 475,   0.05, 10.0),
            ("ITC",         "ITC.NS",          "INE154A01025", "ITC Ltd",                               "FMCG",                           "Large Cap", 1600,  0.05, 10.0),
            ("SBIN",        "SBIN.NS",         "INE062A01020", "State Bank of India",                   "Banking & Financials",            "Large Cap", 750,   0.05, 10.0),
            ("LT",          "LT.NS",           "INE018A01030", "Larsen & Toubro Ltd",                   "Infrastructure & Capital Goods",  "Large Cap", 150,   0.05, 10.0),
            ("AXISBANK",    "AXISBANK.NS",     "INE238A01034", "Axis Bank Ltd",                         "Banking & Financials",            "Large Cap", 625,   0.05, 10.0),
            ("BAJFINANCE",  "BAJFINANCE.NS",   "INE296A01024", "Bajaj Finance Ltd",                     "Banking & Financials",            "Large Cap", 125,   0.05, 10.0),
            ("KOTAKBANK",   "KOTAKBANK.NS",    "INE237A01028", "Kotak Mahindra Bank Ltd",               "Banking & Financials",            "Large Cap", 400,   0.05, 10.0),
            ("WIPRO",       "WIPRO.NS",        "INE075A01022", "Wipro Ltd",                             "IT Services",                    "Large Cap", 1500,  0.05, 10.0),
            ("ONGC",        "ONGC.NS",         "INE213A01029", "Oil & Natural Gas Corporation",          "Energy & Oil",                   "Large Cap", 1925,  0.05, 10.0),
            ("ADANIENT",    "ADANIENT.NS",     "INE423A01024", "Adani Enterprises Ltd",                 "Diversified Conglomerate",        "Large Cap", 300,   0.05, 10.0),
            ("ADANIPORTS",  "ADANIPORTS.NS",   "INE742F01042", "Adani Ports & SEZ Ltd",                 "Infrastructure & Ports",          "Large Cap", 625,   0.05, 10.0),
            ("HINDUNILVR",  "HINDUNILVR.NS",   "INE030A01027", "Hindustan Unilever Ltd",                "FMCG",                           "Large Cap", 300,   0.05, 10.0),
            ("BAJAJFINSV",  "BAJAJFINSV.NS",   "INE918I01026", "Bajaj Finserv Ltd",                     "Banking & Financials",            "Large Cap", 500,   0.05, 10.0),
            ("ASIANPAINT",  "ASIANPAINT.NS",   "INE021A01026", "Asian Paints Ltd",                      "Consumer Goods",                  "Large Cap", 200,   0.05, 10.0),
            ("MARUTI",      "MARUTI.NS",       "INE585B01010", "Maruti Suzuki India Ltd",               "Automotive & EV",                "Large Cap", 50,    0.05, 10.0),
            ("SUNPHARMA",   "SUNPHARMA.NS",    "INE044A01036", "Sun Pharmaceutical Industries",         "Pharma & Healthcare",             "Large Cap", 350,   0.05, 10.0),
            ("HCLTECH",     "HCLTECH.NS",      "INE860A01027", "HCL Technologies Ltd",                  "IT Services",                    "Large Cap", 350,   0.05, 10.0),
            ("TECHM",       "TECHM.NS",        "INE669C01036", "Tech Mahindra Ltd",                     "IT Services",                    "Large Cap", 600,   0.05, 10.0),
            ("M&M",         "M&M.NS",          "INE101A01026", "Mahindra & Mahindra Ltd",               "Automotive & EV",                "Large Cap", 350,   0.05, 10.0),
            ("NTPC",        "NTPC.NS",         "INE733E01010", "NTPC Ltd",                              "Power & Energy",                  "Large Cap", 1500,  0.05, 10.0),
            ("TITAN",       "TITAN.NS",        "INE280A01028", "Titan Company Ltd",                     "Consumer & Retail",               "Large Cap", 175,   0.05, 10.0),
            ("POWERGRID",   "POWERGRID.NS",    "INE752E01010", "Power Grid Corporation",                "Power & Energy",                  "Large Cap", 1800,  0.05, 10.0),
            ("ULTRACEMCO",  "ULTRACEMCO.NS",   "INE481G01011", "UltraTech Cement Ltd",                  "Materials & Cement",              "Large Cap", 50,    0.05, 10.0),
            ("TATAMOTORS",  "TATAMOTORS.NS",   "INE028A01039", "Tata Motors Ltd",                       "Automotive & EV",                "Large Cap", 1375,  0.05, 10.0),
            ("TATASTEEL",   "TATASTEEL.NS",    "INE081A01020", "Tata Steel Ltd",                        "Metals & Mining",                 "Large Cap", 5500,  0.05, 10.0),
            ("JSWSTEEL",    "JSWSTEEL.NS",     "INE019A01038", "JSW Steel Ltd",                         "Metals & Mining",                 "Large Cap", 600,   0.05, 10.0),
            ("GRASIM",      "GRASIM.NS",       "INE047A01021", "Grasim Industries Ltd",                 "Diversified & Cement",            "Large Cap", 125,   0.05, 10.0),
            ("CIPLA",       "CIPLA.NS",        "INE059A01026", "Cipla Ltd",                             "Pharma & Healthcare",             "Large Cap", 650,   0.05, 10.0),
            ("DRREDDY",     "DRREDDY.NS",      "INE089A01023", "Dr Reddy Laboratories",                 "Pharma & Healthcare",             "Large Cap", 125,   0.05, 10.0),
            ("DIVISLAB",    "DIVISLAB.NS",     "INE361B01024", "Divi's Laboratories Ltd",               "Pharma & Healthcare",             "Large Cap", 200,   0.05, 10.0),
            ("COALINDIA",   "COALINDIA.NS",    "INE522F01014", "Coal India Ltd",                        "Mining & Metals",                 "Large Cap", 1500,  0.05, 10.0),
            ("BPCL",        "BPCL.NS",         "INE029A01011", "Bharat Petroleum Corp",                 "Energy & Oil",                   "Large Cap", 1800,  0.05, 10.0),
            ("EICHERMOT",   "EICHERMOT.NS",    "INE066A01021", "Eicher Motors Ltd",                     "Automotive & EV",                "Large Cap", 175,   0.05, 10.0),
            ("SHRIRAMFIN",  "SHRIRAMFIN.NS",   "INE721A01013", "Shriram Finance Ltd",                   "Banking & Financials",            "Large Cap", 300,   0.05, 10.0),
            ("BAJAJ-AUTO",  "BAJAJ-AUTO.NS",   "INE917I01010", "Bajaj Auto Ltd",                        "Automotive & EV",                "Large Cap", 75,    0.05, 10.0),
            ("HEROMOTOCO",  "HEROMOTOCO.NS",   "INE158A01026", "Hero MotoCorp Ltd",                     "Automotive & EV",                "Large Cap", 300,   0.05, 10.0),
            ("TATACONSUM",  "TATACONSUM.NS",   "INE192A01025", "Tata Consumer Products",                "FMCG",                           "Large Cap", 550,   0.05, 10.0),
            ("APOLLOHOSP",  "APOLLOHOSP.NS",   "INE437A01024", "Apollo Hospitals Enterprise",           "Pharma & Healthcare",             "Large Cap", 125,   0.05, 10.0),
            ("INDUSINDBK",  "INDUSINDBK.NS",   "INE095A01012", "IndusInd Bank Ltd",                     "Banking & Financials",            "Large Cap", 700,   0.05, 10.0),
            # ── Nifty Next 50 / Midcap Stars ──────────────────────────────────────
            ("TRENT",       "TRENT.NS",        "INE849A01020", "Trent Ltd (Tata)",                      "Consumer & Retail",               "Mid Cap", 100,   0.05, 10.0),
            ("HAL",         "HAL.NS",          "INE066F01012", "Hindustan Aeronautics Ltd",             "Defence & Aerospace",             "Mid Cap", 150,   0.05, 10.0),
            ("BEL",         "BEL.NS",          "INE263A01024", "Bharat Electronics Ltd",                "Defence & Aerospace",             "Mid Cap", 2850,  0.05, 10.0),
            ("IRFC",        "IRFC.NS",         "INE053F01010", "Indian Railway Finance Corp",           "PSU & Railways",                  "Mid Cap", 3500,  0.05, 20.0),
            ("RECLTD",      "RECLTD.NS",       "INE020B01018", "REC Ltd",                               "PSU & Power Finance",             "Mid Cap", 1000,  0.05, 10.0),
            ("ZOMATO",      "ZOMATO.NS",       "INE758T01015", "Zomato Ltd (Eternal)",                  "Consumer Tech",                   "Mid Cap", 2000,  0.05, 10.0),
            ("JIOFIN",      "JIOFIN.NS",       "INE758E01017", "Jio Financial Services",                "Banking & Financials",            "Mid Cap", 1500,  0.05, 10.0),
            ("KPITTECH",    "KPITTECH.NS",     "INE04I401011", "KPIT Technologies Ltd",                 "Auto Tech & Software",            "Mid Cap", 400,   0.05, 10.0),
            ("TATAPOWER",   "TATAPOWER.NS",    "INE245A01021", "Tata Power Company Ltd",                "Power & Energy",                  "Mid Cap", 2700,  0.05, 10.0),
            ("ADANIGREEN",  "ADANIGREEN.NS",   "INE364U01010", "Adani Green Energy Ltd",                "Renewable Energy",                "Mid Cap", 1000,  0.05, 10.0),
            ("SUZLON",      "SUZLON.NS",       "INE040H01021", "Suzlon Energy Ltd",                     "Renewable Energy",                "Small Cap", 5000, 0.05, 5.0),
            ("PAYTM",       "PAYTM.NS",        "INE982J01020", "One 97 Communications (Paytm)",         "Fintech",                        "Small Cap", 1000,  0.05, 10.0),
            ("BANDHANBNK",  "BANDHANBNK.NS",   "INE545U01014", "Bandhan Bank Ltd",                      "Banking & Financials",            "Mid Cap", 1950,  0.05, 10.0),
            ("PERSISTENT",  "PERSISTENT.NS",   "INE262H01021", "Persistent Systems Ltd",                "IT Services",                    "Mid Cap", 250,   0.05, 10.0),
            ("MPHASIS",     "MPHASIS.NS",      "INE356A01018", "Mphasis Ltd",                           "IT Services",                    "Mid Cap", 350,   0.05, 10.0),
            ("COFORGE",     "COFORGE.NS",      "INE591G01017", "Coforge Ltd",                           "IT Services",                    "Mid Cap", 200,   0.05, 10.0),
            ("LTIM",        "LTIM.NS",         "INE214T01019", "LTIMindtree Ltd",                       "IT Services",                    "Large Cap", 150,  0.05, 10.0),
            ("DIXON",       "DIXON.NS",        "INE935N01012", "Dixon Technologies Ltd",                "Electronics & Manufacturing",     "Mid Cap", 50,    0.05, 10.0),
            ("HAVELLS",     "HAVELLS.NS",      "INE176B01034", "Havells India Ltd",                     "Electrical & Industrial",         "Mid Cap", 500,   0.05, 10.0),
            ("MARICO",      "MARICO.NS",       "INE196A01026", "Marico Ltd",                            "FMCG",                           "Mid Cap", 1200,  0.05, 10.0),
            ("DABUR",       "DABUR.NS",        "INE016A01026", "Dabur India Ltd",                       "FMCG",                           "Mid Cap", 2150,  0.05, 10.0),
            ("BRITANNIA",   "BRITANNIA.NS",    "INE216A01030", "Britannia Industries Ltd",              "FMCG",                           "Mid Cap", 200,   0.05, 10.0),
            ("GODREJCP",    "GODREJCP.NS",     "INE102D01028", "Godrej Consumer Products",              "FMCG",                           "Mid Cap", 500,   0.05, 10.0),
            ("PIDILITIND",  "PIDILITIND.NS",   "INE318A01026", "Pidilite Industries Ltd",               "Specialty Chemicals",             "Mid Cap", 250,   0.05, 10.0),
            ("TORNTPHARM",  "TORNTPHARM.NS",   "INE685A01028", "Torrent Pharmaceuticals",               "Pharma & Healthcare",             "Mid Cap", 150,   0.05, 10.0),
            ("CHOLAFIN",    "CHOLAFIN.NS",     "INE121A01024", "Cholamandalam Investment",              "Banking & Financials",            "Mid Cap", 600,   0.05, 10.0),
            ("MUTHOOTFIN",  "MUTHOOTFIN.NS",   "INE414G01012", "Muthoot Finance Ltd",                   "Banking & Financials",            "Mid Cap", 400,   0.05, 10.0),
            ("HDFCAMC",     "HDFCAMC.NS",      "INE127D01025", "HDFC Asset Management Co",              "Banking & Financials",            "Mid Cap", 300,   0.05, 10.0),
            ("SBILIFE",     "SBILIFE.NS",      "INE123W01016", "SBI Life Insurance Co",                 "Insurance",                       "Large Cap", 750,  0.05, 10.0),
            ("HDFCLIFE",    "HDFCLIFE.NS",     "INE795G01014", "HDFC Life Insurance Co",                "Insurance",                       "Large Cap", 1100, 0.05, 10.0),
            ("ICICIPRULI",  "ICICIPRULI.NS",   "INE726G01019", "ICICI Prudential Life Insurance",       "Insurance",                       "Mid Cap", 1500,  0.05, 10.0),
            ("ICICIGI",     "ICICIGI.NS",      "INE765G01017", "ICICI Lombard General Insurance",       "Insurance",                       "Mid Cap", 600,   0.05, 10.0),
            ("BERGEPAINT",  "BERGEPAINT.NS",   "INE463A01038", "Berger Paints India",                   "Consumer Goods",                  "Mid Cap", 1100,  0.05, 10.0),
            ("NESTLEIND",   "NESTLEIND.NS",    "INE239A01024", "Nestle India Ltd",                      "FMCG",                           "Large Cap", 50,   0.05, 10.0),
            ("NAUKRI",      "NAUKRI.NS",       "INE663F01024", "Info Edge India (Naukri)",              "Consumer Tech",                   "Mid Cap", 150,   0.05, 10.0),
            ("ATUL",        "ATUL.NS",         "INE100A01010", "Atul Ltd",                              "Specialty Chemicals",             "Mid Cap", 125,   0.05, 10.0),
            ("ALKEM",       "ALKEM.NS",        "INE540L01014", "Alkem Laboratories Ltd",                "Pharma & Healthcare",             "Mid Cap", 125,   0.05, 10.0),
            ("OBEROIRLTY",  "OBEROIRLTY.NS",   "INE093I01010", "Oberoi Realty Ltd",                     "Real Estate",                    "Mid Cap", 500,   0.05, 10.0),
            ("DLF",         "DLF.NS",          "INE271C01023", "DLF Ltd",                               "Real Estate",                    "Large Cap", 1250, 0.05, 10.0),
            ("GODREJPROP",  "GODREJPROP.NS",   "INE484J01027", "Godrej Properties Ltd",                 "Real Estate",                    "Mid Cap", 400,   0.05, 10.0),
            ("PRESTIGE",    "PRESTIGE.NS",     "INE811K01011", "Prestige Estates Projects",             "Real Estate",                    "Mid Cap", 600,   0.05, 10.0),
            ("INDIANB",     "INDIANB.NS",      "INE562A01011", "Indian Bank",                           "Banking & Financials",            "Mid Cap", 1800,  0.05, 10.0),
            ("PNB",         "PNB.NS",          "INE160A01022", "Punjab National Bank",                  "Banking & Financials",            "Mid Cap", 5000,  0.05, 10.0),
            ("CANBK",       "CANBK.NS",        "INE476A01022", "Canara Bank",                           "Banking & Financials",            "Mid Cap", 3900,  0.05, 10.0),
            ("UNIONBANK",   "UNIONBANK.NS",    "INE692A01016", "Union Bank of India",                   "Banking & Financials",            "Mid Cap", 4100,  0.05, 10.0),
            ("BANKINDIA",   "BANKINDIA.NS",    "INE084A01016", "Bank of India",                         "Banking & Financials",            "Mid Cap", 3000,  0.05, 10.0),
            ("IDFCFIRSTB",  "IDFCFIRSTB.NS",   "INE092T01019", "IDFC First Bank Ltd",                   "Banking & Financials",            "Mid Cap", 9900,  0.05, 10.0),
            ("FEDERALBNK",  "FEDERALBNK.NS",   "INE171A01029", "Federal Bank Ltd",                      "Banking & Financials",            "Mid Cap", 5000,  0.05, 10.0),
            ("YESBANK",     "YESBANK.NS",      "INE528G01027", "Yes Bank Ltd",                          "Banking & Financials",            "Small Cap", 40000, 0.05, 5.0),
            ("IRCTC",       "IRCTC.NS",        "INE335Y01020", "IRCTC Ltd",                             "PSU & Railways",                  "Mid Cap", 1250,  0.05, 10.0),
            ("NMDC",        "NMDC.NS",         "INE584A01023", "NMDC Ltd",                              "Mining & Metals",                 "Mid Cap", 4650,  0.05, 10.0),
            ("MOTHERSON",   "MOTHERSON.NS",    "INE149A01033", "Samvardhana Motherson Intl",            "Automotive & EV",                "Mid Cap", 3000,  0.05, 10.0),
            ("APOLLOTYRE",  "APOLLOTYRE.NS",   "INE438A01022", "Apollo Tyres Ltd",                      "Automotive & EV",                "Mid Cap", 2100,  0.05, 10.0),
            ("MRF",         "MRF.NS",          "INE883A01011", "MRF Ltd",                               "Automotive & EV",                "Large Cap", 3,    0.05, 10.0),
            ("BOSCHLTD",    "BOSCHLTD.NS",     "INE323A01026", "Bosch Ltd",                             "Automotive & EV",                "Large Cap", 12,   0.05, 10.0),
            ("ABB",         "ABB.NS",          "INE117A01022", "ABB India Ltd",                         "Electrical & Industrial",         "Large Cap", 100,  0.05, 10.0),
            ("SIEMENS",     "SIEMENS.NS",      "INE003A01024", "Siemens Ltd",                           "Electrical & Industrial",         "Large Cap", 100,  0.05, 10.0),
            ("CGPOWER",     "CGPOWER.NS",      "INE067A01029", "CG Power & Industrial Sol",             "Electrical & Industrial",         "Mid Cap", 1550,  0.05, 10.0),
            ("BHEL",        "BHEL.NS",         "INE257A01026", "Bharat Heavy Electricals",              "Infrastructure & Capital Goods",  "Mid Cap", 3800,  0.05, 10.0),
            ("INDIANHOTEL",  "INDIANHOTEL.NS",  "INE053A01029", "Indian Hotels Company",                 "Hotels & Hospitality",            "Mid Cap", 1400,  0.05, 10.0),
            ("INTERGLOBE",  "INTERGLOBE.NS",   "INE646L01027", "InterGlobe Aviation (IndiGo)",          "Aviation & Travel",               "Large Cap", 400,  0.05, 10.0),
            ("SPICEJET",    "SPICEJET.NS",     "INE285B01017", "SpiceJet Ltd",                          "Aviation & Travel",               "Small Cap", 7000, 0.05, 5.0),
            ("JUBLFOOD",    "JUBLFOOD.NS",     "INE797F01020", "Jubilant FoodWorks (Dominos)",          "Consumer & Retail",               "Mid Cap", 1250,  0.05, 10.0),
            ("DEVYANI",     "DEVYANI.NS",      "INE274L01020", "Devyani International (KFC)",           "Consumer & Retail",               "Mid Cap", 3800,  0.05, 10.0),
            ("NYKAA",       "NYKAA.NS",        "INE388Y01029", "FSN E-Commerce (Nykaa)",                "Consumer Tech",                   "Mid Cap", 1400,  0.05, 10.0),
            ("POLICYBZR",   "POLICYBZR.NS",    "INE417T01026", "PB Fintech (PolicyBazaar)",             "Fintech",                        "Mid Cap", 500,   0.05, 10.0),
            ("DELHIVERY",   "DELHIVERY.NS",    "INE418H01029", "Delhivery Ltd",                         "Logistics & Supply Chain",        "Mid Cap", 1000,  0.05, 10.0),
            ("CARTRADE",    "CARTRADE.NS",     "INE440V01017", "CarTrade Tech Ltd",                     "Consumer Tech",                   "Small Cap", 1100, 0.05, 10.0),
            ("LICI",        "LICI.NS",         "INE0J1Y01017", "Life Insurance Corp of India",          "Insurance",                       "Large Cap", 1200, 0.05, 10.0),
            ("SOLARINDS",   "SOLARINDS.NS",    "INE038I01046", "Solar Industries India",                "Defence & Aerospace",             "Mid Cap", 50,   0.05, 10.0),
            ("KALYANKJIL",  "KALYANKJIL.NS",   "INE303R01014", "Kalyan Jewellers India",                "Consumer & Retail",               "Mid Cap", 2500, 0.05, 10.0),
            ("SENCO",       "SENCO.NS",        "INE454V01012", "Senco Gold Ltd",                        "Consumer & Retail",               "Small Cap", 1250, 0.05, 10.0),
            ("TATACHEM",    "TATACHEM.NS",     "INE092A01019", "Tata Chemicals Ltd",                    "Specialty Chemicals",             "Mid Cap", 550,  0.05, 10.0),
            ("DEEPAKNTR",   "DEEPAKNTR.NS",    "INE288B01029", "Deepak Nitrite Ltd",                    "Specialty Chemicals",             "Mid Cap", 200,  0.05, 10.0),
            ("NAVINFLUOR",  "NAVINFLUOR.NS",   "INE048G01026", "Navin Fluorine International",          "Specialty Chemicals",             "Mid Cap", 150,  0.05, 10.0),
            ("VIDYAWIRES",  "VIDYAWIRES.NS",   "INE0VID01019", "Vidya Wires Ltd",                       "Electrical & Industrial",         "Small Cap", 1000, 0.05, 20.0),
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

        # 4. US Equities - Magnificent 7 + Top S&P 500
        us_equities = [
            # ── Magnificent 7 ─────────────────────────────────────────────────
            ("NVDA",  "NVDA",  "US67066G1040", "NVIDIA Corporation",               "Semiconductors & AI",      "Mega Cap", 1, 0.01, 20.0),
            ("AAPL",  "AAPL",  "US0378331005", "Apple Inc",                         "Consumer Electronics",      "Mega Cap", 1, 0.01, 20.0),
            ("MSFT",  "MSFT",  "US5949181045", "Microsoft Corporation",             "Software & Cloud",          "Mega Cap", 1, 0.01, 20.0),
            ("AMZN",  "AMZN",  "US0231351067", "Amazon.com Inc",                    "E-Commerce & Cloud",        "Mega Cap", 1, 0.01, 20.0),
            ("GOOGL", "GOOGL", "US02079K3059", "Alphabet Inc (Google)",             "Internet & Search",         "Mega Cap", 1, 0.01, 20.0),
            ("META",  "META",  "US30303M1027", "Meta Platforms (Facebook)",         "Social Media & AI",         "Mega Cap", 1, 0.01, 20.0),
            ("TSLA",  "TSLA",  "US88160R1014", "Tesla Inc",                         "Automotive & EV",           "Large Cap", 1, 0.01, 20.0),
            # ── Top S&P 500 ───────────────────────────────────────────────────
            ("AMD",   "AMD",   "US0079031078", "Advanced Micro Devices",            "Semiconductors",            "Large Cap", 1, 0.01, 20.0),
            ("AVGO",  "AVGO",  "US11135F1012", "Broadcom Inc",                      "Semiconductors",            "Large Cap", 1, 0.01, 20.0),
            ("INTC",  "INTC",  "US4581401001", "Intel Corporation",                 "Semiconductors",            "Large Cap", 1, 0.01, 20.0),
            ("QCOM",  "QCOM",  "US7475251036", "Qualcomm Inc",                      "Semiconductors",            "Large Cap", 1, 0.01, 20.0),
            ("ARM",   "ARM",   "GB0002634946", "Arm Holdings plc",                  "Semiconductors & AI",       "Large Cap", 1, 0.01, 20.0),
            ("JPM",   "JPM",   "US46625H1005", "JPMorgan Chase & Co",               "Banking & Financials",       "Large Cap", 1, 0.01, 20.0),
            ("BAC",   "BAC",   "US0605051046", "Bank of America Corp",              "Banking & Financials",       "Large Cap", 1, 0.01, 20.0),
            ("GS",    "GS",    "US38141G1040", "Goldman Sachs Group",               "Banking & Financials",       "Large Cap", 1, 0.01, 20.0),
            ("MS",    "MS",    "US6174464486", "Morgan Stanley",                    "Banking & Financials",       "Large Cap", 1, 0.01, 20.0),
            ("V",     "V",     "US92826C8394", "Visa Inc",                          "Financial Payments",         "Large Cap", 1, 0.01, 20.0),
            ("MA",    "MA",    "US57636Q1040", "Mastercard Inc",                    "Financial Payments",         "Large Cap", 1, 0.01, 20.0),
            ("LLY",   "LLY",   "US5324571083", "Eli Lilly and Company",             "Pharma & Biotech",           "Large Cap", 1, 0.01, 20.0),
            ("JNJ",   "JNJ",   "US4781601046", "Johnson & Johnson",                 "Pharma & Healthcare",        "Large Cap", 1, 0.01, 20.0),
            ("UNH",   "UNH",   "US91324P1021", "UnitedHealth Group Inc",            "Health Insurance",           "Large Cap", 1, 0.01, 20.0),
            ("PFE",   "PFE",   "US7170811035", "Pfizer Inc",                        "Pharma & Biotech",           "Large Cap", 1, 0.01, 20.0),
            ("ABBV",  "ABBV",  "US00287Y1091", "AbbVie Inc",                        "Pharma & Biotech",           "Large Cap", 1, 0.01, 20.0),
            ("WMT",   "WMT",   "US9311421039", "Walmart Inc",                       "Retail & FMCG",              "Large Cap", 1, 0.01, 20.0),
            ("COST",  "COST",  "US12206C1009", "Costco Wholesale Corp",             "Retail & FMCG",              "Large Cap", 1, 0.01, 20.0),
            ("BRK-B", "BRK-B", "US0846707026", "Berkshire Hathaway Inc",            "Financial Conglomerate",     "Mega Cap", 1, 0.01, 20.0),
            ("NFLX",  "NFLX",  "US64110L1061", "Netflix Inc",                       "Streaming Media",            "Large Cap", 1, 0.01, 20.0),
            ("DIS",   "DIS",   "US2546871060", "The Walt Disney Company",           "Media & Entertainment",      "Large Cap", 1, 0.01, 20.0),
            ("ORCL",  "ORCL",  "US68389X1054", "Oracle Corporation",                "Enterprise Software",        "Large Cap", 1, 0.01, 20.0),
            ("CRM",   "CRM",   "US79466L3024", "Salesforce Inc",                    "Enterprise Software",        "Large Cap", 1, 0.01, 20.0),
            ("UBER",  "UBER",  "US90353T1007", "Uber Technologies Inc",             "Mobility & Logistics",       "Large Cap", 1, 0.01, 20.0),
            ("PLTR",  "PLTR",  "US69608A1088", "Palantir Technologies Inc",         "AI & Data Analytics",        "Large Cap", 1, 0.01, 20.0),
            ("SPOT",  "SPOT",  "LU1778762911", "Spotify Technology SA",             "Streaming Media",            "Large Cap", 1, 0.01, 20.0),
            ("COIN",  "COIN",  "US19260Q1076", "Coinbase Global Inc",               "Fintech & Crypto",           "Mid Cap", 1, 0.01, 20.0),
            ("SQ",    "SQ",    "US8522341036", "Block Inc (Square)",                "Fintech",                   "Mid Cap", 1, 0.01, 20.0),
            ("PYPL",  "PYPL",  "US70450Y1038", "PayPal Holdings Inc",               "Fintech",                   "Large Cap", 1, 0.01, 20.0),
        ]

        for sym, d_sym, isin, name, sector, cap, lot, tick, circuit in us_equities:
            self._register(Instrument(
                exchange=Exchange.NASDAQ if sym in ["NVDA","AAPL","MSFT","AMZN","GOOGL","META","TSLA","AMD","AVGO","INTC","QCOM","ARM","NFLX","COST","ORCL","CRM","UBER","PLTR","SPOT","COIN","SQ","PYPL"] else Exchange.NYSE,
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
