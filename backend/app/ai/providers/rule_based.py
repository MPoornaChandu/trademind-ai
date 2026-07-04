from __future__ import annotations

from typing import Any

from app.ai.providers.base import AIProvider
from app.ai.schemas import AnalysisResult, ProviderHealth


class RuleBasedProvider(AIProvider):
    name = "rule_based"

    def analyze(self, task: str, context: dict[str, Any], depth: str = "full") -> AnalysisResult:
        market = context.get("market", {})
        indicators = context.get("indicators", {})
        risk = context.get("risk", {})

        symbol = str(market.get("symbol") or indicators.get("symbol") or "the selected symbol")
        trend = str(indicators.get("trend") or "neutral")
        rsi = indicators.get("rsi_14")
        macd_histogram = indicators.get("macd_histogram")
        price_change = market.get("price_change_percentage")
        risk_level = str(risk.get("risk_level") or "unknown")
        volatility = risk.get("daily_volatility_percent")
        drawdown = risk.get("max_drawdown_percent")

        outlook = self._outlook(trend, rsi, macd_histogram)
        confidence = self._confidence(trend, rsi, macd_histogram, risk_level)
        direction_text = self._direction_text(outlook)

        key_drivers = [
            f"Trend label is {trend}, based on the current moving-average and momentum mix.",
            f"RSI 14 is {self._format_value(rsi)}, which helps show whether momentum is stretched or balanced.",
            f"MACD histogram is {self._format_value(macd_histogram)}, a simple read on momentum direction.",
        ]

        if price_change is not None:
            key_drivers.append(f"Recent price change is {price_change}%, which adds context to the indicator reading.")

        risk_warnings = [
            f"Current risk level is {risk_level}, based on recent volatility and drawdown inputs.",
            "Market data can be delayed, incomplete, or temporarily unavailable.",
            "Technical indicators can lag during sudden news events or sharp price gaps.",
        ]

        if volatility is not None:
            risk_warnings.append(f"Daily volatility is {volatility}%, so price movement can still vary materially.")

        what_could_go_wrong = [
            "A trend can reverse if new information changes market expectations.",
            "Momentum signals can conflict with broader market conditions.",
            "Low liquidity, news, or index-wide movement can reduce the usefulness of indicator-only analysis.",
        ]

        if drawdown is not None:
            what_could_go_wrong.append(f"Recent max drawdown is {drawdown}%, which should be reviewed before forming a view.")

        return AnalysisResult(
            outlook=outlook,
            summary=(
                f"{symbol} currently shows a {direction_text} educational profile. "
                "This view is based on recent market data, trend, RSI, MACD, and available risk context."
            ),
            key_drivers=key_drivers,
            uncertainty_notes=[
                "This is a snapshot of recent data, not a forecast.",
                "Signals can change when fresh price data, earnings, news, or market-wide moves arrive.",
                "Use multiple checks and risk context when studying any market idea.",
            ],
            risk_warnings=risk_warnings,
            what_could_go_wrong=what_could_go_wrong,
            confidence=confidence,
            provider_used=self.name,
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            available=True,
            configured=True,
            status="ready",
        )

    def _outlook(self, trend: str, rsi: Any, macd_histogram: Any) -> str:
        rsi_value = self._number_or_none(rsi)
        macd_value = self._number_or_none(macd_histogram)

        if trend == "bullish" and self._healthy_rsi(rsi_value) and self._positive(macd_value):
            return "bullish_bias"

        if trend == "bearish" and self._weak_rsi(rsi_value) and self._negative(macd_value):
            return "bearish_bias"

        if trend == "neutral":
            return "neutral"

        return "mixed"

    def _confidence(self, trend: str, rsi: Any, macd_histogram: Any, risk_level: str) -> str:
        rsi_value = self._number_or_none(rsi)
        macd_value = self._number_or_none(macd_histogram)

        if risk_level == "high" or rsi_value is None or macd_value is None:
            return "low"

        if trend in {"bullish", "bearish"} and abs(macd_value) > 0:
            return "medium"

        return "low"

    def _direction_text(self, outlook: str) -> str:
        labels = {
            "bullish_bias": "bullish-biased",
            "bearish_bias": "bearish-biased",
            "neutral": "neutral",
            "mixed": "mixed",
        }
        return labels.get(outlook, "mixed")

    def _healthy_rsi(self, value: float | None) -> bool:
        return value is not None and 45 <= value <= 70

    def _weak_rsi(self, value: float | None) -> bool:
        return value is not None and value < 55

    def _positive(self, value: float | None) -> bool:
        return value is not None and value > 0

    def _negative(self, value: float | None) -> bool:
        return value is not None and value < 0

    def _number_or_none(self, value: Any) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _format_value(self, value: Any) -> str:
        return "not available" if value is None else str(value)
