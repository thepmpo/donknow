"""Create a standalone Expo project using the current Docen shell foundations."""
import argparse
import json
from pathlib import Path
import shutil
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SHARED = (
    "theme.ts", "desktop-theme.ts", "workspace-geometry.ts", "duo-layout.ts",
    "DuoLayout.tsx", "DuoChrome.tsx", "DuoBackNavigation.tsx", "NavigationGlass.tsx",
    "SheetBackdrop.tsx", "SurfaceInteraction.tsx", "motion.tsx",
)
RUNTIME = (
    "@expo/vector-icons", "expo", "expo-blur", "expo-font", "expo-glass-effect",
    "expo-modules-core", "react", "react-dom", "react-native",
    "react-native-safe-area-context", "react-native-web",
)
DEVELOPMENT = ("@types/react", "typescript")

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")

def populate(directory):
    shutil.copytree(ROOT / "templates/product-starter", directory, dirs_exist_ok=True)
    (directory / "system").mkdir()
    for name in SHARED:
        shutil.copyfile(ROOT / "mobile/src" / name, directory / "system" / name)
    original = ROOT / "mobile/modules/duckduck-duo"
    native = directory / "modules/duckduck-duo"
    (native / "ios").mkdir(parents=True)
    for name in ("package.json", "ios/DuckduckDuo.podspec", "ios/DuckduckDuoModule.swift"):
        shutil.copyfile(original / name, native / name)
    write_json(native / "expo-module.config.json", {"platforms": ["apple"], "apple": {"modules": ["DuckduckDuoModule"]}})

    lock = json.loads((ROOT / "mobile/package-lock.json").read_text())
    runtime = {name: lock["packages"]["node_modules/" + name]["version"] for name in RUNTIME}
    development = {name: lock["packages"]["node_modules/" + name]["version"] for name in DEVELOPMENT}
    identity = {"name": "new-service-starter", "version": "0.1.0"}
    dependencies = {"dependencies": runtime, "devDependencies": development}
    write_json(directory / "package.json", {
        **identity, **dependencies, "private": True, "main": "index.ts",
        "scripts": {"web": "expo start --web", "ios": "expo run:ios", "typecheck": "tsc --noEmit",
                    "build:web": "expo export --platform web", "build:ios-js": "expo export --platform ios"},
    })
    lock.update(identity)
    lock["packages"][""] = {**identity, **dependencies}
    write_json(directory / "package-lock.json", lock)
    for name in ("new-app-project-contract.md", "new-app-ai-handoff.md"):
        shutil.copyfile(ROOT / "docs/templates" / name, directory / name)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    output = parser.add_mutually_exclusive_group(required=True)
    output.add_argument("--directory", type=Path)
    output.add_argument("--zip", type=Path)
    args = parser.parse_args()
    if args.directory:
        if args.directory.exists():
            parser.error("Choose a new directory.")
        args.directory.parent.mkdir(parents=True, exist_ok=True)
        populate(args.directory)
        return
    if args.zip.exists():
        parser.error("Choose a new zip path.")
    args.zip.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        directory = Path(tmp) / "product-starter"
        populate(directory)
        with ZipFile(args.zip, "x", compression=ZIP_DEFLATED) as archive:
            for path in sorted(directory.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(Path(tmp)))

if __name__ == "__main__":
    main()
