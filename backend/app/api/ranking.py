from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.risk_agent import DISCLAIMER
from app.models import RankingCompareItem, RankingCompareRequest, RankingCompareResponse, RankingResponse
from app.services.ranking_engine import get_ranking_summary


router = APIRouter(prefix="/api/ranking", tags=["ranking"])


@router.get("/{symbol}", response_model=RankingResponse)
def read_ranking(symbol: str) -> RankingResponse:
    return RankingResponse(**get_ranking_summary(symbol))


@router.post("/compare", response_model=RankingCompareResponse)
def compare_rankings(request: RankingCompareRequest) -> RankingCompareResponse:
    successful_items: list[RankingCompareItem] = []
    failed_items: list[RankingCompareItem] = []

    for symbol in request.symbols:
        try:
            ranking = get_ranking_summary(symbol)
        except HTTPException as exc:
            failed_items.append(RankingCompareItem(symbol=symbol, error=str(exc.detail)))
            continue
        except Exception:
            failed_items.append(RankingCompareItem(symbol=symbol, error="Ranking could not be loaded for this symbol."))
            continue

        successful_items.append(
            RankingCompareItem(
                symbol=ranking["symbol"],
                score=ranking["score"],
                setup_quality=ranking["setup_quality"],
                risk_level=ranking["risk_level"],
                confidence=ranking["confidence"],
                reasons=ranking["reasons"],
                warnings=ranking["warnings"],
            )
        )

    successful_items.sort(key=lambda item: item.score if item.score is not None else -1, reverse=True)
    ranked_items = [
        item.model_copy(update={"rank": index + 1})
        for index, item in enumerate(successful_items)
    ]

    best_setup = ranked_items[0].symbol if ranked_items else None
    return RankingCompareResponse(rankings=[*ranked_items, *failed_items], best_setup=best_setup, disclaimer=DISCLAIMER)
