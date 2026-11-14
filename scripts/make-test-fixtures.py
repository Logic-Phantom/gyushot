# image-core 테스트용 합성 이미지 생성(개인정보 없음, 저장소 자체 제작 — 라이선스: 프로젝트와 동일).
# 실행: python scripts/make-test-fixtures.py
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "packages" / "image-core" / "tests" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)
base = Image.new("RGB", (8, 4), (200, 30, 30))
for o in range(1, 9):
    exif = Image.Exif()
    exif[0x0112] = o            # Orientation
    exif[0x0132] = "2026:11:14 12:00:00"  # DateTime (제거 확인용)
    base.save(OUT / f"orient-{o}.jpg", "JPEG", quality=90, exif=exif.tobytes())
Image.new("RGBA", (5, 3), (0, 0, 0, 0)).save(OUT / "transparent.png", "PNG")
Image.new("RGB", (7, 9), (10, 200, 10)).save(OUT / "lossy.webp", "WEBP", quality=80)
Image.new("RGB", (7, 9), (10, 200, 10)).save(OUT / "lossless.webp", "WEBP", lossless=True)
Image.new("RGB", (11, 13), (255, 255, 255)).save(OUT / "plain.jpg", "JPEG", quality=80)
Image.new("RGB", (11, 13), (255, 255, 255)).save(OUT / "density-300.jpg", "JPEG", quality=80, dpi=(300, 300))
(OUT / "not-an-image.jpg").write_bytes(b"hello, this is text pretending to be a jpg")
print("ok", sorted(p.name for p in OUT.iterdir()))
