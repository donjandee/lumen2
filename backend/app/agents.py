"""Multi-Agent Framework — orchestrates the four Lumen agents."""

from __future__ import annotations

import json
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Awaitable

from openai import AsyncOpenAI

from app.config import settings
from app.data_store import data_store
from app.mcp_server import call_tool


class AgentRole(str, Enum):
    CLEANER = "cleaner"
    PROFILER = "profiler"
    ANALYST = "analyst"
    CHART = "chart"
    NARRATOR = "narrator"


@dataclass
class AgentResult:
    role: AgentRole
    output: Any
    metadata: dict = field(default_factory=dict)


@dataclass
class AgentStatus:
    role: AgentRole
    status: str  # "idle" | "running" | "done" | "error"
    message: str = ""


StatusCallback = Callable[[AgentStatus], Awaitable[None]]


SYSTEM_PROMPTS = {
    AgentRole.CLEANER: """Data quality inspector. Use query_db to count nulls per column. DuckDB SQL only. Example: SELECT COUNT(*) FILTER (WHERE "col" IS NULL) AS col_nulls FROM table. Never use IS NOT A TYPE syntax. Return JSON summary.""",

    AgentRole.PROFILER: """Dataset profiler. Use profile_dataset to get schema info. Return JSON with key stats: row count, column types, null percentages.""",

    AgentRole.ANALYST: """Data analyst. Use query_db to find patterns/trends. DuckDB: quote column names with double quotes, use TRY_CAST(col AS DOUBLE) for SUM/AVG. Return JSON with key findings.""",

    AgentRole.CHART: """Chart creator. Use generate_chart to make 2-3 visualizations. DuckDB: quote column names, use TRY_CAST(col AS DOUBLE) for numeric ops. Return chart specs array.""",

    AgentRole.NARRATOR: """Report writer. Synthesize findings into JSON: {"headline":"...","insights":["..."],"recommendations":["..."]}. Be concise with specific numbers.""",
}


class Agent:
    """A single Lumen agent that uses OpenAI-compatible API + MCP tools."""

    def __init__(self, role: AgentRole, client: AsyncOpenAI):
        self.role = role
        self.client = client
        self.system_prompt = SYSTEM_PROMPTS[role]

    async def run(
        self,
        user_prompt: str,
        context: dict | None = None,
        on_status: StatusCallback | None = None,
    ) -> AgentResult:
        if on_status:
            await on_status(AgentStatus(self.role, "running", "Starting analysis..."))

        user_content = user_prompt
        if context:
            # Truncate context to keep tokens low
            ctx_str = json.dumps(context, default=str)[:1500]
            user_content += f"\n\nPrior context: {ctx_str}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_content},
        ]
        tools = self._get_allowed_tools()
        output = None
        collected_tool_outputs: list[str] = []
        max_iterations = 5

        for _ in range(max_iterations):
            kwargs: dict = {
                "model": settings.llm_model,
                "max_tokens": 4096,
                "messages": messages,
            }
            if tools:
                kwargs["tools"] = tools
            response = await self.client.chat.completions.create(**kwargs)

            choice = response.choices[0]

            if choice.finish_reason == "stop" or choice.finish_reason == "length":
                output = choice.message.content or ""
                break

            if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
                messages.append(choice.message)

                for tool_call in choice.message.tool_calls:
                    if on_status:
                        await on_status(
                            AgentStatus(self.role, "running", f"Using tool: {tool_call.function.name}")
                        )
                    arguments = json.loads(tool_call.function.arguments)
                    result = await call_tool(tool_call.function.name, arguments)
                    # Truncate tool output to stay under token limit
                    content = result[0].text[:2000] if result else ""
                    # Collect chart/query outputs for the final result
                    if tool_call.function.name == "generate_chart" and content:
                        collected_tool_outputs.append(content)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": content,
                    })
            else:
                output = choice.message.content or ""
                break

        if on_status:
            await on_status(AgentStatus(self.role, "done"))

        # For chart agent, return collected chart specs directly
        if collected_tool_outputs and self.role == AgentRole.CHART:
            charts = []
            for raw in collected_tool_outputs:
                try:
                    charts.append(json.loads(raw))
                except (json.JSONDecodeError, TypeError):
                    pass
            if charts:
                return AgentResult(role=self.role, output=charts)

        # Try to parse as JSON
        parsed = output
        if output:
            try:
                parsed = json.loads(output)
            except (json.JSONDecodeError, TypeError):
                pass

        return AgentResult(role=self.role, output=parsed)

    def _get_allowed_tools(self) -> list[dict]:
        """Return the OpenAI-format tools schema for this agent's allowed tools."""
        tool_defs = {
            "query_db": {
                "type": "function",
                "function": {
                    "name": "query_db",
                    "description": "Run a SQL query against the loaded dataset.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql": {"type": "string", "description": "SQL query to execute"}
                        },
                        "required": ["sql"],
                    },
                },
            },
            "run_python": {
                "type": "function",
                "function": {
                    "name": "run_python",
                    "description": "Execute pandas/numpy code. Dataset available as `df`.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "Python code"},
                            "table_name": {"type": "string", "description": "Table name"},
                        },
                        "required": ["code", "table_name"],
                    },
                },
            },
            "generate_chart": {
                "type": "function",
                "function": {
                    "name": "generate_chart",
                    "description": "Generate a Recharts-compatible chart spec.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "chart_type": {"type": "string", "enum": ["bar", "line", "pie", "area", "scatter"]},
                            "title": {"type": "string"},
                            "sql": {"type": "string"},
                            "x_key": {"type": "string"},
                            "y_keys": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["chart_type", "title", "sql", "x_key", "y_keys"],
                    },
                },
            },
            "profile_dataset": {
                "type": "function",
                "function": {
                    "name": "profile_dataset",
                    "description": "Get schema, dtypes, null counts, sample rows.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "table_name": {"type": "string", "description": "Table name"},
                        },
                        "required": ["table_name"],
                    },
                },
            },
        }

        role_tools = {
            AgentRole.CLEANER: ["query_db"],
            AgentRole.PROFILER: ["profile_dataset"],
            AgentRole.ANALYST: ["query_db"],
            AgentRole.CHART: ["generate_chart"],
            AgentRole.NARRATOR: [],
        }

        return [tool_defs[t] for t in role_tools[self.role]]


class Orchestrator:
    """Coordinates the multi-agent pipeline."""

    def __init__(self, on_status: StatusCallback | None = None):
        self.client = AsyncOpenAI(
            base_url=settings.llm_base_url,
            api_key=settings.github_token,
        )
        self.on_status = on_status
        self.agents = {
            role: Agent(role, self.client) for role in AgentRole
        }

    async def run_analysis(self, table_name: str, user_query: str) -> dict:
        """Run the full 4-agent analysis pipeline."""
        results: dict[str, AgentResult] = {}

        # Get column names upfront to include in prompts
        profile = data_store.profile(table_name)
        columns_info = ", ".join(
            f'"{c["column_name"]}"({c["column_type"]})' for c in profile["columns"]
        )
        schema_hint = f'Columns: {columns_info}. Always quote column names with double quotes in SQL.'

        # 1. Cleaner — check data quality
        cleaner_result = await self.agents[AgentRole.CLEANER].run(
            f"Check table '{table_name}' for nulls/issues. {schema_hint}",
            on_status=self.on_status,
        )
        results["cleaner"] = cleaner_result

        # 2. Profiler — get schema stats
        profiler_result = await self.agents[AgentRole.PROFILER].run(
            f"Profile table '{table_name}'.",
            on_status=self.on_status,
        )
        results["profiler"] = profiler_result

        # 3. Analyst — find patterns
        analyst_result = await self.agents[AgentRole.ANALYST].run(
            f"Table '{table_name}'. {schema_hint}\nQuestion: {user_query}",
            on_status=self.on_status,
        )
        results["analyst"] = analyst_result

        # 4. Chart — create visualizations
        chart_result = await self.agents[AgentRole.CHART].run(
            f"Create 2 charts for table '{table_name}'. {schema_hint}\nTopic: {user_query}",
            context={"findings": str(analyst_result.output)[:400]},
            on_status=self.on_status,
        )
        results["chart"] = chart_result

        # 5. Narrator — synthesize report (no tools needed)
        narrator_result = await self.agents[AgentRole.NARRATOR].run(
            f"Write analysis report for: {user_query}",
            context={
                "findings": str(analyst_result.output)[:800],
            },
            on_status=self.on_status,
        )
        results["narrator"] = narrator_result

        return {
            "cleaning": cleaner_result.output,
            "profiling": profiler_result.output,
            "analysis": analyst_result.output,
            "charts": chart_result.output,
            "narrative": narrator_result.output,
        }
