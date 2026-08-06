import json
import math
from datetime import datetime
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.competitor import BrandCompetitor
from app.models.report import AnalysisRun, AnalysisResult
from app.services.ai_gateway import check_visibility


def _std_dev(values: list[float]) -> float:
    """Calculate standard deviation of a list of values."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(variance)


def _analyze_brand_queries(
    brand_name: str,
    queries: list[str],
    engines: list[str],
    samples_per_query: int
) -> dict:
    """Analyze a single brand across all queries and engines."""
    query_results = {}
    engine_results = defaultdict(lambda: {"mention_rates": [], "avg_scores": [], "avg_positions": []})

    for query in queries:
        query_mention_count = 0
        query_total_samples = 0
        query_scores = []
        query_positions = []

        for engine in engines:
            results = []
            for _ in range(samples_per_query):
                try:
                    result = check_visibility(brand_name, query, engine)
                    results.append(result)
                except Exception:
                    continue

            if results:
                mention_count = sum(1 for r in results if r["mentioned"])
                positions = [r["position"] for r in results if r["position"] is not None]
                scores = [r["visibility_score"] for r in results]

                mention_rate = round(mention_count / len(results) * 100, 2)
                avg_score = round(sum(scores) / len(scores), 2)
                avg_position = round(sum(positions) / len(positions), 2) if positions else None

                engine_results[engine]["mention_rates"].append(mention_rate)
                engine_results[engine]["avg_scores"].append(avg_score)
                if avg_position is not None:
                    engine_results[engine]["avg_positions"].append(avg_position)

                query_mention_count += mention_count
                query_total_samples += len(results)
                query_scores.extend(scores)
                query_positions.extend(positions)

        if query_total_samples > 0:
            query_results[query] = {
                "mention_rate": round(query_mention_count / query_total_samples * 100, 2),
                "avg_score": round(sum(query_scores) / len(query_scores), 2) if query_scores else 0,
                "avg_position": round(sum(query_positions) / len(query_positions), 2) if query_positions else None
            }

    # Calculate engine summary
    engine_summary = {}
    for engine, stats in engine_results.items():
        engine_summary[engine] = {
            "mention_rate": round(sum(stats["mention_rates"]) / len(stats["mention_rates"]), 2) if stats["mention_rates"] else 0,
            "avg_score": round(sum(stats["avg_scores"]) / len(stats["avg_scores"]), 2) if stats["avg_scores"] else 0,
            "avg_position": round(sum(stats["avg_positions"]) / len(stats["avg_positions"]), 2) if stats["avg_positions"] else None
        }

    # Calculate overall metrics
    all_mention_rates = [qr["mention_rate"] for qr in query_results.values()]
    all_avg_scores = [qr["avg_score"] for qr in query_results.values()]
    all_positions = [qr["avg_position"] for qr in query_results.values() if qr["avg_position"] is not None]

    return {
        "mention_rate": round(sum(all_mention_rates) / len(all_mention_rates), 2) if all_mention_rates else 0,
        "avg_score": round(sum(all_avg_scores) / len(all_avg_scores), 2) if all_avg_scores else 0,
        "avg_position": round(sum(all_positions) / len(all_positions), 2) if all_positions else None,
        "engine_summary": engine_summary,
        "query_breakdown": query_results
    }


def run_competitor_comparison(
    db: Session,
    brand_id: int,
    competitor_ids: list[int],
    queries: list[str],
    engines: list[str],
    samples_per_query: int = 3
) -> dict:
    """Run competitor comparison analysis."""
    # Get main brand
    main_brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not main_brand:
        raise ValueError("Brand not found")

    # Analyze main brand
    main_results = _analyze_brand_queries(main_brand.name, queries, engines, samples_per_query)

    # Analyze competitors
    competitor_results = {}
    for comp_id in competitor_ids:
        comp_brand = db.query(Brand).filter(Brand.id == comp_id).first()
        if comp_brand:
            comp_results = _analyze_brand_queries(comp_brand.name, queries, engines, samples_per_query)
            competitor_results[comp_id] = {
                "name": comp_brand.name,
                "website": comp_brand.website,
                **comp_results
            }

    # Calculate gaps
    gaps = {}
    for comp_id, comp_data in competitor_results.items():
        query_gaps = {}
        for query in queries:
            main_query = main_results["query_breakdown"].get(query, {})
            comp_query = comp_data["query_breakdown"].get(query, {})

            main_mr = main_query.get("mention_rate", 0)
            comp_mr = comp_query.get("mention_rate", 0)
            main_score = main_query.get("avg_score", 0)
            comp_score = comp_query.get("avg_score", 0)

            query_gaps[query] = {
                "mention_rate_gap": round(main_mr - comp_mr, 2),
                "score_gap": round(main_score - comp_score, 2),
                "status": "leading" if main_mr > comp_mr else ("lagging" if main_mr < comp_mr else "tied")
            }

        gaps[comp_id] = {
            "mention_rate_gap": round(main_results["mention_rate"] - comp_data["mention_rate"], 2),
            "score_gap": round(main_results["avg_score"] - comp_data["avg_score"], 2),
            "position_gap": (
                round(main_results["avg_position"] - comp_data["avg_position"], 2)
                if main_results["avg_position"] is not None and comp_data["avg_position"] is not None
                else None
            ),
            "query_gaps": query_gaps,
            "overall_status": _determine_status(
                main_results["mention_rate"],
                comp_data["mention_rate"]
            )
        }

    return {
        "brand_id": brand_id,
        "brand_name": main_brand.name,
        "main_brand": main_results,
        "competitors": competitor_results,
        "gaps": gaps,
        "analyzed_at": datetime.utcnow().isoformat()
    }


def _determine_status(main_rate: float, comp_rate: float) -> str:
    """Determine overall status based on mention rate comparison."""
    diff = main_rate - comp_rate
    if diff > 5:
        return "leading"
    elif diff < -5:
        return "lagging"
    else:
        return "tied"


def save_comparison_result(db: Session, brand_id: int, result: dict):
    """Save comparison result as an analysis run for historical tracking."""
    run = AnalysisRun(
        brand_id=brand_id,
        status="completed",
        total_queries=len(result["main_brand"]["query_breakdown"]),
        completed_queries=len(result["main_brand"]["query_breakdown"]),
        sample_count=3,
    )
    db.add(run)
    db.flush()

    # Save main brand results
    for query, data in result["main_brand"]["query_breakdown"].items():
        for engine, engine_data in result["main_brand"]["engine_summary"].items():
            analysis_result = AnalysisResult(
                run_id=run.id,
                engine=engine,
                query=query,
                mention_count=0,  # Will be calculated from rate
                total_samples=1,
                mention_rate=data["mention_rate"],
                avg_position=data.get("avg_position"),
                avg_word_count=None,
                avg_score=data["avg_score"],
                citation_texts=[]
            )
            db.add(analysis_result)

    db.commit()
    return run