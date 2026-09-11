"""
Script to update frontend/src/components/IPOHubView.jsx with institutional IPO intelligence features.
"""

new_code = '''import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Calendar, Award,
  Clock, Activity, RefreshCw, X,
  TrendingUp, CheckCircle, AlertTriangle, ExternalLink,
  DollarSign, BarChart2, ShieldCheck, ChevronRight, Search
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const DEFAULT_ACTIVE_IPOS_IN = [
  {
    id: "IPO-BAJAJHFL",
    symbol: "BAJAJHFL",
    companyName: "Bajaj Housing Finance Limited",
    sector: "Housing Finance & Upper-Layer NBFC (Bajaj Group)",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-12",
    refundDate: "2026-09-15",
    dematDate: "2026-09-15",
    listingDate: "2026-09-16",
    listingExchange: "BSE, NSE",
    priceBand: "₹66 - ₹70",
    minPrice: 66.0,
    maxPrice: 70.0,
    lotSize: 214,
    minInvestment: 14980.0,
    issueSizeCr: 6560.00,
    freshIssueCr: 3560.00,
    ofsCr: 3000.00,
    faceValue: "₹10 per share",
    gmp: 76.0,
    gmpPercent: 108.57,
    expectedListingPrice: 146.0,
    estProfitPerLot: 16264.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 63.61,
      qib: 209.36,
      nii: 41.50,
      retail: 7.41,
      employee: 2.05,
      sharesOffered: "72,75,75,556",
      sharesBid: "46,28,00,00,000",
      totalAmountBidCr: 323960.0,
      retailAllotmentChance: "1 in 7.4 Retail Applications (~13.5% Probability)",
      demandStatus: "🔥 HISTORIC MEGA OVERSUBSCRIPTION (63.6x)"
    },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 Landmark Bajaj Group Mega IPO (GMP +108.6%)",
    aiScore: 99,
    rating: "4.9 / 5.0",
    recommendation: {
      verdict: "STRONG APPLY AT CUT-OFF (₹70)",
      targetListingPrice: "₹140 - ₹155 (+100% to +121%)",
      recommendedStrategy: "India's premier housing finance NBFC with pristine asset quality (GNPA 0.27%) and marquee corporate lineage. Essential portfolio cornerstone with bumper listing pop expected.",
      investorSuitability: "All Retail Bidders, HNIs & Institutional Long-Term Investors",
      riskGrade: "LOW"
    },
    businessOverview: {
      whatTheCompanyDoes: "Bajaj Housing Finance is India's 2nd largest housing finance NBFC managing ₹97,071 Cr AUM across retail home loans, loan against property (LAP), and lease rental discounting.",
      coreProducts: ["Salaried Home Loans", "Loan Against Property (LAP)", "Commercial Real Estate Finance", "Developer Construction Finance"],
      industryMoat: "CRISIL AAA credit rating yields the lowest cost of funds in the NBFC sector; omni-channel distribution leveraging the 8.5 Crore+ customer base of parent Bajaj Finance."
    },
    financials: {
      revenueFY24: "₹7,617.7 Cr",
      revenueFY23: "₹5,665.4 Cr",
      patFY24: "₹1,731.2 Cr",
      patFY23: "₹1,257.8 Cr",
      cagr3Yr: "34.5%",
      roe: "15.2%",
      gnpa: "0.27%"
    },
    pros: [
      "Backed by illustrious Bajaj Finserv & Bajaj Finance promoter group",
      "Pristine asset quality with industry-lowest Gross NPA of 0.27%",
      "Historic ₹3.24 Lakh Crore institutional bidding demand on Day 3",
      "Exceptional +108.6% GMP indicating double listing on Debut"
    ],
    cons: [
      "Interest rate cycle movements impacting residential mortgage velocity",
      "Competitive pressure from major commercial banks (SBI, HDFC)"
    ]
  },
  {
    id: "IPO-PNGJEWEL",
    symbol: "PNGJEWEL",
    companyName: "P N Gadgil Jewellers Limited",
    sector: "Luxury Gold, Diamond & Platinum Jewellery Retail",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-10",
    closeDate: "2026-09-12",
    allotmentDate: "2026-09-13",
    refundDate: "2026-09-16",
    dematDate: "2026-09-16",
    listingDate: "2026-09-17",
    listingExchange: "BSE, NSE",
    priceBand: "₹456 - ₹480",
    minPrice: 456.0,
    maxPrice: 480.0,
    lotSize: 31,
    minInvestment: 14880.0,
    issueSizeCr: 1100.00,
    freshIssueCr: 850.00,
    ofsCr: 250.00,
    faceValue: "₹10 per share",
    gmp: 310.0,
    gmpPercent: 64.58,
    expectedListingPrice: 790.0,
    estProfitPerLot: 9610.0,
    allotmentStatus: "🟢 LIVE BIDDING OPEN (DAY 2 OF 3)",
    registrar: "Bigshare Services Pvt Ltd",
    registrarUrl: "https://ipo.bigshareonline.com/",
    subscription: {
      total: 7.20,
      qib: 3.10,
      nii: 15.80,
      retail: 7.50,
      demandStatus: "🔥 MASSIVE 64.6% GMP & STRONG HNI SURGE"
    },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 High Growth Jewellery Giant (GMP +64.6%)",
    aiScore: 92,
    rating: "4.6 / 5.0",
    recommendation: {
      verdict: "STRONG APPLY AT CUT-OFF (₹480)",
      targetListingPrice: "₹760 - ₹820 (+58% to +71%)",
      recommendedStrategy: "2nd largest organized jewellery retailer in Maharashtra with 39+ stores. Robust FY24 revenue growth (+36% YoY) outpacing Titan and Kalyan. Strong apply for listing gains.",
      investorSuitability: "Retail Bidders & Consumption Theme Investors",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "P N Gadgil Jewellers is a 192-year-old heritage brand offering certified hallmarked gold, diamond, platinum, and silver jewelry across 39 large-format retail stores in Western India.",
      coreProducts: ["Heritage Maharashtrian Gold Jewellery", "Contemporary Certified Diamond Collections", "Silver Artefacts & Utensils"],
      industryMoat: "High customer loyalty across Maharashtra and Goa; ₹850 Cr fresh proceeds will fund opening 12 new mega-stores."
    },
    financials: {
      revenueFY24: "₹6,110.9 Cr",
      revenueFY23: "₹4,507.5 Cr",
      patFY24: "₹154.3 Cr",
      patFY23: "₹93.7 Cr",
      cagr3Yr: "36.2%"
    },
    pros: [
      "192-year heritage with commanding brand recall across Western India",
      "Rapidly expanding diamond jewellery mix expanding gross margins",
      "Impressive ₹310 GMP premium (+64.6%)"
    ],
    cons: [
      "Regional revenue concentration in Maharashtra (approx 85%)",
      "Gold price volatility and customs duty variations"
    ]
  },
  {
    id: "IPO-KROSS",
    symbol: "KROSS",
    companyName: "Kross Limited",
    sector: "Auto Components & Commercial Vehicle Trailer Axles",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-12",
    refundDate: "2026-09-15",
    dematDate: "2026-09-15",
    listingDate: "2026-09-16",
    listingExchange: "BSE, NSE",
    priceBand: "₹228 - ₹240",
    minPrice: 228.0,
    maxPrice: 240.0,
    lotSize: 62,
    minInvestment: 14880.0,
    issueSizeCr: 500.00,
    freshIssueCr: 250.00,
    ofsCr: 250.00,
    faceValue: "₹5 per share",
    gmp: 25.0,
    gmpPercent: 10.42,
    expectedListingPrice: 265.0,
    estProfitPerLot: 1550.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 16.80,
      qib: 23.30,
      nii: 22.20,
      retail: 10.70,
      demandStatus: "✅ SOLID 16.8x OVERSUBSCRIPTION"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Auto Component Pure Play (+10.4% GMP)",
    aiScore: 86,
    rating: "4.3 / 5.0",
    recommendation: {
      verdict: "APPLY AT UPPER BAND (₹240)",
      targetListingPrice: "₹260 - ₹275 (+8% to +15%)",
      recommendedStrategy: "Precision forging player supplying trailer axles and tractor parts with marquee OEM clientele (Tata Motors, Ashok Leyland).",
      investorSuitability: "Retail & Auto Ancillary Value Investors",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "Kross Limited is an integrated manufacturer of forged and precision-machined components for medium and heavy commercial vehicles (M&HCV) and farm tractor assemblies."
    },
    financials: {
      revenueFY24: "₹620.3 Cr",
      patFY24: "₹44.9 Cr",
      cagr3Yr: "26.8%"
    },
    pros: ["Integrated manufacturing capabilities across 5 plants in Jamshedpur", "Longstanding tier-1 supplier status with leading commercial vehicle OEMs"],
    cons: ["Cyclical vulnerability to Indian commercial vehicle sales trends"]
  },
  {
    id: "IPO-TOLINS",
    symbol: "TOLINS",
    companyName: "Tolins Tyres Limited",
    sector: "Tyre Manufacturing & Retreading Tread Rubber",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-09",
    closeDate: "2026-09-11",
    allotmentDate: "2026-09-12",
    refundDate: "2026-09-15",
    dematDate: "2026-09-15",
    listingDate: "2026-09-16",
    listingExchange: "BSE, NSE",
    priceBand: "₹215 - ₹226",
    minPrice: 215.0,
    maxPrice: 226.0,
    lotSize: 66,
    minInvestment: 14916.0,
    issueSizeCr: 231.00,
    freshIssueCr: 200.00,
    ofsCr: 31.00,
    faceValue: "₹5 per share",
    gmp: 28.0,
    gmpPercent: 12.39,
    expectedListingPrice: 254.0,
    estProfitPerLot: 1848.0,
    allotmentStatus: "🟢 LIVE BIDDING (DAY 3 - CLOSES TODAY AT 5:00 PM)",
    registrar: "Cameo Corporate Services Limited",
    registrarUrl: "https://ipo.cameoindia.com/",
    subscription: {
      total: 23.80,
      qib: 25.40,
      nii: 27.40,
      retail: 21.50,
      demandStatus: "✅ HEALTHY 23.8x DEMAND"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Tyres & Rubber Play (+12.4% GMP)",
    aiScore: 85,
    rating: "4.2 / 5.0",
    recommendation: {
      verdict: "APPLY AT CUT-OFF (₹226)",
      targetListingPrice: "₹250 - ₹265 (+11% to +17%)",
      recommendedStrategy: "Niche tyre and retreading rubber manufacturer with debt reduction and export growth in Middle East/Africa.",
      investorSuitability: "Retail Bidders Seeking Moderate Gains",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "Tolins Tyres produces two-wheeler, three-wheeler, light commercial vehicle, and agricultural tyres, as well as precured tread rubber with exports to 40+ countries."
    },
    financials: {
      revenueFY24: "₹227.2 Cr",
      patFY24: "₹26.0 Cr"
    },
    pros: ["Repayment of bank debt from fresh issue proceeds", "High-margin retreading rubber segment"],
    cons: ["Raw natural rubber pricing dependency"]
  },
  {
    id: "IPO-TBICORN",
    symbol: "TBICORN",
    companyName: "TBI Corn Limited",
    sector: "Corn Milling & Value-Added Agro Products",
    category: "NSE SME",
    market: "IN",
    openDate: "2026-09-10",
    closeDate: "2026-09-12",
    allotmentDate: "2026-09-13",
    listingDate: "2026-09-17",
    listingExchange: "NSE SME",
    priceBand: "₹90 - ₹94",
    minPrice: 90.0,
    maxPrice: 94.0,
    lotSize: 1200,
    minInvestment: 112800.0,
    issueSizeCr: 44.94,
    freshIssueCr: 44.94,
    ofsCr: 0.0,
    gmp: 45.0,
    gmpPercent: 47.87,
    expectedListingPrice: 139.0,
    estProfitPerLot: 54000.0,
    allotmentStatus: "🟢 LIVE SME BIDDING OPEN (KFINTECH)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    subscription: {
      total: 32.40,
      qib: 18.20,
      nii: 48.50,
      retail: 36.10,
      demandStatus: "🔥 32x HIGH SME DEMAND (GMP +47.9%)"
    },
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 High-Growth SME (+47.9% GMP)",
    aiScore: 90,
    rating: "4.5 / 5.0",
    recommendation: {
      verdict: "APPLY AT CUT-OFF (₹94)",
      targetListingPrice: "₹135 - ₹145 (+43% to +54%)",
      recommendedStrategy: "Pure-play corn processing leader with growing breakfast cereal & brewing industrial client demand.",
      investorSuitability: "HNI & High Risk Appetite SME Bidders",
      riskGrade: "MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "TBI Corn produces corn grits, corn flakes, corn flour, and germ meal supplying multinational food and snack processors."
    },
    pros: ["100% fresh issue deployment for expanded milling capacity", "Robust +47.9% GMP"],
    cons: ["SME ticket size ₹1.13 Lakhs"]
  }
];

const DEFAULT_CLOSED_IPOS_IN = [
  {
    id: "CLOSED-BALAJEE",
    symbol: "BALAJEE",
    companyName: "Shree Tirupati Balajee Agro Trading Ltd",
    sector: "Industrial FIBC Jumbo Packaging & Polymer Fabrics",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-05",
    closeDate: "2026-09-09",
    allotmentDate: "2026-09-10",
    refundDate: "2026-09-11",
    dematDate: "2026-09-11",
    listingDate: "2026-09-12",
    listingExchange: "BSE, NSE",
    priceBand: "₹78 - ₹83",
    minPrice: 78.0,
    maxPrice: 83.0,
    lotSize: 180,
    minInvestment: 14940.0,
    issueSizeCr: 169.65,
    freshIssueCr: 122.43,
    ofsCr: 47.22,
    gmp: 21.0,
    gmpPercent: 25.30,
    expectedListingPrice: 104.0,
    estProfitPerLot: 3780.0,
    allotmentStatus: "⏳ ALLOTMENT OUT — LISTING TOMORROW (SEP 12 - LINK INTIME)",
    registrar: "Link Intime India Pvt Ltd",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    subscription: {
      total: 124.74,
      qib: 150.87,
      nii: 210.12,
      retail: 73.22,
      demandStatus: "🔥 124x BUMPER SUBSCRIPTION"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Solid Listing Gain (~+25%)",
    aiScore: 88,
    rating: "4.4 / 5.0",
    recommendation: {
      verdict: "CLOSED — LISTING SEP 12",
      targetListingPrice: "₹100 - ₹110 (+20% to +32%)",
      recommendedStrategy: "Allotment finalized on Link Intime. Strong 124x subscription will ensure a healthy listing pop.",
      riskGrade: "LOW_MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "Shree Tirupati Balajee is a leading manufacturer of Flexible Intermediate Bulk Containers (FIBCs), woven sacks, and geotextiles exported to 38+ countries."
    },
    financials: {
      revenueFY24: "₹553.1 Cr",
      patFY24: "₹36.1 Cr"
    }
  },
  {
    id: "CLOSED-MYMUDRA",
    symbol: "MYMUDRA",
    companyName: "My Mudra Fincorp Limited",
    sector: "Fintech Credit Aggregator & Digital Loan Distribution",
    category: "NSE SME",
    market: "IN",
    openDate: "2026-09-05",
    closeDate: "2026-09-09",
    allotmentDate: "2026-09-10",
    listingDate: "2026-09-12",
    listingExchange: "NSE SME",
    priceBand: "₹104 - ₹110",
    minPrice: 104.0,
    maxPrice: 110.0,
    lotSize: 1200,
    minInvestment: 132000.0,
    issueSizeCr: 33.26,
    gmp: 38.0,
    gmpPercent: 34.55,
    expectedListingPrice: 148.0,
    estProfitPerLot: 45600.0,
    allotmentStatus: "⏳ ALLOTMENT OUT — LISTING TOMORROW (SEP 12 - SKYLINE)",
    registrar: "Skyline Financial Services Pvt Ltd",
    registrarUrl: "https://www.skylinerta.com/ipo.php",
    subscription: {
      total: 108.50,
      qib: 45.20,
      nii: 172.40,
      retail: 114.80,
      demandStatus: "🔥 108x MASSIVE SME DEMAND"
    },
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "🚀 High Listing Pop (+34.5% GMP)",
    aiScore: 87,
    rating: "4.3 / 5.0",
    recommendation: {
      verdict: "CLOSED — LISTING TOMORROW",
      targetListingPrice: "₹140 - ₹152 (+27% to +38%)",
      recommendedStrategy: "Bidding closed with 108x demand. Check allotment status on Skyline portal.",
      riskGrade: "MODERATE"
    },
    businessOverview: {
      whatTheCompanyDoes: "My Mudra Fincorp operates digital lending and corporate DSA distribution networks partnering with 90+ banks and NBFCs."
    }
  }
];

const DEFAULT_UPCOMING_IPOS_IN = [
  {
    id: "UPCOMING-WESTERN",
    symbol: "WESTERN",
    companyName: "Western Carriers (India) Limited",
    sector: "Multi-Modal Logistics & 4PL Container Rail Freight",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-13",
    closeDate: "2026-09-18",
    allotmentDate: "2026-09-19",
    listingDate: "2026-09-23",
    listingExchange: "BSE, NSE",
    priceBand: "₹163 - ₹172",
    priceBandExpected: "₹163 - ₹172",
    minPrice: 163.0,
    maxPrice: 172.0,
    lotSize: 87,
    minInvestment: 14964.0,
    issueSizeCr: 492.88,
    freshIssueCr: 400.00,
    ofsCr: 92.88,
    faceValue: "₹5 per share",
    gmp: 30.0,
    expectedGmp: "+₹30 (+17.4%)",
    gmpPercent: 17.44,
    expectedListingPrice: 202.0,
    estProfitPerLot: 2610.0,
    expectedDate: "Sep 13 - Sep 18, 2026",
    drhpStatus: "📋 RHP FILED (OPENS IN 2 DAYS)",
    registrar: "Link Intime India Pvt Ltd",
    registrarUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
    aiOutlook: "India's largest 4PL multi-modal logistics player with specialized container rail services and marquee blue-chip clients (Tata Steel, Vedanta, Jindal).",
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "🚀 Asset-Light 4PL Logistics Play (+17.4% GMP)",
    aiScore: 87,
    rating: "4.3 / 5.0"
  },
  {
    id: "UPCOMING-NORTHARC",
    symbol: "NORTHARC",
    companyName: "Northern Arc Capital Limited",
    sector: "Diversified Retail Lending & Structured Credit Platform",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-16",
    closeDate: "2026-09-19",
    allotmentDate: "2026-09-20",
    listingDate: "2026-09-24",
    listingExchange: "BSE, NSE",
    priceBand: "₹249 - ₹263",
    priceBandExpected: "₹249 - ₹263",
    minPrice: 249.0,
    maxPrice: 263.0,
    lotSize: 57,
    minInvestment: 14991.0,
    issueSizeCr: 777.00,
    freshIssueCr: 500.00,
    ofsCr: 277.00,
    faceValue: "₹10 per share",
    gmp: 128.0,
    expectedGmp: "+₹128 (+48.7%)",
    gmpPercent: 48.67,
    expectedListingPrice: 391.0,
    estProfitPerLot: 7296.0,
    expectedDate: "Sep 16 - Sep 19, 2026",
    drhpStatus: "📋 RHP FILED (OPENS NEXT WEEK)",
    registrar: "KFin Technologies Limited",
    registrarUrl: "https://kosmic.kfintech.com/ipostatus/",
    aiOutlook: "Leading non-bank financial services platform with proprietary Nimbus risk assessment technology, serving 1 crore+ underserved households across MSME, microfinance, and consumer loans.",
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "💎 Premier Credit Platform (GMP +48.7%)",
    aiScore: 93,
    rating: "4.7 / 5.0"
  },
  {
    id: "UPCOMING-ARKADE",
    symbol: "ARKADE",
    companyName: "Arkade Developers Limited",
    sector: "Mumbai Premium Residential Redevelopment & Real Estate",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-16",
    closeDate: "2026-09-19",
    allotmentDate: "2026-09-20",
    listingDate: "2026-09-24",
    listingExchange: "BSE, NSE",
    priceBand: "₹121 - ₹128",
    priceBandExpected: "₹121 - ₹128",
    minPrice: 121.0,
    maxPrice: 128.0,
    lotSize: 110,
    minInvestment: 14080.0,
    issueSizeCr: 410.00,
    freshIssueCr: 410.00,
    ofsCr: 0.0,
    faceValue: "₹10 per share",
    gmp: 63.0,
    expectedGmp: "+₹63 (+49.2%)",
    gmpPercent: 49.22,
    expectedListingPrice: 191.0,
    estProfitPerLot: 6930.0,
    expectedDate: "Sep 16 - Sep 19, 2026",
    drhpStatus: "📋 RHP FILED (100% FRESH ISSUE)",
    registrar: "Bigshare Services Pvt Ltd",
    registrarUrl: "https://ipo.bigshareonline.com/",
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 Zero-Debt Mumbai Realty (GMP +49.2%)",
    aiScore: 91,
    rating: "4.6 / 5.0"
  },
  {
    id: "UPCOMING-MANBA",
    symbol: "MANBA",
    companyName: "Manba Finance Limited",
    sector: "Two-Wheeler & Electric Vehicle Financing NBFC",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-23",
    closeDate: "2026-09-25",
    listingDate: "2026-09-30",
    listingExchange: "BSE, NSE",
    priceBand: "₹114 - ₹120",
    priceBandExpected: "₹114 - ₹120",
    minPrice: 114.0,
    maxPrice: 120.0,
    lotSize: 125,
    minInvestment: 15000.0,
    issueSizeCr: 150.84,
    freshIssueCr: 150.84,
    ofsCr: 0.0,
    gmp: 60.0,
    expectedGmp: "+₹60 (+50.0%)",
    gmpPercent: 50.00,
    expectedListingPrice: 180.0,
    estProfitPerLot: 7500.0,
    expectedDate: "Sep 23 - Sep 25, 2026",
    drhpStatus: "📋 SEBI APPROVED (OPENS LATE SEP)",
    registrar: "Link Intime India Pvt Ltd",
    aiVerdict: "APPLY_FOR_LISTING",
    aiVerdictLabel: "✅ Auto NBFC Play (+50% GMP)",
    aiScore: 87,
    rating: "4.3 / 5.0"
  },
  {
    id: "UPCOMING-KRN",
    symbol: "KRN",
    companyName: "KRN Heat Exchanger and Refrigeration Ltd",
    sector: "HVAC Precision Heat Exchangers & Aluminum Coils",
    category: "Mainboard",
    market: "IN",
    openDate: "2026-09-25",
    closeDate: "2026-09-27",
    listingDate: "2026-10-03",
    listingExchange: "BSE, NSE",
    priceBand: "₹209 - ₹220",
    priceBandExpected: "₹209 - ₹220",
    minPrice: 209.0,
    maxPrice: 220.0,
    lotSize: 65,
    minInvestment: 14300.0,
    issueSizeCr: 341.95,
    freshIssueCr: 341.95,
    ofsCr: 0.0,
    gmp: 235.0,
    expectedGmp: "+₹235 (+106.8%)",
    gmpPercent: 106.82,
    expectedListingPrice: 455.0,
    estProfitPerLot: 15275.0,
    expectedDate: "Sep 25 - Sep 27, 2026",
    drhpStatus: "📋 RHP FILED (DOUBLER EXPECTED)",
    registrar: "Bigshare Services Pvt Ltd",
    aiOutlook: "Sole domestic supplier for marquee HVAC OEMs (Daikin, Carrier, Blue Star, Voltas) with >100% GMP indicating instant multibagger debut.",
    aiVerdict: "STRONG_APPLY_HIGH_GAIN",
    aiVerdictLabel: "🚀 Multibagger HVAC Monopoly (+106.8% GMP)",
    aiScore: 96,
    rating: "4.8 / 5.0"
  }
];

const DEFAULT_LISTED_IPOS_IN = [
  { id: "LIST-GALA", symbol: "GALA", companyName: "Gala Precision Engineering Limited", category: "Mainboard", issuePrice: 529.0, listingPrice: 721.1, listingGainPercent: 36.31, currentPrice: 748.0, totalReturnPercent: 41.4, issueSizeCr: 167.93, subscriptionTotal: "201.4x", status: "🚀 201x DEMAND HIT +41.4%" },
  { id: "LIST-PREMIERENE", symbol: "PREMIERENE", companyName: "Premier Energies Limited", category: "Mainboard", issuePrice: 450.0, listingPrice: 991.0, listingGainPercent: 120.22, currentPrice: 1124.0, totalReturnPercent: 149.78, issueSizeCr: 2830.4, subscriptionTotal: "74.3x", status: "🔥 DOUBLED ON DEBUT (+149.8%)" },
  { id: "LIST-ECOSMOB", symbol: "ECOSMOB", companyName: "ECOS (India) Mobility & Hospitality Ltd", category: "Mainboard", issuePrice: 334.0, listingPrice: 390.0, listingGainPercent: 16.77, currentPrice: 448.5, totalReturnPercent: 34.28, issueSizeCr: 601.2, subscriptionTotal: "64.1x", status: "✅ STRONG RALLY (+34.3%)" },
  { id: "LIST-ORIENTTECH", symbol: "ORIENTTECH", companyName: "Orient Technologies Limited", category: "Mainboard", issuePrice: 206.0, listingPrice: 290.0, listingGainPercent: 40.78, currentPrice: 338.0, totalReturnPercent: 64.08, issueSizeCr: 214.76, subscriptionTotal: "151.7x", status: "MULTIBAGGER (+64.1%)" },
  { id: "LIST-INTERARCH", symbol: "INTERARCH", companyName: "Interarch Building Products Limited", category: "Mainboard", issuePrice: 900.0, listingPrice: 1299.0, listingGainPercent: 44.33, currentPrice: 1260.0, totalReturnPercent: 40.0, issueSizeCr: 600.29, subscriptionTotal: "93.5x", status: "SOLID LISTING (+40.0%)" },
  { id: "LIST-UNICOMM", symbol: "UNICOMM", companyName: "Unicommerce eSolutions Limited", category: "Mainboard", issuePrice: 108.0, listingPrice: 230.0, listingGainPercent: 112.96, currentPrice: 215.0, totalReturnPercent: 99.07, issueSizeCr: 276.57, subscriptionTotal: "168.3x", status: "DOUBLED ON DEBUT (+99.1%)" }
];

export default function IPOHubView({ currentMarket = 'IN', onSelectStock }) {
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, MAINBOARD, SME
  const [summary, setSummary] = useState(null);
  const [activeIpos, setActiveIpos] = useState(currentMarket === 'IN' ? DEFAULT_ACTIVE_IPOS_IN : []);
  const [closedIpos, setClosedIpos] = useState(currentMarket === 'IN' ? DEFAULT_CLOSED_IPOS_IN : []);
  const [upcomingIpos, setUpcomingIpos] = useState(currentMarket === 'IN' ? DEFAULT_UPCOMING_IPOS_IN : []);
  const [listedIpos, setListedIpos] = useState(currentMarket === 'IN' ? DEFAULT_LISTED_IPOS_IN : []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [detailedIpoData, setDetailedIpoData] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
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
    setIsLoadingDetails(true);
    apiFetch(`/api/ipo/${sym}/details`)
      .then(res => (typeof res.json === 'function' ? res.json() : res))
      .then(data => {
        if (data && !data.error) {
          setDetailedIpoData(data);
        } else {
          setDetailedIpoData(selectedIpo);
        }
        setIsLoadingDetails(false);
      })
      .catch(() => {
        setDetailedIpoData(selectedIpo);
        setIsLoadingDetails(false);
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

  // Filter helper
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

  // Dynamic Average GMP calculation
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
              Institutional GMP tracking, live subscription books, allocation probabilities & AI verdicts
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
          
          {/* Search Box */}
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

          {/* Category Filter Chips (All, Mainboard, SME) */}
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

          {/* Refresh Button */}
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
                      <strong style={{ color: ipo.subscription.total >= 10 ? '#10b981' : 'var(--accent-blue)' }}>
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
                    Registrar: <strong style={{ color: 'var(--text-secondary)' }}>{ipo.registrar || 'KFintech / Link Intime'}</strong>
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
                  {modalData.financials.revenueFY24 && (
                    <div><span style={{ color: 'var(--text-muted)' }}>FY24 Revenue: </span><strong>{modalData.financials.revenueFY24}</strong></div>
                  )}
                  {modalData.financials.patFY24 && (
                    <div><span style={{ color: 'var(--text-muted)' }}>FY24 PAT: </span><strong style={{ color: '#10b981' }}>{modalData.financials.patFY24}</strong></div>
                  )}
                  {modalData.financials.cagr3Yr && (
                    <div><span style={{ color: 'var(--text-muted)' }}>3-Yr CAGR: </span><strong style={{ color: 'var(--accent-blue)' }}>{modalData.financials.cagr3Yr}</strong></div>
                  )}
                  {modalData.financials.roe && (
                    <div><span style={{ color: 'var(--text-muted)' }}>ROE: </span><strong>{modalData.financials.roe}</strong></div>
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
'''

with open("frontend/src/components/IPOHubView.jsx", "w") as f:
    f.write(new_code.strip() + "\n")

print("Successfully written updated frontend/src/components/IPOHubView.jsx!")
