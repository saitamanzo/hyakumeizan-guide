'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

interface ReviewSectionProps {
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    created_at: string;
    users?: { display_name: string | null };
  }>;
  mountainId: string;
}

export default function ReviewSection({ reviews, mountainId }: ReviewSectionProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const router = useRouter();

  const handleReviewAdded = () => {
    setShowReviewForm(false);
    router.refresh(); // ページを再読み込みして最新のレビューを取得
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">レビュー</h2>
        <button 
          onClick={() => setShowReviewForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          レビューを書く
        </button>
      </div>
      
      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {review.users?.display_name || '匿名ユーザー'}
                  </p>
                  <div className="mt-1 flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 15.585l-6.328 3.326 1.209-7.043L.342 7.538l7.057-1.026L10 0l2.601 6.512 7.057 1.026-4.539 4.33 1.209 7.043L10 15.585z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <p className="mt-4 text-base text-gray-900">{review.content}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">
            まだレビューがありません。最初のレビューを投稿してみませんか？
          </p>
        )}
      </div>

      {/* レビューフォーム */}
      {showReviewForm && (
        <ReviewForm
          mountainId={mountainId}
          onClose={() => setShowReviewForm(false)}
          onReviewAdded={handleReviewAdded}
        />
      )}
    </div>
  );
}
