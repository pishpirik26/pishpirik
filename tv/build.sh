#!/bin/sh
# Rindërton TV-në nga loja e web-it: ./build.sh  (versioni merret nga app/appinfo.json)
set -e
cd "$(dirname "$0")"
python3 make_base.py ..
python3 scale.py
VER=$(python3 -c "import json;print(json.load(open('app/appinfo.json'))['version'])")
mkdir -p out
python3 mkipk.py app "out/al.pishpirik.game_${VER}_1920x1080.ipk"
rm -rf build720 && cp -r app build720
python3 - <<'PY'
import json
p='build720/appinfo.json'; d=json.load(open(p)); d['resolution']='1280x720'; json.dump(d,open(p,'w'),indent=2,ensure_ascii=False)
PY
python3 mkipk.py build720 "out/al.pishpirik.game_${VER}_1280x720.ipk"
rm -rf build720
