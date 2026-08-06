from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ContentType(str, Enum):
    FAQ = "faq"
    COMMUNITY_QA = "community_qa"
    ARTICLE = "article"
    PRESS_RELEASE = "press_release"


class ContentStatus(str, Enum):
    GENERATING = "generating"
    DRAFT = "draft"
    READY = "ready"
    DISTRIBUTING = "distributing"
    PUBLISHED = "published"
    VERIFIED = "verified"
    FAILED = "failed"


class Platform(str, Enum):
    REDDIT = "reddit"
    QUORA = "quora"
    MEDIUM = "medium"
    ZHIHU = "zhihu"
    XIAOHONGSHU = "xiaohongshu"
    WECHAT = "wechat"
    WEBSITE = "website"
    PR = "pr"
    OTHER = "other"


class ContentGenerateRequest(BaseModel):
    brand_id: int = Field(gt=0)
    content_type: ContentType
    custom_instructions: str | None = Field(default=None, max_length=500)
    language: str = Field(default="zh", max_length=5, description="输出语言: zh=中文, en=English")
    target_word_count: int = Field(default=1000, ge=500, description="目标字数，最小500")
    engine: str = Field(default="mimo", pattern=r"^(mimo|deepseek|openai|qianwen|claude|gemini)$", description="AI引擎选择，claude/gemini 仅 Agency 计划可用")


class ContentGenerateResponse(BaseModel):
    task_id: str
    content_id: int
    status: str
    message: str


class ContentListItem(BaseModel):
    id: int
    brand_id: int
    brand_name: str
    content_type: str
    title: str
    body: str
    tags: list[str] | None = None
    status: str
    word_count: int
    quality_score: float | None
    target_platform: str | None
    published_at: datetime | None
    created_at: datetime
    engine: str = "mimo"
    target_word_count: int = 1000

    class Config:
        from_attributes = True


class ContentDetail(BaseModel):
    id: int
    user_id: int
    brand_id: int
    brand_name: str
    content_type: str
    title: str
    body: str
    tags: list[str] | None
    platform_format: str
    distribution_guide: dict | None
    status: str
    source_analysis_run_id: int | None
    source_weak_keywords: list[str] | None
    source_competitor_gaps: list[dict] | None
    published_at: datetime | None
    target_platform: str | None
    target_platform_url: str | None
    quality_score: float | None
    word_count: int
    created_at: datetime
    updated_at: datetime
    engine: str = "mimo"
    target_word_count: int = 1000

    class Config:
        from_attributes = True


class ContentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    body: str | None = None
    tags: list[str] | None = Field(default=None, max_length=10)


class RegenerateRequest(BaseModel):
    section_text: str | None = None
    modification_instructions: str = Field(max_length=300)


class PublishRequest(BaseModel):
    platform_url: str | None = None
    target_platform: Platform | None = None
    publish_notes: str | None = None


class ConfirmResponse(BaseModel):
    id: int
    status: str
    message: str


class PublishResponse(BaseModel):
    id: int
    status: str
    published_at: datetime | None
    target_platform: str | None
    target_platform_url: str | None
    message: str


class EngineCitation(BaseModel):
    engine: str
    cited: bool
    position: int | None
    accuracy: float | None
    checked_at: datetime


class PlatformIndexing(BaseModel):
    is_indexed: bool
    indexed_at: datetime | None
    search_rank: int | None
    search_engine: str | None


class AiCitations(BaseModel):
    total_citations: int
    engines: list[EngineCitation]


class RankingDelta(BaseModel):
    score_before: float | None
    score_after: float | None
    delta: float | None
    delta_percent: float | None
    checked_at: datetime


class TimelineNode(BaseModel):
    days_after_publish: int
    check_date: str
    is_adopted: bool | None
    citation_count: int | None
    status: str | None


class AdoptionResponse(BaseModel):
    content_id: int
    published_at: datetime | None
    days_since_publish: int
    platform_indexing: PlatformIndexing
    ai_citations: AiCitations
    ranking_delta: RankingDelta
    timeline: list[TimelineNode]


class AdoptionSummary(BaseModel):
    total_published: int
    total_adopted: int
    adoption_rate: float
    avg_ranking_delta: float


class MonthUsage(BaseModel):
    generated: int
    limit: int
    remaining: int


class ContentStatsResponse(BaseModel):
    total_contents: int
    by_status: dict[str, int]
    by_type: dict[str, int]
    adoption_summary: AdoptionSummary
    this_month: MonthUsage


class BrandProfileUpdateRequest(BaseModel):
    brand_description: str = Field(max_length=500)
    core_products: str = Field(max_length=300)
    target_audience: str = Field(max_length=200)
    key_selling_points: str | None = Field(default=None, max_length=300)
    industry: str | None = None


class BrandProfileResponse(BaseModel):
    brand_id: int
    brand_description: str | None
    core_products: str | None
    target_audience: str | None
    key_selling_points: str | None
    industry: str | None
    website_crawled_at: datetime | None
    updated_at: datetime

    class Config:
        from_attributes = True


class CrawlerRequest(BaseModel):
    url: str


class CrawlerResponse(BaseModel):
    task_id: str
    message: str
