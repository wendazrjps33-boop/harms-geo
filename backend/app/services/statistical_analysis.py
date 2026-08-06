import json
import math
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.report import AnalysisRun, AnalysisResult
from app.services.ai_gateway import check_visibility


def _std_dev(values: list[float]) -> float:
    """Calculate standard deviation of a list of values."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(variance)


def run_statistical_analysis(
    db: Session,
    brand_id: int,
    brand_name: str,
    queries: list[str],
    engines: list[str],
    samples_per_query: int = 3
) -> AnalysisRun:
    """
    Execute statistical analysis:
    1. Create AnalysisRun record
    2. For each (query, engine) combination, run samples_per_query samples
    3. Calculate statistical metrics (mention rate, avg position, avg score)
    4. Store AnalysisResult
    5. Update AnalysisRun status
    """
    # Create run record
    run = AnalysisRun(
        brand_id=brand_id,
        status="running",
        total_queries=len(queries) * len(engines),
        sample_count=samples_per_query
    )
    db.add(run)
    db.flush()

    for query in queries:
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
                word_counts = [r["word_count"] for r in results if r["word_count"] is not None]
                scores = [r["visibility_score"] for r in results]
                citations = [r["citation_text"] for r in results if r["citation_text"]]

                analysis_result = AnalysisResult(
                    run_id=run.id,
                    engine=engine,
                    query=query,
                    mention_count=mention_count,
                    total_samples=len(results),
                    mention_rate=round(mention_count / len(results) * 100, 2),
                    avg_position=round(sum(positions) / len(positions), 2) if positions else None,
                    avg_word_count=round(sum(word_counts) / len(word_counts), 2) if word_counts else None,
                    avg_score=round(sum(scores) / len(scores), 2),
                    citation_texts=citations[:3]  # Keep first 3 citations
                )
                db.add(analysis_result)

            run.completed_queries += 1
            db.flush()

    run.status = "completed"
    db.commit()

    # Update brand statistical score
    _update_brand_statistical_score(db, brand_id, run.id)
    return run


def get_statistical_summary(db: Session, run_id: int) -> dict:
    """Get statistical summary for a single analysis run."""
    results = db.query(AnalysisResult).filter(AnalysisResult.run_id == run_id).all()
    if not results:
        return {
            "total_queries": 0,
            "overall_mention_rate": 0.0,
            "overall_avg_score": 0.0,
            "engine_summary": {},
            "engine_consistency": 100.0
        }

    total_queries = len(results)
    mention_rate = sum(r.mention_rate for r in results) / total_queries
    avg_score = sum(r.avg_score for r in results) / total_queries

    # Per-engine statistics
    engine_stats = {}
    for r in results:
        if r.engine not in engine_stats:
            engine_stats[r.engine] = {"mention_rates": [], "avg_scores": []}
        engine_stats[r.engine]["mention_rates"].append(float(r.mention_rate))
        engine_stats[r.engine]["avg_scores"].append(float(r.avg_score))

    engine_summary = {}
    for engine, stats in engine_stats.items():
        engine_summary[engine] = {
            "mention_rate": round(sum(stats["mention_rates"]) / len(stats["mention_rates"]), 2),
            "avg_score": round(sum(stats["avg_scores"]) / len(stats["avg_scores"]), 2)
        }

    # Engine consistency (standard deviation of mention rates across engines)
    engine_mention_rates = [s["mention_rate"] for s in engine_summary.values()]
    consistency = 100 - _std_dev(engine_mention_rates) if len(engine_mention_rates) > 1 else 100

    return {
        "total_queries": total_queries,
        "overall_mention_rate": round(mention_rate, 2),
        "overall_avg_score": round(avg_score, 2),
        "engine_summary": engine_summary,
        "engine_consistency": round(consistency, 2)
    }


def _update_brand_statistical_score(db: Session, brand_id: int, run_id: int):
    """Update brand score based on statistical analysis results."""
    summary = get_statistical_summary(db, run_id)
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand and summary:
        # Composite score = mention_rate * 0.4 + avg_score * 0.3 + engine_consistency * 0.3
        mention_rate = float(summary["overall_mention_rate"])
        avg_score = float(summary["overall_avg_score"])
        consistency = float(summary["engine_consistency"])
        score = mention_rate * 0.4 + avg_score * 0.3 + consistency * 0.3
        brand.visibility_score = round(min(score, 100), 2)
        db.commit()


def get_analysis_runs(db: Session, brand_id: int) -> list[AnalysisRun]:
    """Get all analysis runs for a brand, ordered by creation date."""
    return db.query(AnalysisRun).filter(
        AnalysisRun.brand_id == brand_id
    ).order_by(AnalysisRun.created_at.desc()).all()


def get_run_detail(db: Session, run_id: int) -> dict:
    """Get detailed results for a single analysis run."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not run:
        return {}

    results = db.query(AnalysisResult).filter(AnalysisResult.run_id == run_id).all()

    return {
        "run": {
            "id": run.id,
            "brand_id": run.brand_id,
            "status": run.status,
            "total_queries": run.total_queries,
            "completed_queries": run.completed_queries,
            "sample_count": run.sample_count,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        },
        "results": [
            {
                "id": r.id,
                "engine": r.engine,
                "query": r.query,
                "mention_count": r.mention_count,
                "total_samples": r.total_samples,
                "mention_rate": float(r.mention_rate),
                "avg_position": float(r.avg_position) if r.avg_position else None,
                "avg_word_count": float(r.avg_word_count) if r.avg_word_count else None,
                "avg_score": float(r.avg_score),
                "citation_texts": json.loads(r.citation_texts) if isinstance(r.citation_texts, str) else (r.citation_texts or [])
            }
            for r in results
        ]
    }


def compare_runs(db: Session, run_ids: list[int]) -> list[dict]:
    """Compare multiple analysis runs."""
    comparisons = []
    for run_id in run_ids:
        summary = get_statistical_summary(db, run_id)
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run and summary:
            comparisons.append({
                "run_id": run.id,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "summary": summary
            })
    return comparisons