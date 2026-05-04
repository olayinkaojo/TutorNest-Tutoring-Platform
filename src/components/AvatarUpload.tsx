import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { projectId } from '../utils/supabase/info';

interface AvatarUploadProps {
  session: any;
  photoUrl?: string;
  name: string;
  size?: 'sm' | 'md';
}

export function AvatarUpload({ session, photoUrl: initialPhotoUrl, name, size = 'sm' }: AvatarUploadProps) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    if (!file.type.startsWith('image/')) return;

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
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const sz = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const fs = size === 'sm' ? '10px' : '12px';

  return (
    <button
      type="button"
      className={`relative cursor-pointer group rounded-full flex-shrink-0 ${sz}`}
      title="Click to change profile photo"
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
