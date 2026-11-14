import { formatBytes } from '@gyushot/image-core';
import { MAX_INPUT_BYTES, type DecodeError } from '@gyushot/image-core/browser';

export function decodeErrorMessage(e: DecodeError): string {
  switch (e) {
    case 'too-large-file':
      return `${formatBytes(MAX_INPUT_BYTES)}보다 큰 사진은 처리할 수 없어요.`;
    case 'too-many-pixels':
      return '사진 해상도가 너무 커서(4천만 화소 초과) 처리할 수 없어요.';
    case 'heic-unsupported':
      return '현재 HEIC 사진은 지원하지 않아요. JPG로 저장된 사진을 선택해 주세요.';
    case 'unsupported-format':
      return '지원하지 않는 파일 형식이에요. JPG·PNG·WebP 사진을 선택해 주세요.';
    default:
      return '사진을 열지 못했어요. 파일이 손상됐을 수 있어요.';
  }
}
