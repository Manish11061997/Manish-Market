"""Tests for the NSE option-chain client — parser correctness with canned payloads (no network)."""
from nse_option_chain import _parse_chain, fetch_nse_option_chain


def _canned_chain():
    return {
        "records": {
            "underlyingValue": 24252.0,
            "expiryDates": ["28-Aug-2026", "04-Sep-2026", "30-Sep-2026"],
        },
        "filtered": {
            "data": [
                {"strikePrice": 24000, "expiryDate": "28-Aug-2026",
                 "CE": {"openInterest": 4_200_000, "changeinOpenInterest": -150000,
                        "impliedVolatility": 11.5, "lastPrice": 310.0, "totalTradedVolume": 900000},
                 "PE": {"openInterest": 3_100_000, "changeinOpenInterest": 250000,
                        "impliedVolatility": 12.8, "lastPrice": 95.0, "totalTradedVolume": 700000}},
                {"strikePrice": 24200, "expiryDate": "28-Aug-2026",
                 "CE": {"openInterest": 2_800_000, "changeinOpenInterest": 300000,
                        "impliedVolatility": 12.9, "lastPrice": 190.0, "totalTradedVolume": 800000},
                 "PE": {"openInterest": 4_500_000, "changeinOpenInterest": -100000,
                        "impliedVolatility": 13.4, "lastPrice": 160.0, "totalTradedVolume": 850000}},
                {"strikePrice": 24500, "expiryDate": "28-Aug-2026",
                 "CE": {"openInterest": 5_100_000, "changeinOpenInterest": 500000,
                        "impliedVolatility": 13.1, "lastPrice": 80.0, "totalTradedVolume": 1_100_000},
                 "PE": {"openInterest": 2_400_000, "changeinOpenInterest": 90000,
                        "impliedVolatility": 14.0, "lastPrice": 330.0, "totalTradedVolume": 600000}},
                # wrong expiry row must be ignored
                {"strikePrice": 99999, "expiryDate": "04-Sep-2026",
                 "CE": {"openInterest": 99_999_999}, "PE": {"openInterest": 99_999_999}},
            ]
        },
    }


def test_parse_chain_extracts_real_structure():
    out = _parse_chain(_canned_chain())
    assert out is not None
    assert out["source"] == "nse-option-chain"
    assert out["isLiveChainData"] is True
    assert out["underlyingValue"] == 24252.0
    assert out["nearestExpiry"] == "28-Aug-2026"
    # wrong-expiry row excluded
    assert len(out["strikes"]) == 3
    # PCR = put OI / call OI summed over nearest expiry
    expected_pcr = round((3_100_000 + 4_500_000 + 2_400_000) / (4_200_000 + 2_800_000 + 5_100_000), 2)
    assert out["pcr"] == expected_pcr


def test_parse_chain_max_pain_and_walls():
    out = _parse_chain(_canned_chain())
    # call wall = highest call OI strike; put wall = highest put OI strike
    assert out["callResistanceStrike"] == 24500
    assert out["putSupportStrike"] == 24200
    # ATM = closest strike to underlying 24252
    assert out["atmStrike"] in (24200,) or abs(out["atmStrike"] - 24252) <= 150
    # max pain computed and sane (within traded strikes)
    assert out["maxPain"] in (24000, 24200, 24500)


def test_parse_chain_returns_none_on_garbage():
    assert _parse_chain({}) is None
    assert _parse_chain({"records": {}}) is None
    assert _parse_chain({"records": {"underlyingValue": 1}, "filtered": {"data": []}}) is None
    assert _parse_chain(None) is None


def test_fetch_returns_none_without_network(monkeypatch):
    """When NSE is unreachable the fetcher must return None (DATA UNAVAILABLE), never fabricate."""
    import nse_option_chain as mod

    class FailingSession:
        def get(self, *a, **k):
            raise requests_connection_error()

    def requests_connection_error():
        import requests
        return requests.ConnectionError("simulated outage")

    monkeypatch.setattr(mod, "_build_session", lambda: FailingSession())
    monkeypatch.delattr(mod.requests.Session, "get", raising=False)
    out = fetch_nse_option_chain("NIFTY", force_refresh=True)
    assert out is None
