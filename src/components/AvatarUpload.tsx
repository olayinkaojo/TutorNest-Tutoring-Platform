import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB — matches the server's limit

interface AvatarUploadProps {
  session: any;
  photoUrl?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Notified with the new URL after a successful upload so the parent can
   *  update its own profile state (and not overwrite it on the next refetch). */
  onUploaded?: (photoUrl: string) => void;
}

export function AvatarUpload({ session, photoUrl: initialPhotoUrl, name, size = 'sm', onUploaded }: AvatarUploadProps) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in sync when the parent supplies a new URL (e.g. after a profile refetch),
  // so the displayed photo doesn't get stuck on a stale value.
  useEffect(() => {
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl]);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ''; // allow re-selecting the same file after a failure
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const ext = '.' + (name.split('.').pop() || '');
    const isImg = file.type ? (file.type.startsWith('image/') || file.type.includes('heic') || file.type.includes('heif')) : ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(ext);
    if (!isImg) {
      toast.error('Please choose a JPG, PNG, WebP or HEIC image.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Photo is too large', { description: 'Please choose an image under 5MB.' });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile/avatar`,
        { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` }, body: form },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.photoUrl) {
          setPhotoUrl(data.photoUrl);
          onUploaded?.(data.photoUrl);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Avatar upload failed:', err);
        toast.error('Photo upload failed', { description: err.error || 'Please try again.' });
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Photo upload failed', { description: 'Check your connection and try again.' });
    } finally {
      setUploading(false);
    }
  };

  const sz = size === 'lg' ? 'w-20 h-20' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  const fs = size === 'lg' ? '22px' : size === 'md' ? '12px' : '10px';

  return (
    <button
      type="button"
      className={`relative cursor-pointer group rounded-full flex-shrink-0 ${sz}`}
      title="Click to change profile photo"
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleFileChange} />
      <Avatar className={`${sz} ring-2 ring-white`}>
        {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" />}
        <AvatarFallback
          style={{ backgroundColor: '#625d9c', color: 'white', fontSize: fs }}
          className="font-semibold"
        >
          {uploading ? '…' : initials}
        </AvatarFallback>
      </Avatar>
      <span className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
        <span className="text-white font-bold" style={{ fontSize: '8px' }}>EDIT</span>
      </span>
    </button>
  );
}
