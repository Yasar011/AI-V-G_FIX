"""
Resolves file paths against the application's own directory rather than
the current working directory.

This matters for the packaged build: a shortcut, a scheduled task or a
different drive can leave the working directory pointing anywhere, and
everything the app needs (.env, the Firebase key, the model weights)
would silently go missing.
"""
import os
import sys


def app_dir():
    """The directory the app "lives" in - next to the .exe when packaged,
    the project root when running from source (this file is in src/)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def app_path(*parts):
    """Absolute path to something inside the app directory. Absolute paths
    are passed through untouched, so an explicit path in .env still wins."""
    joined = os.path.join(*parts)
    if os.path.isabs(joined):
        return joined
    return os.path.join(app_dir(), joined)
