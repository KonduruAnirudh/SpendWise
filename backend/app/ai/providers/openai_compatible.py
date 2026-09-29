import re

from openai import OpenAI, OpenAIError

from app.ai.providers.base import LLMMessage, LLMProviderError, LLMResponse, ToolCall, ToolSpec

THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 120.0):
        self._client = OpenAI(base_url=base_url, api_key=api_key, timeout=timeout)
        self._model = model

    def chat(self, messages: list[LLMMessage], tools: list[ToolSpec]) -> LLMResponse:
        try:
            completion = self._client.chat.completions.create(
                model=self._model,
                messages=[self._to_wire(message) for message in messages],
                tools=[
                    {
                        "type": "function",
                        "function": {"name": t.name, "description": t.description, "parameters": t.parameters},
                    }
                    for t in tools
                ],
                temperature=0.1,
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