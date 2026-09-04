/**
 * Comprehensive High-Accuracy Stock Universe & Aliases for Instant 0ms Fuzzy Search
 */

export const INDIAN_STOCKS_UNIVERSE = [
  { symbol: 'NIFTY50', name: 'NIFTY 50 Index (NSE)', sector: 'National Index', exchange: 'NSE', currency: 'INR', aliases: ['NIFTY', 'NIFTY 50', 'NIFTY50'] },
  { symbol: 'NIFTYBANK', name: 'NIFTY Bank Index (NSE)', sector: 'Banking Index', exchange: 'NSE', currency: 'INR', aliases: ['BANKNIFTY', 'BANK NIFTY', 'NIFTYBANK'] },
  { symbol: 'SENSEX', name: 'BSE Sensex Index (BSE 30)', sector: 'Benchmark Index', exchange: 'BSE', currency: 'INR', aliases: ['SENSEX', 'BSE SENSEX'] },
  { symbol: 'NIFTYIT', name: 'NIFTY IT Index (NSE)', sector: 'IT Sector Index', exchange: 'NSE', currency: 'INR', aliases: ['NIFTY IT', 'NIFTYIT'] },
  
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy & Oil', exchange: 'NSE', currency: 'INR', aliases: ['RIL', 'RELIANCE', 'JIO'] },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['TCS', 'TATA CONSULTANCY'] },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['HDFC', 'HDFC BANK'] },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['INFY', 'INFOSYS'] },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['ICICI', 'ICICI BANK'] },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', sector: 'Telecom', exchange: 'NSE', currency: 'INR', aliases: ['AIRTEL', 'BHARTI AIRTEL'] },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['SBI', 'STATE BANK', 'SBIN'] },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure & Capital Goods', exchange: 'NSE', currency: 'INR', aliases: ['LT', 'L&T', 'LARSEN'] },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', sector: 'Automotive & EV', exchange: 'NSE', currency: 'INR', aliases: ['TATA MOTORS', 'TATAMOTORS', 'TAMO', 'TATA'] },
  { symbol: 'ITC.NS', name: 'ITC Ltd', sector: 'FMCG', exchange: 'NSE', currency: 'INR', aliases: ['ITC'] },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd', sector: 'Automotive & EV', exchange: 'NSE', currency: 'INR', aliases: ['MARUTI', 'MARUTI SUZUKI'] },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['AXIS', 'AXIS BANK'] },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['KOTAK', 'KOTAK BANK'] },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['BAJAJ FINANCE', 'BAJFINANCE', 'BAJAJ'] },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd', sector: 'Financial Services', exchange: 'NSE', currency: 'INR', aliases: ['BAJAJ FINSERV'] },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd', sector: 'Automotive & 2W', exchange: 'NSE', currency: 'INR', aliases: ['BAJAJ AUTO'] },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharma & Healthcare', exchange: 'NSE', currency: 'INR', aliases: ['SUN PHARMA', 'SUNPHARMA'] },
  { symbol: 'TITAN.NS', name: 'Titan Company Ltd', sector: 'Consumer Goods & Retail', exchange: 'NSE', currency: 'INR', aliases: ['TITAN', 'TANISHQ'] },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd', sector: 'Metals & Mining', exchange: 'NSE', currency: 'INR', aliases: ['TATA STEEL', 'TATASTEEL'] },
  { symbol: 'TATAPOWER.NS', name: 'Tata Power Company Ltd', sector: 'Power & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['TATA POWER', 'TATAPOWER'] },
  { symbol: 'TRENT.NS', name: 'Trent Ltd (Westside & Zudio)', sector: 'Retail & Fashion', exchange: 'NSE', currency: 'INR', aliases: ['TRENT', 'ZUDIO', 'WESTSIDE'] },
  { symbol: 'NTPC.NS', name: 'NTPC Ltd', sector: 'Power & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['NTPC'] },
  { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation', sector: 'Energy & Oil', exchange: 'NSE', currency: 'INR', aliases: ['ONGC'] },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp of India', sector: 'Power & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['POWERGRID', 'POWER GRID'] },
  { symbol: 'COALINDIA.NS', name: 'Coal India Ltd', sector: 'Mining & Minerals', exchange: 'NSE', currency: 'INR', aliases: ['COAL INDIA', 'COALINDIA'] },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['HCL', 'HCL TECH'] },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['WIPRO'] },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra Ltd', sector: 'Automotive & EV', exchange: 'NSE', currency: 'INR', aliases: ['M&M', 'MAHINDRA'] },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', sector: 'Conglomerate', exchange: 'NSE', currency: 'INR', aliases: ['ADANI', 'ADANI ENTERPRISES'] },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports & SEZ Ltd', sector: 'Infrastructure & Ports', exchange: 'NSE', currency: 'INR', aliases: ['ADANI PORTS'] },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power Ltd', sector: 'Power & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['ADANI POWER'] },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd', sector: 'Materials & Cement', exchange: 'NSE', currency: 'INR', aliases: ['ULTRATECH', 'ULTRATECH CEMENT'] },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd', sector: 'Consumer Goods & Paints', exchange: 'NSE', currency: 'INR', aliases: ['ASIAN PAINTS', 'ASIANPAINT'] },
  { symbol: 'ZOMATO.NS', name: 'Zomato Ltd (Blinkit)', sector: 'Consumer Tech & Quick Commerce', exchange: 'NSE', currency: 'INR', aliases: ['ZOMATO', 'BLINKIT'] },
  { symbol: 'SWIGGY.NS', name: 'Swiggy Ltd (Instamart)', sector: 'Consumer Tech & Quick Commerce', exchange: 'NSE', currency: 'INR', aliases: ['SWIGGY', 'INSTAMART'] },
  { symbol: 'PAYTM.NS', name: 'One97 Communications (Paytm)', sector: 'FinTech', exchange: 'NSE', currency: 'INR', aliases: ['PAYTM', 'ONE97'] },
  { symbol: 'JIOFIN.NS', name: 'Jio Financial Services Ltd', sector: 'Financial Services', exchange: 'NSE', currency: 'INR', aliases: ['JIO', 'JIO FINANCIAL', 'JIOFIN'] },
  { symbol: 'IRFC.NS', name: 'Indian Railway Finance Corporation', sector: 'PSU & Railways', exchange: 'NSE', currency: 'INR', aliases: ['IRFC', 'RAILWAY FINANCE'] },
  { symbol: 'IRCTC.NS', name: 'Indian Railway Catering & Tourism Corp', sector: 'Railways & Tourism', exchange: 'NSE', currency: 'INR', aliases: ['IRCTC'] },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics Ltd', sector: 'Defence & Aerospace', exchange: 'NSE', currency: 'INR', aliases: ['HAL', 'HINDUSTAN AERONAUTICS'] },
  { symbol: 'BEL.NS', name: 'Bharat Electronics Ltd', sector: 'Defence & Aerospace', exchange: 'NSE', currency: 'INR', aliases: ['BEL', 'BHARAT ELECTRONICS'] },
  { symbol: 'SUZLON.NS', name: 'Suzlon Energy Ltd', sector: 'Renewable Energy', exchange: 'NSE', currency: 'INR', aliases: ['SUZLON', 'SUZLON ENERGY'] },
  { symbol: 'VEDL.NS', name: 'Vedanta Ltd', sector: 'Metals & Mining', exchange: 'NSE', currency: 'INR', aliases: ['VEDANTA', 'VEDL'] },
  { symbol: 'DMART.NS', name: 'Avenue Supermarts Ltd (DMart)', sector: 'Retail & Supermarkets', exchange: 'NSE', currency: 'INR', aliases: ['DMART', 'AVENUE SUPERMARTS'] },
  { symbol: 'VBL.NS', name: 'Varun Beverages Ltd (PepsiCo)', sector: 'Beverages & FMCG', exchange: 'NSE', currency: 'INR', aliases: ['VBL', 'VARUN BEVERAGES'] },
  { symbol: 'DIXON.NS', name: 'Dixon Technologies India Ltd', sector: 'Electronics Manufacturing', exchange: 'NSE', currency: 'INR', aliases: ['DIXON', 'DIXON TECH'] },
  { symbol: 'POLYCAB.NS', name: 'Polycab India Ltd', sector: 'Wires & Cables', exchange: 'NSE', currency: 'INR', aliases: ['POLYCAB'] },
  { symbol: 'KPITTECH.NS', name: 'KPIT Technologies Ltd', sector: 'Auto Tech & Software', exchange: 'NSE', currency: 'INR', aliases: ['KPIT', 'KPIT TECH'] },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Ltd (Royal Enfield)', sector: 'Automotive & 2W', exchange: 'NSE', currency: 'INR', aliases: ['EICHER', 'ROYAL ENFIELD'] },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries Ltd (Fevicol)', sector: 'Chemicals & Adhesives', exchange: 'NSE', currency: 'INR', aliases: ['PIDILITE', 'FEVICOL'] },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India Ltd (Maggi)', sector: 'FMCG & Food', exchange: 'NSE', currency: 'INR', aliases: ['NESTLE', 'MAGGI'] },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries Ltd', sector: 'FMCG & Food', exchange: 'NSE', currency: 'INR', aliases: ['BRITANNIA'] },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['INDUSIND', 'INDUSIND BANK'] },
  { symbol: 'PNB.NS', name: 'Punjab National Bank', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['PNB', 'PUNJAB NATIONAL BANK'] },
  { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['BANK OF BARODA', 'BOB'] },
  { symbol: 'CANBK.NS', name: 'Canara Bank', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['CANARA BANK', 'CANBK'] },
  { symbol: 'CIPLA.NS', name: 'Cipla Ltd', sector: 'Pharma & Healthcare', exchange: 'NSE', currency: 'INR', aliases: ['CIPLA'] },
  { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Ltd', sector: 'Pharma & Healthcare', exchange: 'NSE', currency: 'INR', aliases: ['DR REDDY', 'DRREDDY'] },
  { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Ltd', sector: 'Pharma & Healthcare', exchange: 'NSE', currency: 'INR', aliases: ['DIVIS', 'DIVIS LAB'] },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Ltd', sector: 'Metals & Aluminium', exchange: 'NSE', currency: 'INR', aliases: ['HINDALCO'] },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Ltd', sector: 'Metals & Steel', exchange: 'NSE', currency: 'INR', aliases: ['JSW', 'JSW STEEL'] },
  { symbol: 'DLF.NS', name: 'DLF Ltd', sector: 'Real Estate & Infra', exchange: 'NSE', currency: 'INR', aliases: ['DLF'] },
  { symbol: 'GODREJPROP.NS', name: 'Godrej Properties Ltd', sector: 'Real Estate', exchange: 'NSE', currency: 'INR', aliases: ['GODREJ', 'GODREJ PROPERTIES'] },
  { symbol: 'INDIGO.NS', name: 'InterGlobe Aviation Ltd (IndiGo)', sector: 'Aviation & Airlines', exchange: 'NSE', currency: 'INR', aliases: ['INDIGO', 'INTERGLOBE'] },
  { symbol: 'BHEL.NS', name: 'Bharat Heavy Electricals Ltd', sector: 'Capital Goods & Power', exchange: 'NSE', currency: 'INR', aliases: ['BHEL'] },
  { symbol: 'SIEMENS.NS', name: 'Siemens India Ltd', sector: 'Capital Goods & Industrial', exchange: 'NSE', currency: 'INR', aliases: ['SIEMENS'] },
  { symbol: 'ABB.NS', name: 'ABB India Ltd', sector: 'Electrical Equipment', exchange: 'NSE', currency: 'INR', aliases: ['ABB'] },
  { symbol: 'LTIM.NS', name: 'LTIMindtree Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['LTIM', 'LTIMINDTREE'] },
  { symbol: 'PERSISTENT.NS', name: 'Persistent Systems Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['PERSISTENT'] },
  { symbol: 'TATAELXSI.NS', name: 'Tata Elxsi Ltd', sector: 'Design & Tech', exchange: 'NSE', currency: 'INR', aliases: ['TATA ELXSI', 'TATAELXSI'] },
  { symbol: 'TATATECH.NS', name: 'Tata Technologies Ltd', sector: 'Engineering & Tech', exchange: 'NSE', currency: 'INR', aliases: ['TATA TECH', 'TATATECH'] },
  { symbol: 'POLICYBZR.NS', name: 'PB Fintech Ltd (PolicyBazaar)', sector: 'FinTech & Insurance', exchange: 'NSE', currency: 'INR', aliases: ['POLICYBAZAAR', 'PB FINTECH'] },
  { symbol: 'NYKAA.NS', name: 'FSN E-Commerce Ventures (Nykaa)', sector: 'E-Commerce & Beauty', exchange: 'NSE', currency: 'INR', aliases: ['NYKAA'] },
  { symbol: 'DELHIVERY.NS', name: 'Delhivery Ltd', sector: 'Logistics & Supply Chain', exchange: 'NSE', currency: 'INR', aliases: ['DELHIVERY'] },
  { symbol: 'RVNL.NS', name: 'Rail Vikas Nigam Ltd', sector: 'Railways & Infrastructure', exchange: 'NSE', currency: 'INR', aliases: ['RVNL', 'RAIL VIKAS'] },
  { symbol: 'IREDA.NS', name: 'Indian Renewable Energy Development Agency', sector: 'Green Energy & PSU', exchange: 'NSE', currency: 'INR', aliases: ['IREDA'] },
  { symbol: 'MAZDOCK.NS', name: 'Mazagon Dock Shipbuilders Ltd', sector: 'Defence & Shipbuilding', exchange: 'NSE', currency: 'INR', aliases: ['MAZAGON', 'MAZDOCK', 'MDL'] },
  { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard Ltd', sector: 'Defence & Shipbuilding', exchange: 'NSE', currency: 'INR', aliases: ['COCHIN SHIPYARD', 'COCHINSHIP'] },
  { symbol: 'HUDCO.NS', name: 'Housing & Urban Development Corp', sector: 'PSU & Housing Finance', exchange: 'NSE', currency: 'INR', aliases: ['HUDCO'] },
  { symbol: 'NBCC.NS', name: 'NBCC (India) Ltd', sector: 'Infrastructure & Construction', exchange: 'NSE', currency: 'INR', aliases: ['NBCC'] },
  { symbol: 'IOC.NS', name: 'Indian Oil Corporation Ltd', sector: 'Energy & Oil', exchange: 'NSE', currency: 'INR', aliases: ['IOC', 'INDIAN OIL'] },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corp Ltd', sector: 'Energy & Oil', exchange: 'NSE', currency: 'INR', aliases: ['BPCL', 'BHARAT PETROLEUM'] },
  { symbol: 'GAIL.NS', name: 'GAIL (India) Ltd', sector: 'Natural Gas & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['GAIL'] },
  { symbol: 'SAIL.NS', name: 'Steel Authority of India Ltd', sector: 'Metals & Steel', exchange: 'NSE', currency: 'INR', aliases: ['SAIL'] },
  { symbol: 'NMDC.NS', name: 'NMDC Ltd', sector: 'Mining & Minerals', exchange: 'NSE', currency: 'INR', aliases: ['NMDC'] },
  { symbol: 'NHPC.NS', name: 'NHPC Ltd', sector: 'Hydro & Clean Power', exchange: 'NSE', currency: 'INR', aliases: ['NHPC'] },
  { symbol: 'SJVN.NS', name: 'SJVN Ltd', sector: 'Power & Utilities', exchange: 'NSE', currency: 'INR', aliases: ['SJVN'] },
  { symbol: 'HAVELLS.NS', name: 'Havells India Ltd', sector: 'Consumer Electricals', exchange: 'NSE', currency: 'INR', aliases: ['HAVELLS'] },
  { symbol: 'VOLTAS.NS', name: 'Voltas Ltd (Tata Group)', sector: 'Consumer Appliances & AC', exchange: 'NSE', currency: 'INR', aliases: ['VOLTAS'] },
  { symbol: 'MRF.NS', name: 'MRF Ltd', sector: 'Tyres & Automotive', exchange: 'NSE', currency: 'INR', aliases: ['MRF', 'MRF TYRES'] },
  { symbol: 'PAGEIND.NS', name: 'Page Industries Ltd (Jockey)', sector: 'Apparel & Retail', exchange: 'NSE', currency: 'INR', aliases: ['PAGE INDUSTRIES', 'JOCKEY', 'PAGEIND'] },
  { symbol: 'BOSCHLTD.NS', name: 'Bosch Ltd', sector: 'Auto Components & Tech', exchange: 'NSE', currency: 'INR', aliases: ['BOSCH', 'BOSCHLTD'] },
  { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance Ltd', sector: 'Gold Loans & NBFC', exchange: 'NSE', currency: 'INR', aliases: ['MUTHOOT', 'MUTHOOT FINANCE', 'MUTHOOTFIN'] },
  { symbol: 'COFORGE.NS', name: 'Coforge Ltd', sector: 'IT Services', exchange: 'NSE', currency: 'INR', aliases: ['COFORGE'] },
  { symbol: 'FEDERALBNK.NS', name: 'Federal Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['FEDERAL BANK', 'FEDERALBNK'] },
  { symbol: 'IDFCFIRSTB.NS', name: 'IDFC FIRST Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['IDFC FIRST BANK', 'IDFC', 'IDFCFIRSTB'] },
  { symbol: 'IDEA.NS', name: 'Vodafone Idea Ltd', sector: 'Telecommunications', exchange: 'NSE', currency: 'INR', aliases: ['VODAFONE IDEA', 'VI', 'IDEA'] },
  { symbol: 'YESBANK.NS', name: 'Yes Bank Ltd', sector: 'Banking & Financials', exchange: 'NSE', currency: 'INR', aliases: ['YES BANK', 'YESBANK'] }
];

export const US_STOCKS_UNIVERSE = [
  { symbol: 'SP500', name: 'S&P 500 Benchmark Index', sector: 'US Index', exchange: 'NYSE/NASDAQ', currency: 'USD', aliases: ['SP500', 'S&P 500', 'S&P500'] },
  { symbol: 'NASDAQ', name: 'NASDAQ 100 Tech Index', sector: 'US Tech Index', exchange: 'NASDAQ', currency: 'USD', aliases: ['NASDAQ', 'NASDAQ 100', 'NDX'] },
  { symbol: 'DOW', name: 'Dow Jones Industrial Average', sector: 'US Industrial Index', exchange: 'NYSE', currency: 'USD', aliases: ['DOW', 'DOW JONES', 'DJIA'] },
  { symbol: 'RUSSELL', name: 'Russell 2000 Small Cap Index', sector: 'US Index', exchange: 'NYSE', currency: 'USD', aliases: ['RUSSELL', 'RUSSELL 2000', 'RUT'] },
  
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors & AI', exchange: 'NASDAQ', currency: 'USD', aliases: ['NVIDIA', 'NVDA', 'GPU', 'BLACKWELL'] },
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Consumer Electronics', exchange: 'NASDAQ', currency: 'USD', aliases: ['APPLE', 'AAPL', 'IPHONE', 'MACBOOK', 'IOS'] },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Software & Cloud', exchange: 'NASDAQ', currency: 'USD', aliases: ['MICROSOFT', 'MSFT', 'WINDOWS', 'AZURE', 'COPILOT'] },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'E-Commerce & Cloud', exchange: 'NASDAQ', currency: 'USD', aliases: ['AMAZON', 'AMZN', 'AWS', 'PRIME'] },
  { symbol: 'GOOGL', name: 'Alphabet Inc (Google)', sector: 'Internet & Search', exchange: 'NASDAQ', currency: 'USD', aliases: ['GOOGLE', 'GOOGL', 'GOOG', 'ALPHABET', 'YOUTUBE'] },
  { symbol: 'META', name: 'Meta Platforms Inc (Facebook)', sector: 'Social Media & AI', exchange: 'NASDAQ', currency: 'USD', aliases: ['META', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'LLAMA'] },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Automotive & Clean Energy', exchange: 'NASDAQ', currency: 'USD', aliases: ['TESLA', 'TSLA', 'ELON', 'EV', 'CYBERTRUCK'] },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc', sector: 'Semiconductors', exchange: 'NASDAQ', currency: 'USD', aliases: ['AMD', 'RYZEN', 'RADEON'] },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc', sector: 'AI & Big Data Analytics', exchange: 'NASDAQ', currency: 'USD', aliases: ['PALANTIR', 'PLTR', 'AIP'] },
  { symbol: 'ARM', name: 'Arm Holdings plc', sector: 'Semiconductors', exchange: 'NASDAQ', currency: 'USD', aliases: ['ARM'] },
  { symbol: 'COIN', name: 'Coinbase Global Inc', sector: 'Crypto & FinTech', exchange: 'NASDAQ', currency: 'USD', aliases: ['COINBASE', 'COIN', 'CRYPTO', 'BITCOIN'] },
  { symbol: 'SMCI', name: 'Super Micro Computer Inc', sector: 'AI Server Hardware', exchange: 'NASDAQ', currency: 'USD', aliases: ['SUPERMICRO', 'SMCI'] },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc', sector: 'Financial Conglomerate', exchange: 'NYSE', currency: 'USD', aliases: ['BERKSHIRE', 'BUFFETT', 'WARREN'] },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Banking & Financials', exchange: 'NYSE', currency: 'USD', aliases: ['JPMORGAN', 'CHASE', 'JPM'] },
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Pharma & Biotech', exchange: 'NYSE', currency: 'USD', aliases: ['ELI LILLY', 'LLY'] },
  { symbol: 'AVGO', name: 'Broadcom Inc', sector: 'Semiconductors', exchange: 'NASDAQ', currency: 'USD', aliases: ['BROADCOM', 'AVGO'] },
  { symbol: 'WMT', name: 'Walmart Inc', sector: 'Retail & Supermarkets', exchange: 'NYSE', currency: 'USD', aliases: ['WALMART', 'WMT'] },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financial Payments', exchange: 'NYSE', currency: 'USD', aliases: ['VISA'] },
  { symbol: 'MA', name: 'Mastercard Inc', sector: 'Financial Payments', exchange: 'NYSE', currency: 'USD', aliases: ['MASTERCARD', 'MA'] },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Streaming Media', exchange: 'NASDAQ', currency: 'USD', aliases: ['NETFLIX', 'NFLX'] },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Semiconductors', exchange: 'NASDAQ', currency: 'USD', aliases: ['INTEL', 'INTC'] },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Entertainment', exchange: 'NYSE', currency: 'USD', aliases: ['DISNEY', 'DIS'] },
  { symbol: 'BABA', name: 'Alibaba Group Holding', sector: 'E-Commerce', exchange: 'NYSE', currency: 'USD', aliases: ['ALIBABA', 'BABA'] },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Mfg', sector: 'Semiconductors', exchange: 'NYSE', currency: 'USD', aliases: ['TSMC', 'TSM'] },
  { symbol: 'UBER', name: 'Uber Technologies Inc', sector: 'Mobility & Delivery', exchange: 'NYSE', currency: 'USD', aliases: ['UBER'] },
  { symbol: 'QCOM', name: 'Qualcomm Inc', sector: 'Semiconductors', exchange: 'NASDAQ', currency: 'USD', aliases: ['QUALCOMM', 'QCOM', 'SNAPDRAGON'] },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Cloud & CRM', exchange: 'NYSE', currency: 'USD', aliases: ['SALESFORCE', 'CRM'] },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Cloud & Database', exchange: 'NYSE', currency: 'USD', aliases: ['ORACLE', 'ORCL'] },
  { symbol: 'ADBE', name: 'Adobe Inc', sector: 'Creative Software', exchange: 'NASDAQ', currency: 'USD', aliases: ['ADOBE', 'ADBE', 'PHOTOSHOP'] },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc', sector: 'FinTech & Payments', exchange: 'NASDAQ', currency: 'USD', aliases: ['PAYPAL', 'PYPL'] },
  { symbol: 'SQ', name: 'Block Inc (Square)', sector: 'FinTech', exchange: 'NYSE', currency: 'USD', aliases: ['SQUARE', 'BLOCK', 'SQ'] },
  { symbol: 'SHOP', name: 'Shopify Inc', sector: 'E-Commerce Software', exchange: 'NYSE', currency: 'USD', aliases: ['SHOPIFY', 'SHOP'] },
  { symbol: 'SNOW', name: 'Snowflake Inc', sector: 'Cloud Data Warehousing', exchange: 'NYSE', currency: 'USD', aliases: ['SNOWFLAKE', 'SNOW'] },
  { symbol: 'MU', name: 'Micron Technology Inc', sector: 'Semiconductors & Memory', exchange: 'NASDAQ', currency: 'USD', aliases: ['MICRON', 'MU'] },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Aerospace & Defense', exchange: 'NYSE', currency: 'USD', aliases: ['BOEING', 'BA'] },
  { symbol: 'COST', name: 'Costco Wholesale Corp', sector: 'Consumer Retail', exchange: 'NASDAQ', currency: 'USD', aliases: ['COSTCO', 'COST'] },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Restaurants & Coffee', exchange: 'NASDAQ', currency: 'USD', aliases: ['STARBUCKS', 'SBUX'] },
  { symbol: 'NKE', name: 'Nike Inc', sector: 'Footwear & Apparel', exchange: 'NYSE', currency: 'USD', aliases: ['NIKE', 'NKE'] }
];

export function fuzzySearchUniverse(query, market = 'IN') {
  if (!query || !query.trim()) return [];
  const qClean = query.trim();
  const qUpper = qClean.toUpperCase();
  const qLower = qClean.toLowerCase();
  const qNorm = qClean.replace(/[\s\-_.]/g, '').toUpperCase();

  const isUS = market === 'US';
  const primary = isUS ? US_STOCKS_UNIVERSE : INDIAN_STOCKS_UNIVERSE;
  const secondary = isUS ? INDIAN_STOCKS_UNIVERSE : US_STOCKS_UNIVERSE;

  const scored = [];
  const seen = new Set();

  const evaluate = (stock, baseBonus = 0) => {
    const sym = stock.symbol.toUpperCase();
    const symBase = sym.replace('.NS', '').replace('.BO', '').replace('^', '');
    const symNorm = symBase.replace(/[\s\-_.]/g, '');
    const nameLower = stock.name.toLowerCase();
    const nameNorm = stock.name.replace(/[\s\-_.]/g, '').toUpperCase();
    const sectorLower = (stock.sector || '').toLowerCase();
    const aliases = (stock.aliases || []).map(a => a.toLowerCase());
    const aliasesNorm = (stock.aliases || []).map(a => a.replace(/[\s\-_.]/g, '').toUpperCase());

    if (seen.has(sym) || seen.has(symBase)) return;

    let score = 0;

    // 1. Exact symbol or normalized symbol match
    if (qUpper === sym || qUpper === symBase || qNorm === symNorm) {
      score = 1000;
    }
    // 2. Exact alias match
    else if (aliases.includes(qLower) || aliasesNorm.includes(qNorm)) {
      score = 960;
    }
    // 3. Starts with ticker
    else if (symBase.startsWith(qUpper) || symNorm.startsWith(qNorm)) {
      score = 920;
    }
    // 4. Starts with company name
    else if (nameLower.startsWith(qLower) || nameNorm.startsWith(qNorm)) {
      score = 880;
    }
    // 5. Starts with alias
    else if (aliases.some(a => a.startsWith(qLower)) || aliasesNorm.some(a => a.startsWith(qNorm))) {
      score = 840;
    }
    // 6. Substring in company name
    else if (nameLower.includes(qLower)) {
      score = 760;
    }
    // 7. Substring in alias
    else if (aliases.some(a => a.includes(qLower))) {
      score = 720;
    }
    // 8. Substring in sector
    else if (sectorLower.includes(qLower)) {
      score = 520;
    }

    if (score > 0) {
      seen.add(sym);
      seen.add(symBase);
      scored.push({ score: score + baseBonus, item: stock });
    }
  };

  primary.forEach(s => evaluate(s, 150));
  secondary.forEach(s => evaluate(s, 0));

  // If query looks like a valid ticker and not in universe, synthesize an instant entry
  if (/^[A-Za-z0-9^.-]{1,12}$/.test(qClean)) {
    const isExplicitUS = isUS || (!qUpper.endsWith('.NS') && !qUpper.endsWith('.BO') && !qUpper.startsWith('^') && isUS);
    const displaySym = isExplicitUS 
      ? qUpper.replace('.NS', '').replace('.BO', '') 
      : (qUpper.endsWith('.NS') || qUpper.endsWith('.BO') || qUpper.startsWith('^') ? qUpper : `${qUpper}.NS`);
    const cleanSym = displaySym.replace('.NS', '').replace('.BO', '').replace('^', '');

    if (!seen.has(displaySym) && !seen.has(cleanSym)) {
      scored.push({
        score: 600,
        item: {
          symbol: displaySym,
          name: `${cleanSym} (${isExplicitUS ? 'US Equity' : 'NSE Equity'})`,
          sector: isExplicitUS ? 'US Market' : 'Indian Equity',
          exchange: isExplicitUS ? 'NASDAQ/NYSE' : 'NSE',
          currency: isExplicitUS ? 'USD' : 'INR',
          isSynthesized: true
        }
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(s => s.item);
}
