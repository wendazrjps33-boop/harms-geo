from datetime import datetime

from pydantic import BaseModel


class AnalysisRunRequest(BaseModel):
    engines: list[str] = ["openai", "claude", "gemini", "deepseek", "qianwen", "mimo"]
    samples_per_query: int = 3


class AnalysisRunResponse(BaseModel):
    id: int
    brand_id: int
    status: str
    total_queries: int
    completed_queries: int
    sample_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResultResponse(BaseModel):
    id: int
    engine: str
    query: str
    mention_count: int
    total_samples: int
    mention_rate: float
    avg_position: float | None
    avg_word_count: float | None
    avg_score: float
    citation_texts: list | None = None

    class Config:
        from_attributes = True


class AnalysisSummaryResponse(BaseModel):
    total_queries: int
    overall_mention_rate: float
    overall_avg_score: float
    engine_summary: dict[str, dict[str, float]]
    engine_consistency: float


class AnalysisDetailResponse(BaseModel):
    run: AnalysisRunResponse
    results: list[AnalysisResultResponse]


class AnalysisComparisonResponse(BaseModel):
    run_id: int
    created_at: str
    summary: AnalysisSummaryResponse