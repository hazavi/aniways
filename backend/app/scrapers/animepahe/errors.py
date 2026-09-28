"""Errors from AnimePahe that should not be mistaken for missing anime."""


class AnimepaheAccessError(Exception):
    """AnimePahe denied access (usually a Cloudflare challenge)."""
