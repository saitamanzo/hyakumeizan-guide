import React from 'react';

export default function AdminRelatedMediaPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Related Media 管理</h1>
      <div className="mb-6">
        <p className="text-sm text-gray-600">このページでは内部ライブラリの一覧確認と手動追加ができます（簡易実装）。</p>
      </div>
      <div id="related-media-admin-root"></div>
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          const root = document.getElementById('related-media-admin-root');
          if(!root) return;
          // client-side app is loaded from /admin/related-media.js if present
          const s = document.createElement('script');
          s.src = '/admin/related-media.js';
          document.body.appendChild(s);
        })();
      `}} />
    </div>
  );
}
