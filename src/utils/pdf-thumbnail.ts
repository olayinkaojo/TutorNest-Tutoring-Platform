/**
 * Renders a PDF's pages to images client-side (pdf.js), used so admin never
 * has to separately design/export preview art — the worksheet's own pages
 * ARE the preview, generated automatically whenever a PDF is uploaded or
 * retroactively regenerated for one that doesn't have one yet. The single
 * cover thumbnail (used in the catalog grid) and the multi-page preview
 * (used in the "look before you download" dialog) are both just this
 * render, called with a page count of 1 or more.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Vite resolves this npm-package worker file to a real asset URL at build
// time (its documented pattern for bundling a dependency's own worker file)
// rather than needing a CDN script or a copied-in public/ file.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

async function renderPage(pdf: any, pageNumber: number, maxWidth: number): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);
  const unscaled = page.getViewport({ scale: 1 });
  const scale = maxWidth / unscaled.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas context');

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not generate a preview image'))),
      'image/jpeg',
      0.85,
    );
  });

  // Mobile Safari in particular caps total canvas backing-store memory per
  // tab; rendering several full-size pages back-to-back without releasing
  // each canvas's backing store is a known way to hit that ceiling and crash
  // the renderer mid-set. Zeroing the dimensions frees it immediately rather
  // than waiting on GC.
  canvas.width = 0;
  canvas.height = 0;

  return blob;
}

export async function renderPdfFirstPageThumbnail(source: File | Blob, maxWidth = 640): Promise<Blob> {
  const arrayBuffer = await source.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  try {
    return await renderPage(pdf, 1, maxWidth);
  } finally {
    // If rendering already failed (e.g. the worker crashed), destroy() can
    // itself throw — and a throw in `finally` silently replaces whatever
    // real error we were about to propagate. Never let cleanup mask that.
    await pdf.destroy().catch(() => {});
  }
}

/**
 * Renders up to `pageCount` pages (fewer if the PDF is shorter) in order.
 * Best-effort per page: if one page fails to render, earlier successes are
 * still returned rather than failing the whole set — a partial preview
 * beats none.
 */
export async function renderPdfPagesPreview(source: File | Blob, pageCount: number, maxWidth = 480): Promise<Blob[]> {
  const arrayBuffer = await source.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const blobs: Blob[] = [];
  try {
    const count = Math.min(pageCount, pdf.numPages);
    for (let i = 1; i <= count; i++) {
      try {
        blobs.push(await renderPage(pdf, i, maxWidth));
        // Yield a frame between pages so the browser gets a chance to
        // actually reclaim the canvas memory just freed above, instead of
        // immediately piling the next page's allocation on top of it.
        await new Promise((resolve) => requestAnimationFrame(resolve));
      } catch (err) {
        console.warn(`Could not render preview page ${i}:`, err);
        break;
      }
    }
  } finally {
    await pdf.destroy().catch(() => {});
  }
  return blobs;
}
