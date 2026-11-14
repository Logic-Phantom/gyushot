# 디자인 시트(assets/design/sample-photos-sheet.webp, 4x4 격자)를 타일별 예시 사진으로 분할한다.
# 흰색 여백(밝기 244 이상 비율 90% 이상)을 행/열 단위로 찾아 타일 경계를 계산하고,
# 둥근 모서리·안티앨리어싱 여백이 남지 않도록 사방 6px 안쪽을 잘라 JPEG(품질 90)로 저장한다.
# 실행: python scripts/split-sample-photos.py
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "design" / "sample-photos-sheet.webp"
OUT = ROOT / "app" / "public" / "samples"
INSET = 6

# 시트 순서(왼→오, 위→아래)에 맞춘 파일 이름. 증명사진 4장은 앱 화면 예시에도 쓴다.
NAMES = [
    "id-woman-sweater", "id-man-black", "id-woman-shirt", "id-man-suit",
    "portrait-woman-river", "portrait-man-park", "portrait-woman-room", "portrait-man-books",
    "scene-sunset-tower", "scene-beach", "scene-cherry-blossom", "scene-night-city",
    "object-dog", "object-latte", "object-plant", "object-notebook",
]


def runs(values, threshold, min_len=3):
    out, start = [], None
    for i, v in enumerate(values):
        if v >= threshold and start is None:
            start = i
        if v < threshold and start is not None:
            if i - start >= min_len:
                out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(values) - 1))
    return out


def main() -> int:
    img = Image.open(SRC).convert("RGB")
    gray = np.asarray(img.convert("L")).astype(int)
    bg = gray >= 244
    row_gutters = runs(bg.mean(axis=1), 0.97)
    bands = [(a[1] + 1, b[0] - 1) for a, b in zip(row_gutters, row_gutters[1:])]
    bands = [b for b in bands if b[1] - b[0] > 100]
    tiles = []
    for y0, y1 in bands:
        col_gutters = runs(bg[y0 + 20 : y1 - 20].mean(axis=0), 0.9)
        for a, b in zip(col_gutters, col_gutters[1:]):
            x0, x1 = a[1] + 1, b[0] - 1
            if x1 - x0 > 100:
                tiles.append((x0, y0, x1, y1))
    if len(tiles) != len(NAMES):
        print(f"타일 {len(tiles)}개를 찾았어요(기대 {len(NAMES)}개). 시트가 바뀌었는지 확인하세요.", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, (x0, y0, x1, y1) in zip(NAMES, tiles):
        crop = img.crop((x0 + INSET, y0 + INSET, x1 - INSET + 1, y1 - INSET + 1))
        path = OUT / f"{name}.jpg"
        crop.save(path, "JPEG", quality=90, optimize=True)
        manifest.append({"id": name, "file": f"samples/{name}.jpg", "width": crop.width, "height": crop.height})
        print(f"{path.relative_to(ROOT)}  {crop.width}x{crop.height}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
