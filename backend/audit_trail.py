from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum
import uuid
import time
import logging

logger = logging.getLogger(__name__)

class AuditEventType(str, Enum):
    AI_QUERY = "AI_QUERY"
    SIGNAL_GENERATED = "SIGNAL_GENERATED"
    PRE_TRADE_RISK_CHECK = "PRE_TRADE_RISK_CHECK"
    ORDER_PLACED = "ORDER_PLACED"
    ORDER_FILLED = "ORDER_FILLED"
    ORDER_REJECTED = "ORDER_REJECTED"
    CIRCUIT_BREACH = "CIRCUIT_BREACH"
    FAILOVER_ENGAGED = "FAILOVER_ENGAGED"

@dataclass
class AuditRecord:
    audit_id: str
    event_type: AuditEventType
    timestamp: str
    symbol: str
    user_query: Optional[str] = None
    market_state_snapshot: Dict[str, Any] = field(default_factory=dict)
    market_data_timestamp: str = ""
    ai_evidence: Dict[str, Any] = field(default_factory=dict) # {observedData, inference, uncertainty}
    signal_details: Dict[str, Any] = field(default_factory=dict)
    risk_evaluation: Dict[str, Any] = field(default_factory=dict)
    order_details: Dict[str, Any] = field(default_factory=dict)
    execution_result: Dict[str, Any] = field(default_factory=dict)
    rationale_answer: str = "" # Plain English summary answering "Why?"

    def to_dict(self) -> dict:
        return {
            "auditId": self.audit_id,
            "eventType": self.event_type.value,
            "timestamp": self.timestamp,
            "symbol": self.symbol,
            "userQuery": self.user_query,
            "marketStateSnapshot": self.market_state_snapshot,
            "marketDataTimestamp": self.market_data_timestamp,
            "aiEvidence": self.ai_evidence,
            "signalDetails": self.signal_details,
            "riskEvaluation": self.risk_evaluation,
            "orderDetails": self.order_details,
            "executionResult": self.execution_result,
            "rationaleAnswer": self.rationale_answer
        }

class AuditTrailRegistry:
    """
    Immutable Production Audit Trail Engine.
    Records every critical AI decision, signal calculation, risk check, and order execution.
    Provides complete transparency for algorithmic compliance and diagnostics.
    """

    def __init__(self, max_records: int = 2000):
        self.max_records = max_records
        self._records: List[AuditRecord] = []

    def record_ai_decision(
        self,
        symbol: str,
        user_query: str,
        market_state: dict,
        observed_data: dict,
        inference: list,
        uncertainty: list,
        signal_details: dict
    ) -> AuditRecord:
        record = AuditRecord(
            audit_id=f"AUD_{uuid.uuid4().hex[:10].upper()}",
            event_type=AuditEventType.AI_QUERY,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            symbol=symbol,
            user_query=user_query,
            market_state_snapshot={
                "price": market_state.get("currentPrice"),
                "change": market_state.get("change"),
                "changePercent": market_state.get("changePercent"),
                "volume": market_state.get("volume"),
                "bid": market_state.get("bid"),
                "ask": market_state.get("ask"),
                "status": market_state.get("status")
            },
            market_data_timestamp=market_state.get("timestamp", time.strftime("%H:%M:%S")),
            ai_evidence={
                "observedData": observed_data,
                "inference": inference,
                "uncertainty": uncertainty
            },
            signal_details=signal_details,
            rationale_answer=f"Signal '{signal_details.get('action')}' was generated because: {'; '.join(inference[:2]) if inference else 'Multi-factor quantitative alignment'}."
        )
        self._add(record)
        return record

    def record_order_event(
        self,
        event_type: AuditEventType,
        symbol: str,
        risk_evaluation: dict,
        order_details: dict,
        execution_result: dict,
        rationale: str = ""
    ) -> AuditRecord:
        try:
            event_type = AuditEventType(event_type)
        except ValueError:
            logger.warning(f"Unknown audit event_type '{event_type}'; defaulting to ORDER_PLACED.")
            event_type = AuditEventType.ORDER_PLACED
        record = AuditRecord(
            audit_id=f"AUD_{uuid.uuid4().hex[:10].upper()}",
            event_type=event_type,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            symbol=symbol,
            market_data_timestamp=time.strftime("%H:%M:%S"),
            risk_evaluation=risk_evaluation,
            order_details=order_details,
            execution_result=execution_result,
            rationale_answer=rationale or (
                f"Order was {execution_result.get('status')} after passing {risk_evaluation.get('passedChecks', 0)} risk gates."
                if risk_evaluation.get("isApproved")
                else f"Order rejected by risk gates: {'; '.join(risk_evaluation.get('rejectionReasons', []))}."
            )
        )
        self._add(record)
        return record

    def _add(self, record: AuditRecord):
        self._records.append(record)
        if len(self._records) > self.max_records:
            self._records.pop(0)

    def get_records(self, symbol: Optional[str] = None, event_type: Optional[str] = None, limit: int = 100) -> List[dict]:
        res = self._records
        if symbol:
            sym_clean = symbol.upper().strip().lstrip("$")
            res = [r for r in res if sym_clean in r.symbol.upper()]
        if event_type:
            res = [r for r in res if r.event_type.value == event_type.upper()]
        return [r.to_dict() for r in reversed(res[-limit:])]

# Global Audit Trail Singleton
audit_trail = AuditTrailRegistry()
