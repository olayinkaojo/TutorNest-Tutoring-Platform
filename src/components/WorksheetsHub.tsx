import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  BookOpen,
  Lock,
  Crown,
  CheckCircle2,
  Loader2,
  Download,
  Sparkles,
  AlertCircle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { worksheetsAPI, type WorksheetItem, type WorksheetAccess } from '../utils/worksheets-api-client';

const SUBJECTS = ['Maths', 'English', 'Science', '11+ / Common Entrance', 'Jr WAEC/Neco', 'GCSE'];

const YEAR_GROUPS = [
  { value: 'year_1', label: 'Year 1', sub: 'P1' },
  { value: 'year_2', label: 'Year 2', sub: 'P2' },
  { value: 'year_3', label: 'Year 3', sub: 'P3' },
  { value: 'year_4', label: 'Year 4', sub: 'P4' },
  { value: 'year_5', label: 'Year 5', sub: 'P5' },
  { value: 'year_6', label: 'Year 6', sub: 'P6' },
  { value: 'year_7', label: 'Year 7', sub: 'JSS 1' },
  { value: 'year_8', label: 'Year 8', sub: 'JSS 2' },
  { value: 'year_9', label: 'Year 9', sub: 'JSS 3' },
  { value: 'year_10', label: 'Year 10', sub: 'SS 1' },
  { value: 'year_11', label: 'Year 11', sub: 'SS 2' },
  { value: 'year_12', label: 'Year 12', sub: 'SS 3' },
  { value: 'year_13', label: 'Year 13', sub: 'Post-Sec.' },
];

const PURPLE = '#625d9c';
const GREEN = '#5d9827';

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Worksheet';
}

async function downloadBlob(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fall back to just opening the signed link directly — worse (shows the
    // raw storage URL, generic filename) but still gets the file to them.
    console.warn('Blob download failed, falling back to opening the link:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

interface WorksheetsHubProps {
  /** null for an anonymous visitor (public landing page); a real token once signed in. */
  accessToken: string | null;
  userEmail?: string;
  userName?: string;
  onSignUp?: () => void;
  onSignIn?: () => void;
}

type Paywall = { type: 'subscribe' } | { type: 'premium'; worksheet: WorksheetItem } | null;

export function WorksheetsHub({ accessToken, userEmail, userName, onSignUp, onSignIn }: WorksheetsHubProps) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [yearGroup, setYearGroup] = useState<string | null>(null);
  const [items, setItems] = useState<WorksheetItem[]>([]);
  const [access, setAccess] = useState<WorksheetAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<Paywall>(null);
  const [previewItem, setPreviewItem] = useState<WorksheetItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, accessState] = await Promise.all([
        worksheetsAPI.getCatalog(accessToken, subject, yearGroup ?? undefined),
        worksheetsAPI.getMyAccess(accessToken),
      ]);
      setItems(catalog);
      setAccess(accessState);
    } catch (err: any) {
      setError(err.message || 'Could not load worksheets right now.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, subject, yearGroup]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, yearGroup]);

  const freeDownloadsRemaining = access ? Math.max(0, access.freeLimit - access.downloadCount) : 0;

  const handleOpenWorksheet = async (item: WorksheetItem) => {
    if (item.locked) {
      setPaywall(item.lockReason === 'premium' ? { type: 'premium', worksheet: item } : { type: 'subscribe' });
      return;
    }
    setDownloadingId(item.id);
    try {
      const { url, title } = await worksheetsAPI.getFileUrl(accessToken, item.id);
      // Fetched as a Blob and saved via a blob: URL rather than navigating
      // to the signed Storage link directly — otherwise the browser shows
      // our raw Supabase storage domain + access token in the address bar,
      // and the saved file is named after the internal id, not the title.
      await downloadBlob(url, `${sanitizeFilename(title)}.pdf`);
      await refresh(); // counts/locks may have just changed
    } catch (err: any) {
      if (err.status === 401 || err.code === 'signup_required') {
        setPaywall({ type: 'subscribe' });
      } else if (err.status === 402 && err.code === 'purchase_required') {
        setPaywall({ type: 'premium', worksheet: item });
      } else if (err.status === 402) {
        setPaywall({ type: 'subscribe' });
      } else {
        setError(err.message || 'Could not open this worksheet.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <HeroBanner />

      <AccessStrip access={access} freeDownloadsRemaining={freeDownloadsRemaining} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className="rounded-full px-5 py-2 text-sm font-medium transition-colors"
            style={
              subject === s
                ? { backgroundColor: PURPLE, color: '#fff' }
                : { backgroundColor: '#f1f0f7', color: '#44415b' }
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 pb-1 min-w-max">
          {YEAR_GROUPS.map((g) => {
            const selected = yearGroup === g.value;
            return (
              <button
                key={g.value}
                onClick={() => setYearGroup(selected ? null : g.value)}
                className="relative flex flex-col items-center rounded-xl border px-4 py-2.5 text-sm transition-colors min-w-[84px]"
                style={
                  selected
                    ? { borderColor: PURPLE, backgroundColor: '#625d9c12', color: PURPLE }
                    : { borderColor: '#e5e3ef', backgroundColor: '#fff', color: '#44415b' }
                }
              >
                <span className="font-medium">{g.label}</span>
                <span className="text-xs opacity-60">{g.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: PURPLE }} />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{yearGroup ? 'No worksheets here yet — try another year group.' : 'Pick a year group above to see worksheets.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <WorksheetCard
              key={item.id}
              item={item}
              busy={downloadingId === item.id}
              onOpen={() => handleOpenWorksheet(item)}
              onPreview={() => setPreviewItem(item)}
            />
          ))}
        </div>
      )}

      {previewItem && (
        <PreviewDialog
          item={previewItem}
          accessToken={accessToken}
          busy={downloadingId === previewItem.id}
          onClose={() => setPreviewItem(null)}
          onOpen={() => {
            setPreviewItem(null);
            handleOpenWorksheet(previewItem);
          }}
        />
      )}

      {paywall?.type === 'subscribe' && (
        <SubscribeDialog
          accessToken={accessToken}
          userEmail={userEmail}
          userName={userName}
          onSignUp={onSignUp}
          onSignIn={onSignIn}
          onClose={() => setPaywall(null)}
          onSubscribed={() => {
            setPaywall(null);
            refresh();
          }}
        />
      )}

      {paywall?.type === 'premium' && (
        <PremiumPurchaseDialog
          worksheet={paywall.worksheet}
          accessToken={accessToken}
          userEmail={userEmail}
          userName={userName}
          onSignUp={onSignUp}
          onSignIn={onSignIn}
          onClose={() => setPaywall(null)}
          onPurchased={() => {
            setPaywall(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function HeroBanner() {
  return (
    <div
      className="rounded-2xl px-6 py-8 sm:px-10 sm:py-10 text-center"
      style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #8b5cf6 100%)` }}
    >
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl text-white font-semibold">Worksheets</h1>
      <p className="mt-2 text-white/85 text-sm sm:text-base max-w-xl mx-auto">
        Maths &amp; English practice sheets by year group. Try 1 free — no account needed to start.
      </p>
    </div>
  );
}

function AccessStrip({
  access,
  freeDownloadsRemaining,
}: {
  access: WorksheetAccess | null;
  freeDownloadsRemaining: number;
}) {
  if (!access) return null;

  if (access.subscription?.active) {
    return (
      <div className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#d9edd0', backgroundColor: '#f3faee' }}>
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} />
        <span style={{ color: '#2f4a16' }}>
          Subscribed — full access until{' '}
          {new Date(access.subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#e5e3ef', backgroundColor: '#f9f8fc', color: '#44415b' }}>
      <strong>{freeDownloadsRemaining}</strong> of {access.freeLimit} free download{access.freeLimit === 1 ? '' : 's'} left
    </div>
  );
}

function WorksheetCard({
  item,
  busy,
  onOpen,
  onPreview,
}: {
  item: WorksheetItem;
  busy: boolean;
  onOpen: () => void;
  onPreview: () => void;
}) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <button onClick={onPreview} className="block text-left focus:outline-none group relative">
        <div className="aspect-[4/3] relative bg-gray-50 flex items-center justify-center overflow-hidden">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <BookOpen className="w-10 h-10 text-gray-300" />
          )}
          {item.locked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                {item.lockReason === 'premium' ? <Crown className="w-5 h-5 text-amber-600" /> : <Lock className="w-5 h-5" style={{ color: PURPLE }} />}
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white opacity-90 group-hover:opacity-100">
          <ZoomIn className="w-3 h-3" /> Preview
        </div>
      </button>
      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-snug">{item.title}</h3>
          {item.isPremium ? (
            <Badge className="text-xs flex-shrink-0 bg-amber-100 text-amber-800 border-amber-300">
              <Crown className="w-3 h-3 mr-1" /> ₦{item.premiumPrice?.toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs flex-shrink-0">Free</Badge>
          )}
        </div>
        {item.description && <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>}
        <Button
          size="sm"
          onClick={onOpen}
          disabled={busy}
          className="mt-auto w-full text-white"
          style={{ backgroundColor: item.locked ? '#6b7280' : PURPLE }}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : item.locked ? (
            <Lock className="w-3.5 h-3.5 mr-1.5" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5" />
          )}
          {busy ? 'Opening…' : item.locked ? (item.lockReason === 'premium' ? `Unlock — ₦${item.premiumPrice?.toLocaleString()}` : 'Unlock') : 'Download'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PreviewDialog({
  item,
  accessToken,
  busy,
  onClose,
  onOpen,
}: {
  item: WorksheetItem;
  accessToken: string | null;
  busy: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [pages, setPages] = useState<string[] | null>(null); // null = still loading
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setPageIndex(0);
    worksheetsAPI
      .getPreviewPages(accessToken, item.id)
      .then((p) => {
        if (!cancelled) setPages(p);
      })
      .catch(() => {
        if (!cancelled) setPages([]); // falls back to the single cover thumbnail below
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, accessToken]);

  const actionLabel = item.locked
    ? item.lockReason === 'premium'
      ? `Unlock — ₦${item.premiumPrice?.toLocaleString()}`
      : 'Unlock'
    : 'Download';

  const multiPage = !!pages && pages.length > 1;
  const currentImage = pages && pages.length ? pages[pageIndex] : item.thumbnailUrl;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription className="sr-only">Preview of this worksheet's early pages.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline">{item.subject}</Badge>
          {item.isPremium ? (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              <Crown className="w-3 h-3 mr-1" /> ₦{item.premiumPrice?.toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
        </div>

        <div className="relative rounded-lg overflow-hidden border bg-gray-50 max-h-[60vh] min-h-[200px] flex items-center justify-center">
          {pages === null ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : currentImage ? (
            <img src={currentImage} alt={`${item.title} — page ${pageIndex + 1} preview`} className="w-full h-auto object-contain" />
          ) : (
            <div className="py-20 text-gray-400 text-sm">No preview image available yet.</div>
          )}

          {multiPage && (
            <>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: PURPLE }} />
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages!.length - 1, i + 1))}
                disabled={pageIndex === pages!.length - 1}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" style={{ color: PURPLE }} />
              </button>
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
                Page {pageIndex + 1} of {pages!.length}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 -mt-1">
          {multiPage
            ? `These are the worksheet's actual first ${pages!.length} pages — the rest is inside.`
            : 'This is the worksheet\'s actual cover page — the rest is inside.'}
        </p>

        {item.description && <p className="text-sm text-gray-600">{item.description}</p>}

        <Button onClick={onOpen} disabled={busy} className="w-full h-11 text-white" style={{ backgroundColor: item.locked ? '#6b7280' : PURPLE }}>
          {busy ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : item.locked ? (
            <Lock className="w-4 h-4 mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {busy ? 'Opening…' : actionLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function flutterwavePublicKey(): string {
  // @ts-ignore
  return (
    (import.meta as any).env?.VITE_FLUTTERWAVE_PUBLIC_KEY ||
    'FLWPUBK_TEST-faf29eb495805d5a046cac66366b2eae-X'
  );
}

function openFlutterwave(opts: {
  amount: number;
  reference: string;
  email: string;
  name: string;
  title: string;
  description: string;
  onSuccess: (txRef: string) => void;
  onClose: () => void;
}) {
  // @ts-ignore — loaded via <script> in index.html
  const modal = window.FlutterwaveCheckout({
    public_key: flutterwavePublicKey(),
    tx_ref: opts.reference,
    amount: opts.amount,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd,mobilemoney',
    customer: { email: opts.email, name: opts.name },
    customizations: {
      title: opts.title,
      description: opts.description,
      logo: 'https://app.knowledgefonsacademy.com/Logo.png',
    },
    callback: (response: { status: string; tx_ref: string }) => {
      try { modal?.close?.(); } catch (_) {}
      const frame = document.querySelector('#flwpugpaidiv') as HTMLElement | null;
      if (frame) frame.style.display = 'none';
      if (response.status === 'successful' || response.status === 'completed') {
        opts.onSuccess(response.tx_ref);
      } else {
        opts.onClose();
      }
    },
    onclose: () => opts.onClose(),
  });
}

function SubscribeDialog({
  accessToken,
  userEmail,
  userName,
  onSignUp,
  onSignIn,
  onClose,
  onSubscribed,
}: {
  accessToken: string | null;
  userEmail?: string;
  userName?: string;
  onSignUp?: () => void;
  onSignIn?: () => void;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subscribe = async () => {
    if (!accessToken) return;
    setPaying(true);
    setErr(null);
    try {
      const { reference, amount } = await worksheetsAPI.initiateSubscription(accessToken);
      openFlutterwave({
        amount,
        reference,
        email: userEmail || '',
        name: userName || 'Parent',
        title: 'Knowledge Fons Academy',
        description: 'Worksheets subscription — monthly',
        onSuccess: async (txRef) => {
          try {
            await worksheetsAPI.confirmSubscription(accessToken, txRef);
            onSubscribed();
          } catch (e: any) {
            setErr(e.message || 'Payment went through, but we could not confirm it — contact support.');
          } finally {
            setPaying(false);
          }
        },
        onClose: () => setPaying(false),
      });
    } catch (e: any) {
      setErr(e.message || 'Could not start checkout');
      setPaying(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#625d9c15' }}>
              <Sparkles className="w-6 h-6" style={{ color: PURPLE }} />
            </div>
          </div>
          <DialogTitle className="text-center">You've reached the free limit</DialogTitle>
          <DialogDescription className="text-center">
            Subscribe for ₦15,000/month to unlock every year group and worksheet (premium pay-to-own items are separate).
          </DialogDescription>
        </DialogHeader>

        {err && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        {accessToken ? (
          <Button onClick={subscribe} disabled={paying} className="w-full h-12 text-white" style={{ backgroundColor: PURPLE }}>
            {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Subscribe — ₦15,000/month
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={onSignUp} className="w-full h-12 text-white" style={{ backgroundColor: GREEN }}>
              Sign up to continue
            </Button>
            <button onClick={onSignIn} className="w-full text-center text-sm hover:underline" style={{ color: PURPLE }}>
              Already have an account? Sign in
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PremiumPurchaseDialog({
  worksheet,
  accessToken,
  userEmail,
  userName,
  onSignUp,
  onSignIn,
  onClose,
  onPurchased,
}: {
  worksheet: WorksheetItem;
  accessToken: string | null;
  userEmail?: string;
  userName?: string;
  onSignUp?: () => void;
  onSignIn?: () => void;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const purchase = async () => {
    if (!accessToken) return;
    setPaying(true);
    setErr(null);
    try {
      const { reference, amount, title } = await worksheetsAPI.initiatePurchase(accessToken, worksheet.id);
      openFlutterwave({
        amount,
        reference,
        email: userEmail || '',
        name: userName || 'Parent',
        title: 'Knowledge Fons Academy',
        description: `Worksheet — ${title}`,
        onSuccess: async (txRef) => {
          try {
            await worksheetsAPI.confirmPurchase(accessToken, txRef);
            onPurchased();
          } catch (e: any) {
            setErr(e.message || 'Payment went through, but we could not confirm it — contact support.');
          } finally {
            setPaying(false);
          }
        },
        onClose: () => setPaying(false),
      });
    } catch (e: any) {
      setErr(e.message || 'Could not start checkout');
      setPaying(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center">{worksheet.title}</DialogTitle>
          <DialogDescription className="text-center">
            This is a premium worksheet — a one-time ₦{worksheet.premiumPrice?.toLocaleString()} purchase unlocks it permanently, subscribed or not.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        {accessToken ? (
          <Button onClick={purchase} disabled={paying} className="w-full h-12 text-white" style={{ backgroundColor: '#b8791f' }}>
            {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Pay ₦{worksheet.premiumPrice?.toLocaleString()} to unlock
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={onSignUp} className="w-full h-12 text-white" style={{ backgroundColor: GREEN }}>
              Sign up to purchase
            </Button>
            <button onClick={onSignIn} className="w-full text-center text-sm hover:underline" style={{ color: PURPLE }}>
              Already have an account? Sign in
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
