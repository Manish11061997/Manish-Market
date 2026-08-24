from analysis_models import RiskRewardPlan, EntryZone

class RiskManagementEngine:
    @staticmethod
    def calculate_plan(
        price: float,
        atr: float,
        support_price: float,
        resistance_price: float,
        is_bullish: bool = True,
        min_rr_threshold: float = 1.8
    ) -> RiskRewardPlan:
        """
        Calculates entry, stop loss, targets, risk/reward ratio, and invalidation rules.
        """
        if price <= 0:
            price = 100.0
        # Ensure realistic ATR (1% to 3% of price)
        effective_atr = atr if (atr > 0 and atr < price * 0.15) else price * 0.015

        if is_bullish:
            entry_low = round(price * 0.998, 2)
            entry_high = round(price * 1.004, 2)
            
            # Use support_price only if valid positive level below price
            if support_price > 0 and support_price < price:
                stop_loss = round(max(support_price * 0.995, price - (1.5 * effective_atr)), 2)
            else:
                stop_loss = round(price - (1.5 * effective_atr), 2)

            risk_per_share = round(price - stop_loss, 2)
            if risk_per_share <= (price * 0.005):
                risk_per_share = round(price * 0.012, 2)
                stop_loss = round(price - risk_per_share, 2)

            target1 = round(price + (1.5 * risk_per_share), 2)
            target2 = round(price + (2.8 * risk_per_share), 2)
            target3 = round(price + (4.0 * risk_per_share), 2)

            reward_per_share = round(target2 - price, 2)
            rr_ratio = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 1.8
            invalidation = f"Sustained 5-min candle close below ₹{stop_loss:.2f}"
            allocation = "Standard (2% Risk Capacity)" if rr_ratio >= min_rr_threshold else "Reduced (R:R below threshold)"
        else:
            entry_low = round(price * 0.996, 2)
            entry_high = round(price * 1.002, 2)

            if resistance_price > price:
                stop_loss = round(min(resistance_price * 1.005, price + (1.5 * effective_atr)), 2)
            else:
                stop_loss = round(price + (1.5 * effective_atr), 2)

            risk_per_share = round(stop_loss - price, 2)
            if risk_per_share <= (price * 0.005):
                risk_per_share = round(price * 0.012, 2)
                stop_loss = round(price + risk_per_share, 2)

            target1 = round(price - (1.5 * risk_per_share), 2)
            target2 = round(price - (2.8 * risk_per_share), 2)
            target3 = round(price - (4.0 * risk_per_share), 2)

            reward_per_share = round(price - target2, 2)
            rr_ratio = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 1.8
            invalidation = f"Sustained 5-min candle close above ₹{stop_loss:.2f}"
            allocation = "Standard (2% Risk Capacity)" if rr_ratio >= min_rr_threshold else "Reduced (R:R below threshold)"

        return RiskRewardPlan(
            entryZone=EntryZone(low=entry_low, high=entry_high),
            stopLoss=stop_loss,
            target1=target1,
            target2=target2,
            target3=target3,
            riskPerShare=risk_per_share,
            rewardPerShare=reward_per_share,
            riskRewardRatio=rr_ratio,
            suggestedAllocation=allocation,
            invalidationCondition=invalidation
        )
