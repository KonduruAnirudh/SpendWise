from functools import lru_cache

from app.ai.providers.base import (
    LLMMessage,
    LLMProvider,
    LLMProviderError,
    LLMResponse,
    ToolCall,
    ToolSpec,
)
from app.ai.providers.openai_compatible import OpenAICompatibleProvider
from app.core.config import settings


@lru_cache
def get_llm_provider() -> LLMProvider:
    return OpenAICompatibleProvider(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        vision_model=settings.llm_vision_model,
    )


__all__ = [
    "LLMMessage",
    "LLMProvider",
    "LLMProviderError",
    "LLMResponse",
    "ToolCall",
    "ToolSpec",
    "get_llm_provider",
]