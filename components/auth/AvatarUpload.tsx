'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

type AvatarUploadProps = {
  onUpload: (url: string) => void;
};

export default function AvatarUpload({ onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('画像を選択してください');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;

      // プレビュー用のURL作成
      setPreview(URL.createObjectURL(file));

      // Supabaseストレージにアップロード
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
        {preview ? (
          <Image
            src={preview}
            alt="Avatar preview"
            className="h-full w-full object-cover"
            width={80}
            height={80}
          />
        ) : (
          <svg
            className="h-full w-full text-gray-300"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
      <div>
        <label
          htmlFor="avatar-upload"
          className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          {uploading ? 'アップロード中...' : 'プロフィール画像を変更'}
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
