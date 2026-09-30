"""
Dependency Injection
====================

Shared resources with lazy initialization.
"""

import httpx

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Get HTTP client (raises if not initialized)."""
    if not _client:
        raise RuntimeError("HTTP client not initialized")
    return _client


def init_dependencies(client: httpx.AsyncClient) -> None:
    """Initialize dependencies on startup."""
    global _client
    _client = client


async def cleanup_dependencies() -> None:
    """Cleanup on shutdown."""
    global _client
    if _client:
        await _client.aclose()
    _client = None
