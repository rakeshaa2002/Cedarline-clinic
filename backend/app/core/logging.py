import logging


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )
    # httpx logs full request URLs at INFO; keep them quiet so nothing sensitive leaks.
    logging.getLogger("httpx").setLevel(logging.WARNING)
