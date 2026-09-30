import base64
import re

from openai import OpenAI, OpenAIError

from app.ai.providers.base import LLMMessage, LLMProviderError, LLMResponse, ToolCall, ToolSpec

THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str, model: str, vision_model: str, timeout: float = 120.0):
        self._client = OpenAI(base_url=base_url, api_key=api_key, timeout=timeout)
        self._model = model
        self._vision_model = vision_model

    def chat(self, messages: list[LLMMessage], tools: list[ToolSpec]) -> LLMResponse:
        # Only send `tools` when there are some; an empty list is rejected by some servers.
        extra: dict = {}
        if tools:
            extra["tools"] = [
                {
                    "type": "function",
                    "function": {"name": t.name, "description": t.description, "parameters": t.parameters},
                }
                for t in tools
            ]
        try:
            completion = self._client.chat.completions.create(
                model=self._model,
                messages=[self._to_wire(message) for message in messages],
                temperature=0.1,
                **extra,
            )
        except OpenAIError as exc:
            raise LLMProviderError(str(exc)) from exc

        message = completion.choices[0].message
        tool_calls = tuple(
            ToolCall(id=call.id, name=call.function.name, arguments=call.function.arguments or "{}")
            for call in (message.tool_calls or [])
            if getattr(call, "function", None) is not None
        )
        content = THINK_BLOCK.sub("", message.content or "").strip()
        return LLMResponse(content=content, tool_calls=tool_calls)

    def vision(self, prompt: str, image: bytes, media_type: str) -> str:
        # OpenAI-compatible image input: the image travels inline as a base64 data URL.
        data_url = f"data:{media_type};base64,{base64.b64encode(image).decode('ascii')}"
        try:
            completion = self._client.chat.completions.create(
                model=self._vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0,
            )
        except OpenAIError as exc:
            raise LLMProviderError(str(exc)) from exc
        return THINK_BLOCK.sub("", completion.choices[0].message.content or "").strip()

    @staticmethod
    def _to_wire(message: LLMMessage) -> dict:
        wire: dict = {"role": message.role, "content": message.content}
        if message.tool_calls:
            wire["tool_calls"] = [
                {"id": c.id, "type": "function", "function": {"name": c.name, "arguments": c.arguments}}
                for c in message.tool_calls
            ]
        if message.tool_call_id:
            wire["tool_call_id"] = message.tool_call_id
        return wire
