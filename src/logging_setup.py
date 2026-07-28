"""
Local file logging so there's a record of what happened if the app
crashes or errors out while running unattended (e.g. on a factory
floor with nobody watching the terminal).

Logs to <app dir>/logs/gfixqc.log, rotating at 5MB with 3 backups kept.
The directory is resolved from the executable/script location rather
than the working directory - a packaged app launched from a shortcut
can have a cwd anywhere (or one it can't write to), which would
silently produce no log at all.
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler

from .paths import app_path


def setup_logging():
    logger = logging.getLogger("gfixqc")
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger

    log_dir = app_path("logs")
    try:
        os.makedirs(log_dir, exist_ok=True)
        handler = RotatingFileHandler(
            os.path.join(log_dir, "gfixqc.log"), maxBytes=5 * 1024 * 1024, backupCount=3
        )
    except OSError:
        # last resort: at least get logs onto stderr rather than nowhere
        handler = logging.StreamHandler(sys.stderr)

    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)

    def log_unhandled_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        logger.critical("Unhandled exception - app is crashing", exc_info=(exc_type, exc_value, exc_traceback))
        sys.__excepthook__(exc_type, exc_value, exc_traceback)

    sys.excepthook = log_unhandled_exception

    return logger
