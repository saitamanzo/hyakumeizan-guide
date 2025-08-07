import { useState, useCallback } from 'react';
import { getUserClimbRecords } from '@/lib/climb-utils';
import { getClimbPhotos } from '@/lib/photo-utils';
import type { ClimbPhoto } from '@/lib/photo-utils';
import type { UploadedPhoto } from './PhotoUpload';
import { createClient } from '../lib/supabase/client';

export interface RecordData {
  date: string;
  route: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  weather: string;
  companions: string;
  notes: string;
  rating: number;
}

export interface SavedRecord extends RecordData {
  id: string;
  mountainId: string;
  mountainName: string;
  userId: string;
  createdAt: string;
  photos?: ClimbPhoto[];
  thumbnailUrl?: string;
}

export function useClimbRecords(mountainId: string, user: { id: string } | null, mountainName: string) {
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSavedRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const records = await getUserClimbRecords(user.id);
      const mountainRecords = records.filter(record => record.mountain_id === mountainId);
      const supabase = createClient();
      const convertedRecords: SavedRecord[] = await Promise.all(
        mountainRecords
          .filter(record => record.id && record.created_at)
          .map(async (record) => {
            const photos = await getClimbPhotos(record.id!);
            const thumbnailUrl = photos.length > 0 && photos[0].thumbnail_path
              ? supabase.storage.from('climb-photos').getPublicUrl(photos[0].thumbnail_path).data.publicUrl
              : undefined;
            return {
              id: record.id!,
              mountainId: record.mountain_id,
              mountainName: record.mountain_name || mountainName,
              userId: record.user_id,
              date: record.climb_date ?? '',
              route: '一般ルート',
              duration: '記録なし',
              difficulty: record.difficulty_rating === 1 ? 'easy' : record.difficulty_rating === 3 ? 'moderate' : 'hard',
              weather: record.weather_conditions || '晴れ',
              companions: '記録なし',
              notes: record.notes || '',
              rating: 5,
              createdAt: record.created_at!,
              photos: photos,
              thumbnailUrl: thumbnailUrl
            };
          })
      );
      setSavedRecords(convertedRecords);
    } catch (error) {
      setSavedRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user, mountainId, mountainName]);

  return {
    savedRecords,
    loadSavedRecords,
    loading,
    setSavedRecords,
  };
}
