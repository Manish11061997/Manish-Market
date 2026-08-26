import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, getAuthToken } from './api';

const STORAGE_KEY = 'manish_market_watchlists_v1';
const EVENT_NAME = 'manish_market_watchlist_change';

const DEFAULT_WATCHLISTS = {
  IN: [
    {
      id: 'favorites_in',
      name: '⭐ Favorites',
      isDefault: true,
      symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS', 'SBIN.NS']
    },
    {
      id: 'growth_in',
      name: '🚀 High Growth',
      isDefault: false,
      symbols: ['ZOMATO.NS', 'TRENT.NS', 'HAL.NS', 'BEL.NS', 'KPITTECH.NS', 'DIXON.NS']
    },
    {
      id: 'banking_in',
      name: '🏦 Banking & Finance',
      isDefault: false,
      symbols: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS']
    }
  ],
  US: [
    {
      id: 'favorites_us',
      name: '⭐ Favorites',
      isDefault: true,
      symbols: ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA']
    },
    {
      id: 'ai_semis_us',
      name: '🤖 AI & Semis',
      isDefault: false,
      symbols: ['NVDA', 'AMD', 'AVGO', 'ARM', 'QCOM', 'PLTR']
    },
    {
      id: 'fintech_us',
      name: '💳 Fintech & Mega',
      isDefault: false,
      symbols: ['V', 'MA', 'JPM', 'PYPL', 'SQ', 'COIN']
    }
  ]
};

function getStoredWatchlists() {
  if (typeof window === 'undefined') return DEFAULT_WATCHLISTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLISTS;
    const parsed = JSON.parse(raw);
    if (!parsed.IN || !parsed.US) return DEFAULT_WATCHLISTS;
    return parsed;
  } catch (err) {
    console.warn('Failed to parse stored watchlists:', err);
    return DEFAULT_WATCHLISTS;
  }
}

function saveWatchlists(data, syncRemote = true, market = 'IN') {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));

    if (syncRemote && getAuthToken()) {
      const marketLists = data[market] || [];
      apiFetch('/api/user/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, watchlists: marketLists })
      }).catch(e => console.warn('Remote watchlist sync notice:', e));
    }
  } catch (err) {
    console.error('Failed to save watchlists to localStorage:', err);
  }
}

export function useWatchlist(currentMarket = 'IN') {
  const [allLists, setAllLists] = useState(getStoredWatchlists);
  const marketLists = allLists[currentMarket] || allLists.IN || [];
  
  const [activeListId, setActiveListId] = useState(() => {
    const defaultList = marketLists.find(l => l.isDefault) || marketLists[0];
    return defaultList ? defaultList.id : 'favorites_in';
  });

  // Fetch remote user watchlists if logged in
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    apiFetch(`/api/user/watchlists?market=${currentMarket}`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (data?.watchlists && data.watchlists.length > 0) {
            setAllLists(prev => {
              const next = { ...prev, [currentMarket]: data.watchlists };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              return next;
            });
          }
        }
      })
      .catch(() => {});
  }, [currentMarket]);

  // Sync with storage changes across components and windows
  useEffect(() => {
    const handleCustomChange = (e) => {
      if (e.detail) {
        setAllLists(e.detail);
      }
    };
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        setAllLists(getStoredWatchlists());
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Ensure activeListId is valid for current market
  useEffect(() => {
    const valid = marketLists.some(l => l.id === activeListId);
    if (!valid && marketLists.length > 0) {
      setActiveListId(marketLists[0].id);
    }
  }, [currentMarket, marketLists, activeListId]);

  const activeList = marketLists.find(l => l.id === activeListId) || marketLists[0] || {
    id: `custom_${Date.now()}`,
    name: '⭐ My Watchlist',
    symbols: []
  };

  const isWatchlisted = useCallback((symbol, targetListId = null) => {
    if (!symbol) return false;
    const cleanSym = String(symbol).toUpperCase().trim();
    const listsToCheck = targetListId 
      ? marketLists.filter(l => l.id === targetListId)
      : marketLists;
    return listsToCheck.some(list => 
      list.symbols?.some(s => s.toUpperCase() === cleanSym || s.toUpperCase() === `${cleanSym}.NS` || cleanSym === `${s.toUpperCase()}.NS`)
    );
  }, [marketLists]);

  const toggleWatchlist = useCallback((symbol, targetListId = null) => {
    if (!symbol) return false;
    const cleanSym = String(symbol).toUpperCase().trim();
    const listIdToUse = targetListId || activeListId || marketLists[0]?.id;

    const updated = { ...allLists };
    const currentMarketLists = [...(updated[currentMarket] || [])];
    const listIndex = currentMarketLists.findIndex(l => l.id === listIdToUse);

    let isAdded = false;
    if (listIndex >= 0) {
      const list = { ...currentMarketLists[listIndex] };
      const symList = list.symbols || [];
      const existingIdx = symList.findIndex(s => 
        s.toUpperCase() === cleanSym || s.toUpperCase() === `${cleanSym}.NS` || cleanSym === `${s.toUpperCase()}.NS`
      );

      if (existingIdx >= 0) {
        list.symbols = symList.filter((_, idx) => idx !== existingIdx);
        isAdded = false;
      } else {
        list.symbols = [cleanSym, ...symList];
        isAdded = true;
      }

      currentMarketLists[listIndex] = list;
      updated[currentMarket] = currentMarketLists;
      saveWatchlists(updated);
      setAllLists(updated);
    }
    return isAdded;
  }, [allLists, currentMarket, activeListId, marketLists]);

  const addSymbolToList = useCallback((symbol, targetListId = null) => {
    if (!symbol) return;
    const cleanSym = String(symbol).toUpperCase().trim();
    const listIdToUse = targetListId || activeListId || marketLists[0]?.id;

    const updated = { ...allLists };
    const currentMarketLists = [...(updated[currentMarket] || [])];
    const listIndex = currentMarketLists.findIndex(l => l.id === listIdToUse);

    if (listIndex >= 0) {
      const list = { ...currentMarketLists[listIndex] };
      const symList = list.symbols || [];
      const already = symList.some(s => s.toUpperCase() === cleanSym);
      if (!already) {
        list.symbols = [cleanSym, ...symList];
        currentMarketLists[listIndex] = list;
        updated[currentMarket] = currentMarketLists;
        saveWatchlists(updated);
        setAllLists(updated);
      }
    }
  }, [allLists, currentMarket, activeListId, marketLists]);

  const removeSymbolFromList = useCallback((symbol, targetListId = null) => {
    if (!symbol) return;
    const cleanSym = String(symbol).toUpperCase().trim();
    const listIdToUse = targetListId || activeListId || marketLists[0]?.id;

    const updated = { ...allLists };
    const currentMarketLists = [...(updated[currentMarket] || [])];
    const listIndex = currentMarketLists.findIndex(l => l.id === listIdToUse);

    if (listIndex >= 0) {
      const list = { ...currentMarketLists[listIndex] };
      list.symbols = (list.symbols || []).filter(s => 
        s.toUpperCase() !== cleanSym && s.toUpperCase() !== `${cleanSym}.NS` && cleanSym !== `${s.toUpperCase()}.NS`
      );
      currentMarketLists[listIndex] = list;
      updated[currentMarket] = currentMarketLists;
      saveWatchlists(updated);
      setAllLists(updated);
    }
  }, [allLists, currentMarket, activeListId, marketLists]);

  const createList = useCallback((name) => {
    if (!name || !name.trim()) return;
    const newId = `list_${Date.now()}`;
    const newList = {
      id: newId,
      name: name.trim(),
      isDefault: false,
      symbols: []
    };

    const updated = { ...allLists };
    const currentMarketLists = [...(updated[currentMarket] || []), newList];
    updated[currentMarket] = currentMarketLists;
    saveWatchlists(updated);
    setAllLists(updated);
    setActiveListId(newId);
    return newId;
  }, [allLists, currentMarket]);

  const deleteList = useCallback((listId) => {
    if (!listId) return;
    const updated = { ...allLists };
    const currentMarketLists = (updated[currentMarket] || []).filter(l => l.id !== listId && !l.isDefault);
    updated[currentMarket] = currentMarketLists;
    saveWatchlists(updated);
    setAllLists(updated);
    if (activeListId === listId && currentMarketLists.length > 0) {
      setActiveListId(currentMarketLists[0].id);
    }
  }, [allLists, currentMarket, activeListId]);

  return {
    watchlists: marketLists,
    activeListId,
    setActiveListId,
    activeList,
    isWatchlisted,
    toggleWatchlist,
    addSymbolToList,
    removeSymbolFromList,
    createList,
    deleteList,
    totalSavedCount: marketLists.reduce((acc, l) => acc + (l.symbols?.length || 0), 0)
  };
}
