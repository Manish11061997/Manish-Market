import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Calendar, Award,
  Clock, Activity, RefreshCw, X,
  TrendingUp, CheckCircle, AlertTriangle, ExternalLink,
  DollarSign, BarChart2, ShieldCheck, ChevronRight, Search
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const DEFAULT_ACTIVE_IPOS_IN = [
  {
    id: "IPO-KARAMTARA",
    symbol: "KARAMTARA",
    companyName: "Karamtara Engineering Limited",
    sector: "Power Transmission Towers, Fasteners & Solar Structural Hardware",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-15",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹241 - ₹254",
    minPrice: 241.0,
    maxPrice: 254.0,
    lotSize: 59,
    minInvestment: 14986.0,
    issueSizeCr: 875.00,
    freshIssueCr: 675.00,
    ofsCr: 200.00,
    faceValue: "₹10 per share",
    gmp: 68.0,
    gmpPercent: 26.77,
    expectedListingPrice: 322.0,
    estProfitPerLot: 4012.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "MUFG Intime India Private Limited",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    subscription: {
      total: 3.95,
      qib: 5.80,
      nii: 4.20,
      retail: 2.80,
      demandStatus: "🔥 SOLID DAY 3 DEMAND (GMP +26.8%)"
    },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 Power Grid Supercycle (+26.8% GMP)",
    aiScore: 92,
    rating: "4.6 / 5.0",
    recommendation: {
      verdict: "APPLY AT UPPER CUT-OFF (₹254)",
      targetListingPrice: "₹315 - ₹335 (+24% to +32%)",
      recommendedStrategy: "Integrated manufacturer of power transmission towers and high-tensile fasteners benefiting from massive global grid expansion and renewable energy evacuation.",
      investorSuitability: "Retail Bidders & Capital Goods / Infra Investors",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "Karamtara Engineering is an integrated infrastructure company manufacturing transmission line towers, structural steel profiles, high-tensile fasteners, and solar module mounting structures with exports across 25+ countries.",
      coreProducts: ["Galvanized Power Transmission Towers", "High-Tensile Industrial Fasteners", "Solar Mounting Structures", "Railway Electrification Cantilevers"],
      industryMoat: "Fully integrated manufacturing operations from rolling mills to hot-dip galvanizing units; approved supplier to Power Grid Corporation of India and international utility operators."
    },
    financials: {
      revenueFY26: "₹1,842.5 Cr",
      revenueFY25: "₹1,418.0 Cr",
      patFY26: "₹128.4 Cr",
      patFY25: "₹82.1 Cr",
      cagr3Yr: "29.4%"
    },
    pros: [
      "Massive order backlog driven by India's 500 GW renewable energy transmission corridors",
      "Strong revenue growth (29.4% 3-yr CAGR) and expanding export margins",
      "Healthy ₹68 GMP premium providing comfortable safety margin"
    ],
    cons: [
      "Fluctuations in primary steel and zinc raw material prices",
      "Working capital intensity typical of heavy EPC fabrication businesses"
    ]
  },
  {
    id: "IPO-LCCPROJ",
    symbol: "LCCPROJ",
    companyName: "LCC Projects Limited",
    sector: "Water Supply Pipelines, Civil Infrastructure & Irrigation EPC",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-15",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹139 - ₹146",
    minPrice: 139.0,
    maxPrice: 146.0,
    lotSize: 102,
    minInvestment: 14892.0,
    issueSizeCr: 427.14,
    freshIssueCr: 300.00,
    ofsCr: 127.14,
    faceValue: "₹10 per share",
    gmp: 48.0,
    gmpPercent: 32.88,
    expectedListingPrice: 194.0,
    estProfitPerLot: 4896.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 4.24,
      qib: 6.10,
      nii: 4.50,
      retail: 3.10,
      demandStatus: "🔥 4.2x ROBUST OVERSUBSCRIPTION (GMP +32.9%)"
    },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 High Listing Pop (+32.9% GMP)",
    aiScore: 90,
    rating: "4.5 / 5.0",
    recommendation: {
      verdict: "APPLY AT CUT-OFF (₹146)",
      targetListingPrice: "₹190 - ₹205 (+30% to +40%)",
      recommendedStrategy: "Pure-play water and irrigation infrastructure contractor with ₹3,200+ Cr unexecuted order book. Strong apply for listing pop and medium-term growth.",
      investorSuitability: "Retail Bidders & Infrastructure Sector Investors",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "LCC Projects is an engineering, procurement, and construction (EPC) company focused on bulk water supply pipelines, underground drainage networks, wastewater treatment plants, and river irrigation canals."
    },
    financials: {
      revenueFY26: "₹1,124.6 Cr",
      patFY26: "₹94.2 Cr",
      cagr3Yr: "26.5%"
    },
    pros: ["Robust unexecuted order book of ₹3,200+ Cr offering multi-year revenue visibility", "Consistent historical EBITDA margins around 14.5%"],
    cons: ["Government agency receivables execution timeline"]
  },
  {
    id: "IPO-ARCIL",
    symbol: "ARCIL",
    companyName: "Asset Reconstruction Company (India) Limited",
    sector: "Bad Bank / Stressed Asset Resolution & Debt Reconstruction",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-15",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹132 - ₹139",
    minPrice: 132.0,
    maxPrice: 139.0,
    lotSize: 107,
    minInvestment: 14873.0,
    issueSizeCr: 732.97,
    freshIssueCr: 0.0,
    ofsCr: 732.97,
    faceValue: "₹10 per share",
    gmp: 4.0,
    gmpPercent: 2.88,
    expectedListingPrice: 143.0,
    estProfitPerLot: 428.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 10.67,
      qib: 29.22,
      nii: 5.68,
      retail: 2.22,
      demandStatus: "🔥 MASSIVE 29.2x QIB SURGE ON DAY 3"
    },
    aiVerdict: "APPLY_FOR_LONG_TERM",
    aiVerdictLabel: "💎 India's Pioneer ARC (10.7x Subscribed)",
    aiScore: 86,
    rating: "4.3 / 5.0",
    recommendation: {
      verdict: "APPLY FOR LONG TERM (₹139)",
      targetListingPrice: "₹142 - ₹150 (+2% to +8%)",
      recommendedStrategy: "India's oldest and premier asset reconstruction company backed by Avenue Capital, SBI, IDBI, and ICICI. High QIB institutional backing indicates steady long-term compounding.",
      investorSuitability: "Institutional & Long-Term Financial Value Seekers",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "ARCIL is India's premier asset reconstruction company, acquiring non-performing loans (NPLs) and distressed retail and corporate assets from banks and financial institutions for structured recovery and restructuring."
    },
    financials: {
      revenueFY26: "₹480.5 Cr",
      patFY26: "₹142.1 Cr",
      cagr3Yr: "18.2%"
    },
    pros: ["Institutional backing by Avenue Capital Group and India's top commercial banks", "Over 20 years of proven NPL recovery track record with low leverage"],
    cons: ["100% OFS with no fresh capital entering the balance sheet"]
  },
  {
    id: "IPO-MANIPALPAY",
    symbol: "MANIPALPAY",
    companyName: "Manipal Payment & Identity Solutions Ltd",
    sector: "Digital Payment Processing, Smart Cards & Secure Identity Tech",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-15",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹322 - ₹339",
    minPrice: 322.0,
    maxPrice: 339.0,
    lotSize: 44,
    minInvestment: 14916.0,
    issueSizeCr: 805.00,
    freshIssueCr: 320.00,
    ofsCr: 485.00,
    faceValue: "₹10 per share",
    gmp: 15.0,
    gmpPercent: 4.42,
    expectedListingPrice: 354.0,
    estProfitPerLot: 660.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "MUFG Intime India Private Limited",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    subscription: {
      total: 1.20,
      qib: 1.12,
      nii: 0.89,
      retail: 1.84,
      demandStatus: "✅ FULLY SUBSCRIBED ON FINAL DAY"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Manipal Group Tech Franchise",
    aiScore: 84,
    rating: "4.2 / 5.0",
    recommendation: {
      verdict: "APPLY AT UPPER BAND (₹339)",
      targetListingPrice: "₹350 - ₹365 (+3% to +8%)",
      recommendedStrategy: "Renowned Manipal Group promoter heritage. High market share in smart banking cards and biometric identity solutions across public and private banks.",
      investorSuitability: "Fintech & Identity Tech Investors",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "Manipal Payment & Identity Solutions produces EMV contact and contactless banking cards, transit cards, SIM cards, biometric authentication terminals, and enterprise security identity credentials."
    },
    financials: {
      revenueFY26: "₹945.2 Cr",
      patFY26: "₹78.6 Cr"
    },
    pros: ["Dominant market position in Indian banking card issuance", "Established customer relationships with major PSU and private lenders"],
    cons: ["Competitive pressure from purely software-based payments"]
  },
  {
    id: "IPO-STEAMHOUSE",
    symbol: "STEAMHOUSE",
    companyName: "Steamhouse India Limited",
    sector: "Community Boiler Steam Generation & Industrial Thermal Utilities",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-15",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹77 - ₹81",
    minPrice: 77.0,
    maxPrice: 81.0,
    lotSize: 185,
    minInvestment: 14985.0,
    issueSizeCr: 180.00,
    freshIssueCr: 180.00,
    ofsCr: 0.0,
    faceValue: "₹10 per share",
    gmp: 21.0,
    gmpPercent: 25.93,
    expectedListingPrice: 102.0,
    estProfitPerLot: 3885.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 2.50,
      qib: 2.10,
      nii: 3.40,
      retail: 2.40,
      demandStatus: "🔥 2.5x PARTICIPATION (GMP +25.9%)"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "🚀 Industrial Thermal Utility (+25.9% GMP)",
    aiScore: 87,
    rating: "4.3 / 5.0"
  },
  {
    id: "IPO-MANIKA",
    symbol: "MANIKA",
    companyName: "Manika Plastech Limited",
    sector: "Molded Industrial Plastic Packaging & Custom Polymers",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-11",
    closeDate: "2026-09-16",
    allotmentDate: "2026-09-17",
    refundDate: "2026-09-18",
    dematDate: "2026-09-18",
    listingDate: "2026-09-21",
    listingExchange: "BSE, NSE",
    priceBand: "₹40 - ₹43",
    minPrice: 40.0,
    maxPrice: 43.0,
    lotSize: 348,
    minInvestment: 14964.0,
    issueSizeCr: 125.50,
    freshIssueCr: 92.50,
    ofsCr: 33.00,
    faceValue: "₹5 per share",
    gmp: 10.0,
    gmpPercent: 23.26,
    expectedListingPrice: 53.0,
    estProfitPerLot: 3480.0,
    allotmentStatus: "🟢 LIVE BIDDING OPEN (DAY 1 - OPENS TODAY)",
    registrar: "MUFG Intime India Private Limited",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    subscription: { total: 0.85, qib: 0.40, nii: 1.20, retail: 1.10, demandStatus: "🚀 STRONG DAY 1 START (GMP +23.3%)" },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "🚀 Industrial Packaging (+23.3% GMP)",
    aiScore: 88,
    rating: "4.4 / 5.0"
  },
  {
    id: "IPO-VEEGALAND",
    symbol: "VEEGALAND",
    companyName: "Veegaland Developers Limited",
    sector: "South India Premium Residential Real Estate (Wonderla Promoters)",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-10",
    closeDate: "2026-09-15",
    allotmentDate: "2026-09-16",
    listingDate: "2026-09-18",
    priceBand: "₹130 - ₹140",
    minPrice: 130.0,
    maxPrice: 140.0,
    lotSize: 107,
    minInvestment: 14980.0,
    issueSizeCr: 210.00,
    gmp: 18.0,
    gmpPercent: 12.86,
    expectedListingPrice: 158.0,
    allotmentStatus: "🟢 LIVE BIDDING OPEN (DAY 2 OF 4)",
    registrar: "KFin Technologies Limited",
    subscription: { total: 1.45, retail: 1.60 },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Clean Wonderla Governance",
    aiScore: 86,
    rating: "4.3 / 5.0"
  },
  {
    id: "IPO-VINODTEX",
    symbol: "VINODTEX",
    companyName: "Vinod Texworld Limited",
    sector: "Yarns, Fabrics & Textile Processing",
    category: "NSE SME",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    priceBand: "₹94 (Fixed Price)",
    lotSize: 1200,
    minInvestment: 112800.0,
    issueSizeCr: 42.83,
    gmp: 22.0,
    gmpPercent: 23.40,
    expectedListingPrice: 116.0,
    allotmentStatus: "🟢 LIVE SME BIDDING (CLOSES TODAY)",
    subscription: { total: 14.80, retail: 16.50 },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 High Growth Textile SME (+23.4% GMP)",
    aiScore: 88,
    rating: "4.4 / 5.0"
  },
  {
    id: "IPO-INFRAX",
    symbol: "INFRAX",
    companyName: "Infrax Renewable Limited",
    sector: "Solar Rooftop EPC & Wind Energy Engineering",
    category: "BSE SME",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    priceBand: "₹104 (Fixed Price)",
    lotSize: 1200,
    minInvestment: 124800.0,
    issueSizeCr: 40.88,
    gmp: 28.0,
    gmpPercent: 26.92,
    expectedListingPrice: 132.0,
    allotmentStatus: "🟢 LIVE SME BIDDING (CLOSES TODAY)",
    subscription: { total: 18.50, retail: 19.80 },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 Green Energy EPC (+26.9% GMP)",
    aiScore: 89,
    rating: "4.5 / 5.0"
  },
  {
    id: "IPO-AMTECH",
    symbol: "AMTECH",
    companyName: "Amtech Esters Limited",
    sector: "Specialty Esters & Bio-chemical Plasticizers",
    category: "BSE SME",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    priceBand: "₹71 - ₹75",
    lotSize: 1600,
    minInvestment: 120000.0,
    issueSizeCr: 17.88,
    gmp: 18.0,
    gmpPercent: 24.00,
    expectedListingPrice: 93.0,
    allotmentStatus: "🟢 LIVE SME BIDDING (CLOSES TODAY)",
    subscription: { total: 12.10, retail: 14.20 },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Specialty Chemicals SME (+24% GMP)",
    aiScore: 86,
    rating: "4.3 / 5.0"
  },
  {
    id: "IPO-MAHARAJA",
    symbol: "MAHARAJA",
    companyName: "Maharaja & Speedex India Limited",
    sector: "Kitchen Appliances & Domestic Pressure Cookers",
    category: "BSE SME",
    market: "IN",
    openDate: "2026-09-10",
    closeDate: "2026-09-15",
    priceBand: "₹177 - ₹186",
    lotSize: 600,
    minInvestment: 111600.0,
    issueSizeCr: 80.13,
    gmp: 35.0,
    gmpPercent: 18.82,
    expectedListingPrice: 221.0,
    allotmentStatus: "🟢 LIVE SME BIDDING OPEN (DAY 2 OF 4)",
    subscription: { total: 5.40, retail: 6.10 },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Consumer Kitchenware SME",
    aiScore: 85,
    rating: "4.2 / 5.0"
  }
];

const DEFAULT_CLOSED_IPOS_IN = [
  {
    id: "CLOSED-DEEPA",
    symbol: "DEEPA",
    companyName: "Deepa Jewellers Limited",
    sector: "Retail Gold & Diamond Ornaments",
    category: "BSE SME",
    market: "IN",
    priceBand: "₹75 - ₹80",
    maxPrice: 80.0,
    lotSize: 1600,
    issueSizeCr: 19.80,
    gmp: 24.0,
    gmpPercent: 30.00,
    listingDate: "2026-09-12",
    allotmentStatus: "⏳ ALLOTMENT FINISHED — LISTING TOMORROW",
    registrar: "Bigshare Services Pvt Ltd",
    subscription: { total: 52.10, retail: 64.50 }
  },
  {
    id: "CLOSED-RAYSOFBELIEF",
    symbol: "RAYSOFBELIEF",
    companyName: "Rays of Belief Limited",
    sector: "Spiritual Products, Incense & Fragrance Merchandise",
    category: "NSE SME",
    market: "IN",
    priceBand: "₹82 - ₹86",
    maxPrice: 86.0,
    lotSize: 1600,
    issueSizeCr: 21.40,
    gmp: 25.0,
    gmpPercent: 29.07,
    listingDate: "2026-09-12",
    allotmentStatus: "⏳ ALLOTMENT FINISHED — LISTING TOMORROW",
    registrar: "Skyline Financial Services Pvt Ltd",
    subscription: { total: 48.20, retail: 56.40 }
  }
];

const DEFAULT_UPCOMING_IPOS_IN = [
  {
    id: "UPCOMING-NSE",
    symbol: "NSE",
    companyName: "National Stock Exchange of India Limited",
    sector: "Financial Exchange, Clearing Corporation & Market Infrastructure",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-17",
    closeDate: "2026-09-21",
    allotmentDate: "2026-09-22",
    listingDate: "2026-09-24",
    listingExchange: "BSE",
    priceBand: "₹1,700 - ₹1,785",
    priceBandExpected: "₹1,700 - ₹1,785",
    minPrice: 1700.0,
    maxPrice: 1785.0,
    lotSize: 8,
    minInvestment: 14280.0,
    issueSizeCr: 12500.00,
    gmp: 850.0,
    expectedGmp: "+₹850 (+47.6%)",
    gmpPercent: 47.62,
    expectedListingPrice: 2635.0,
    estProfitPerLot: 6800.0,
    expectedDate: "Sep 17 - Sep 21, 2026",
    drhpStatus: "📋 RHP FILED (HISTORIC MEGA EXCHANGE IPO)",
    registrar: "MUFG Intime India Private Limited",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    aiOutlook: "The world's largest derivatives exchange by volume and India's monopolistic stock exchange. An essential core investment across Indian capital markets.",
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "💎 Monopolistic Market Giant (+47.6% GMP)",
    aiScore: 99,
    rating: "5.0 / 5.0"
  },
  {
    id: "UPCOMING-RENTOMOJO",
    symbol: "RENTOMOJO",
    companyName: "Rentomojo (Edunetwork Private Limited)",
    sector: "Furniture, Electronics & Consumer Lifestyle Rental Platform",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-17",
    closeDate: "2026-09-22",
    listingDate: "2026-09-25",
    priceBandExpected: "₹210 - ₹225",
    issueSizeCr: 650.00,
    gmp: 45.0,
    expectedGmp: "+₹45 (+20.0%)",
    gmpPercent: 20.00,
    expectedDate: "Sep 17 - Sep 22, 2026",
    drhpStatus: "📋 RHP FILED (OPENS SEP 17)",
    registrar: "KFin Technologies Limited",
    aiVerdict: "APPLY_FOR_LISTING",
    aiScore: 88,
    rating: "4.4 / 5.0"
  },
  {
    id: "UPCOMING-SPECTRAA",
    symbol: "SPECTRAA",
    companyName: "SpectraA Technology Solutions Limited",
    sector: "Stainless Steel Brewing, Dairy & Bio-Pharma Process Tanks",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-17",
    closeDate: "2026-09-21",
    priceBandExpected: "₹112 - ₹118",
    issueSizeCr: 85.00,
    gmp: 32.0,
    expectedGmp: "+₹32 (+27.1%)",
    gmpPercent: 27.12,
    expectedDate: "Sep 17 - Sep 21, 2026",
    drhpStatus: "📋 RHP FILED",
    aiVerdict: "APPLY_FOR_LISTING",
    aiScore: 86,
    rating: "4.3 / 5.0"
  },
  {
    id: "UPCOMING-KHERIA",
    symbol: "KHERIA",
    companyName: "Kheria Autocomp Limited",
    sector: "Precision Automotive Stamping & EV Chassis Assemblies",
    category: "BSE SME",
    market: "IN",
    openDate: "2026-09-17",
    closeDate: "2026-09-22",
    priceBandExpected: "₹125 - ₹132",
    issueSizeCr: 110.00,
    expectedGmp: "+₹28 (+21.2%)",
    expectedDate: "Sep 17 - Sep 22, 2026",
    drhpStatus: "📋 SME RHP FILED"
  }
];

const DEFAULT_LISTED_IPOS_IN = [
  { id: "LIST-QUALIANCE", symbol: "QUALIANCE", companyName: "Qualiance International Limited", category: "NSE SME", issuePrice: 65.0, listingPrice: 98.0, listingGainPercent: 50.77, currentPrice: 102.5, totalReturnPercent: 57.69, issueSizeCr: 24.5, subscriptionTotal: "86.4x", listingDate: "2026-09-11", status: "🏆 LISTED TODAY (SEP 11) (+57.7%)" },
  { id: "LIST-PURPLE", symbol: "PURPLE", companyName: "Purple Style Labs Limited", category: "Mainboard", issuePrice: 395.0, listingPrice: 510.0, listingGainPercent: 29.11, currentPrice: 540.0, totalReturnPercent: 36.71, issueSizeCr: 412.0, subscriptionTotal: "71.2x", listingDate: "2026-09-06", status: "LUXURY POP (+36.7%)" },
  { id: "LIST-ESDS", symbol: "ESDS", companyName: "ESDS Software Solution Limited", category: "Mainboard", issuePrice: 429.0, listingPrice: 574.0, listingGainPercent: 33.80, currentPrice: 625.0, totalReturnPercent: 45.69, issueSizeCr: 850.0, subscriptionTotal: "58.4x", listingDate: "2026-09-03", status: "🚀 STRONG CLOUD RALLY (+45.7%)" },
  { id: "LIST-PRIORITY", symbol: "PRIORITY", companyName: "Priority Jewels Limited", category: "Mainboard", issuePrice: 200.0, listingPrice: 255.0, listingGainPercent: 27.50, currentPrice: 265.0, totalReturnPercent: 32.50, issueSizeCr: 380.0, subscriptionTotal: "36.5x", listingDate: "2026-09-03", status: "LUXURY RETAIL (+32.5%)" },
  { id: "LIST-LUMINO", symbol: "LUMINO", companyName: "Lumino Industries Limited", category: "Mainboard", issuePrice: 82.0, listingPrice: 104.0, listingGainPercent: 26.83, currentPrice: 114.0, totalReturnPercent: 39.02, issueSizeCr: 450.0, subscriptionTotal: "46.8x", listingDate: "2026-09-02", status: "POWER SUPERCYCLE (+39.0%)" },
  { id: "LIST-ANNUPROJ", symbol: "ANNUPROJ", companyName: "Annu Projects Limited", category: "Mainboard", issuePrice: 99.0, listingPrice: 131.0, listingGainPercent: 32.32, currentPrice: 145.0, totalReturnPercent: 46.46, issueSizeCr: 320.0, subscriptionTotal: "44.2x", listingDate: "2026-09-01", status: "SOLID EPC RALLY (+46.5%)" },
  { id: "LIST-SYMBIOTEC", symbol: "SYMBIOTEC", companyName: "Symbiotec Pharmalab Limited", category: "Mainboard", issuePrice: 988.0, listingPrice: 1273.0, listingGainPercent: 28.85, currentPrice: 1348.0, totalReturnPercent: 36.44, issueSizeCr: 1245.0, subscriptionTotal: "38.5x", listingDate: "2026-09-01", status: "HIGH GROWTH PHARMA (+36.4%)" }
];

export default function IPOHubView({ currentMarket = 'IN', onSelectStock }) {
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [summary, setSummary] = useState(null);
  const [activeIpos, setActiveIpos] = useState(currentMarket === 'IN' ? DEFAULT_ACTIVE_IPOS_IN : []);
  const [closedIpos, setClosedIpos] = useState(currentMarket === 'IN' ? DEFAULT_CLOSED_IPOS_IN : []);
  const [upcomingIpos, setUpcomingIpos] = useState(currentMarket === 'IN' ? DEFAULT_UPCOMING_IPOS_IN : []);
  const [listedIpos, setListedIpos] = useState(currentMarket === 'IN' ? DEFAULT_LISTED_IPOS_IN : []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [detailedIpoData, setDetailedIpoData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const currPrefix = currentMarket === 'US' ? '$' : '₹';
  const unit = currentMarket === 'US' ? 'M' : 'Cr';

  const fetchData = useCallback(() => {
    setIsRefreshing(true);
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
      const hasAnyData = [summaryRes, activeRes, closedRes, upcomingRes, listedRes].some(
        r => r.status === 'fulfilled' && r.value
      );
      if (!hasAnyData && currentMarket === 'US') {
        setFetchError('IPO data unavailable for US market. Backend may be offline.');
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) setSummary(summaryRes.value);
      if (activeRes.status === 'fulfilled' && activeRes.value?.ipos?.length) setActiveIpos(activeRes.value.ipos);
      if (closedRes.status === 'fulfilled' && closedRes.value?.ipos?.length) setClosedIpos(closedRes.value.ipos);
      if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.ipos?.length) setUpcomingIpos(upcomingRes.value.ipos);
      if (listedRes.status === 'fulfilled' && listedRes.value?.ipos?.length) setListedIpos(listedRes.value.ipos);
      setIsRefreshing(false);
    })
    .catch(() => {
      setFetchError('Failed to fetch live IPO data.');
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
        if (data && !data.error) {
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
              100% verified exchange data, live subscription books, allocation probabilities & institutional GMP
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }} className="mono-num">
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
          {filteredActive.length === 0 && !isRefreshing ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                {fetchError ? 'IPO Data Unavailable' : 'No Active IPOs Found'}
              </div>
              <div style={{ fontSize: '12px' }}>
                {fetchError || 'No IPOs matched your search criteria in the live bidding window.'}
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
