/**
 * Renders a PDF's first page to an image client-side (pdf.js), used so
 * admin never has to separately design/export a thumbnail image — the
 * worksheet's own cover page IS the thumbnail, generated automatically
 * whenever a PDF is uploaded or retroactively regenerated for one that
 * doesn't have one yet.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Vite resolves this npm-package worker file to a real asset URL at build
// time (its documented pattern for bundling a dependency's own worker file)
// rather than needing a CDN script or a copied-in public/ file.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export async function renderPdfFirstPageThumbnail(source: File | Blob, maxWidth = 640): Promise<Blob> {
  const arrayBuffer = await source.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  try {
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = maxWidth / unscaled.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a canvas context');

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not generate a thumbnail image'))),
        'image/jpeg',
        0.85,
      );
    });
  } finally {
    // If rendering already failed (e.g. the worker crashed), destroy() can
    // itself throw — and a throw in `finally` silently replaces whatever
    // real error we were about to propagate. Never let cleanup mask that.
    await pdf.destroy().catch(() => {});
  }
}
