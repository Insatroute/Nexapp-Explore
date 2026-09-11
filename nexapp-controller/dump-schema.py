"""
Dump the controller's API schema.

The backend already has drf-yasg installed but exposes no schema route, so rather
than add one to the product repo this boots Django in-process and asks drf-yasg
for the same document a /swagger.json endpoint would return. It walks the live
URLConf, so it cannot drift from the routes the API actually serves.

STRICTLY READ-ONLY. It imports the Django app and generates a schema; it opens no
socket, runs no migration and writes nothing but the output file.

    export NXC_SRC=/path/to/nexapp-controller-new-ui     # optional
    python3 scripts/dump-schema.py [-o swagger.json]

Needs the controller's Python environment on the path — easiest is to run it
inside the running web container:

    docker compose exec web python /code/scripts/dump-schema.py -o /code/swagger.json
"""
import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_SRC = HERE.parent.parent / "nexapp-controller-new-ui"
SRC = Path(os.environ.get("NXC_SRC", DEFAULT_SRC)).resolve()

ap = argparse.ArgumentParser()
ap.add_argument("-o", "--out", default=str(HERE.parent / "controller-swagger.json"))
ap.add_argument(
    "--settings",
    default=os.environ.get("DJANGO_SETTINGS_MODULE", "nexapp2.dev_docker_settings"),
    help="Django settings module (default: nexapp2.dev_docker_settings)",
)
args = ap.parse_args()

if not (SRC / "tests" / "nexapp2").is_dir():
    sys.exit(
        f"Controller source not found at {SRC}\n"
        f"  Set NXC_SRC to your checkout:\n"
        f"      export NXC_SRC=/path/to/nexapp-controller-new-ui"
    )

# The Django project lives in tests/, so both the repo root and tests/ go on the
# path: the project package is `nexapp2`, its apps are imported from the root.
sys.path.insert(0, str(SRC))
sys.path.insert(0, str(SRC / "tests"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", args.settings)

try:
    import django

    django.setup()
except Exception as e:
    sys.exit(
        f"Could not start Django ({type(e).__name__}: {e}).\n\n"
        f"This needs the controller's Python environment — its dependencies, its\n"
        f"database settings and its env vars. The reliable way is to run it inside\n"
        f"the running container, where all three already hold:\n\n"
        f"    docker compose exec web python /code/scripts/dump-schema.py \\\n"
        f"        -o /code/swagger.json\n\n"
        f"then copy swagger.json into this repo."
    )

from drf_yasg import openapi  # noqa: E402
from drf_yasg.generators import OpenAPISchemaGenerator  # noqa: E402
from drf_yasg.codecs import OpenAPICodecJson  # noqa: E402
from drf_yasg import utils as _yasg_utils  # noqa: E402
from drf_yasg.inspectors import field as _yasg_field  # noqa: E402


# ---------------------------------------------------------------------------
# Disambiguate serializers that implicitly share a ref name.
#
# drf-yasg derives a schema's ref name from the serializer's CLASS NAME, so two
# apps that both define e.g. RadiusPostAuthSerializer collide and generation dies
# outright:
#
#   SwaggerGenerationError: Schema for <...nexapp_radius...> would override
#   distinct serializer <...nexapp_radius_admin...> because they implicitly
#   share the same ref_name
#
# The documented fix is `ref_name` on both serializers' Meta — a change to the
# product repo. This tool does not get to require that: it is a reader of the
# platform, not an author in it. So the first class to claim a name keeps it and
# any later claimant is prefixed with its app package, which is both unique and
# readable in the output.
#
# Every rename is printed, so a collision is visible rather than papered over.
# ---------------------------------------------------------------------------
_ref_owner: dict[str, str] = {}
_renamed: list[str] = []
_orig_ref_name = _yasg_utils.get_serializer_ref_name


def _unique_ref_name(serializer):
    name = _orig_ref_name(serializer)
    if not name:
        return name
    cls = type(serializer)
    key = f"{cls.__module__}.{cls.__qualname__}"
    owner = _ref_owner.get(name)
    if owner is None:
        _ref_owner[name] = key
        return name
    if owner == key:
        return name
    app = cls.__module__.split(".")[0]
    unique = f"{app}.{name}"
    if _ref_owner.get(unique) in (None, key):
        _ref_owner[unique] = key
        if unique not in _renamed:
            _renamed.append(f"{name} -> {unique}")
        return unique
    # Still colliding: fall back to the full module path, which cannot repeat.
    unique = f"{cls.__module__}.{name}"
    _ref_owner[unique] = key
    if unique not in _renamed:
        _renamed.append(f"{name} -> {unique}")
    return unique


# field.py imported the function by name, so patching utils alone would not
# reach the call that actually raises.
_yasg_utils.get_serializer_ref_name = _unique_ref_name
_yasg_field.get_serializer_ref_name = _unique_ref_name

info = openapi.Info(
    title="Nexapp Controller API",
    default_version="v1",
    description="Generated from the controller's live URLConf by drf-yasg.",
)
generator = OpenAPISchemaGenerator(info=info)
# request=None -> no view is filtered out by permissions, so the document covers
# the whole surface rather than only what an anonymous caller may reach.
schema = generator.get_schema(request=None, public=True)

blob = OpenAPICodecJson(validators=[]).encode(schema)
doc = json.loads(blob.decode("utf-8"))

Path(args.out).write_text(json.dumps(doc, indent=2))
if _renamed:
    print(f"disambiguated {len(_renamed)} colliding serializer ref name(s):")
    for r in _renamed:
        print(f"    {r}")
print(
    f"wrote {args.out}: {len(doc.get('paths', {}))} paths, "
    f"{len(doc.get('definitions', {}))} definitions (Swagger {doc.get('swagger', '?')})"
)
