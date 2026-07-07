"""
dynime_audit/settings.py

This module is used to write settings contents related to payroll app
"""

from dynime.settings import TEMPLATES

TEMPLATES[0]["OPTIONS"]["context_processors"].append(
    "dynime_audit.context_processors.history_form",
)
