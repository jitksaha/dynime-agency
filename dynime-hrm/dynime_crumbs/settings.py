from dynime.settings import TEMPLATES

TEMPLATES[0]["OPTIONS"]["context_processors"].append(
    "dynime_crumbs.context_processors.breadcrumbs",
)
