import { describe, it, expect } from 'vitest';

describe('Document and Certificate Upload Validation', () => {
  const ACCEPTED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.doc', '.docx'];
  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/x-pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const accepts = (file: { name: string; type?: string; size: number }) => {
    const name = (file.name || '').toLowerCase();
    const ext = '.' + (name.split('.').pop() || '');
    if (ACCEPTED_EXTS.includes(ext)) return true;

    if (file.type) {
      const mime = file.type.toLowerCase();
      if (ACCEPTED_TYPES.includes(mime)) return true;
      if (mime.startsWith('image/') || mime === 'application/pdf' || mime.includes('word')) return true;
    }
    return false;
  };

  it('accepts standard Desktop PDF and JPEG uploads', () => {
    expect(accepts({ name: 'certificate.pdf', type: 'application/pdf', size: 500000 })).toBe(true);
    expect(accepts({ name: 'degree.jpg', type: 'image/jpeg', size: 750000 })).toBe(true);
    expect(accepts({ name: 'id_card.png', type: 'image/png', size: 900000 })).toBe(true);
  });

  it('accepts Android uploads with non-standard MIME types (image/jpg, image/pjpeg)', () => {
    expect(accepts({ name: 'photo_2026.jpg', type: 'image/jpg', size: 450000 })).toBe(true);
    expect(accepts({ name: 'scan.jpeg', type: 'image/pjpeg', size: 800000 })).toBe(true);
  });

  it('accepts iPhone/iPad camera uploads (HEIC / HEIF format)', () => {
    expect(accepts({ name: 'IMG_4821.HEIC', type: 'image/heic', size: 950000 })).toBe(true);
    expect(accepts({ name: 'IMG_4822.heif', type: 'image/heif', size: 920000 })).toBe(true);
    expect(accepts({ name: 'IMG_4823.heic', type: '', size: 880000 })).toBe(true);
  });

  it('accepts uploads where browser reports empty or generic application/octet-stream MIME', () => {
    expect(accepts({ name: 'WAEC_certificate.pdf', type: 'application/octet-stream', size: 600000 })).toBe(true);
    expect(accepts({ name: 'degree.pdf', type: '', size: 400000 })).toBe(true);
    expect(accepts({ name: 'cert_scan.png', type: 'application/octet-stream', size: 550000 })).toBe(true);
  });

  it('accepts Word documents (.doc and .docx)', () => {
    expect(accepts({ name: 'teaching_credentials.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 300000 })).toBe(true);
    expect(accepts({ name: 'cv_resume.doc', type: 'application/msword', size: 250000 })).toBe(true);
  });

  it('accepts WebP format files', () => {
    expect(accepts({ name: 'certificate_preview.webp', type: 'image/webp', size: 350000 })).toBe(true);
  });

  it('rejects unsafe executable and script files', () => {
    expect(accepts({ name: 'script.exe', type: 'application/x-msdownload', size: 100000 })).toBe(false);
    expect(accepts({ name: 'payload.sh', type: 'application/x-sh', size: 1000 })).toBe(false);
    expect(accepts({ name: 'archive.zip', type: 'application/zip', size: 2000000 })).toBe(false);
    expect(accepts({ name: 'batch.bat', type: 'application/x-bat', size: 500 })).toBe(false);
  });
});
