# 콘솔 등록용 앱 로고(600×600 PNG) 생성 — app/public/brand/logo.svg와 같은 도형을 PIL로 4배 크기에 그려 축소.
# 라이트: 흰 배경 + 검정 카메라 + 라임 모서리 / 다크: 차콜 배경 + 흰 카메라 + 라임 모서리.
# 실행: python scripts/build-app-icons.py → assets/brand/app-logo-600.png, app-logo-dark-600.png
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "brand"
SIZE = 600
S = 4  # 슈퍼샘플링
LIME = (154, 217, 74)


def draw(bg, body, lens_ring):
    W = SIZE * S
    img = Image.new("RGB", (W, W), bg)
    d = ImageDraw.Draw(img)
    # logo.svg 120 단위 좌표 → 가운데 정렬, 여백 포함 0.78 배율
    k = W * 0.78 / 120
    o = (W - 120 * k) / 2
    p = lambda x, y: (o + x * k, o + y * k)
    w = round(7 * k)
    r = 8 * k
    for (x0, y0, dx, dy) in [(10, 10, 1, 1), (110, 10, -1, 1), (110, 110, -1, -1), (10, 110, 1, -1)]:
        # 모서리 꺾쇠: 두 선분 + 둥근 끝
        a = p(x0, y0 + dy * 24)
        b = p(x0, y0)
        c = p(x0 + dx * 24, y0)
        d.line([a, b, c], fill=LIME, width=w, joint="curve")
        for q in (a, b, c):
            d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=LIME)
    # 카메라 몸체
    d.rounded_rectangle([p(30, 36), p(90, 86)], radius=r, fill=body)
    d.polygon([p(47, 37), p(52, 29), p(68, 29), p(73, 37)], fill=body)
    # 렌즈
    cx, cy = p(60, 61)
    for rad, col in ((15, lens_ring), (9, body)):
        d.ellipse([cx - rad * k, cy - rad * k, cx + rad * k, cy + rad * k], fill=col)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw((255, 255, 255), (17, 18, 20), (255, 255, 255)).save(OUT / "app-logo-600.png")
    draw((23, 24, 27), (255, 255, 255), (23, 24, 27)).save(OUT / "app-logo-dark-600.png")
    print("ok", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
