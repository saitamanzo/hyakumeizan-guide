import React from 'react';
import type { SavedRecord } from './useClimbRecords';

interface ClimbRecordListProps {
  savedRecords: SavedRecord[];
}

const ClimbRecordList: React.FC<ClimbRecordListProps> = ({ savedRecords }) => {
  if (!savedRecords.length) {
    return <div>記録がありません。</div>;
  }
  return (
    <div>
      {savedRecords.map(record => (
        <div key={record.id} className="border rounded p-2 mb-2">
          <div>日付: {record.date}</div>
          <div>ルート: {record.route}</div>
          <div>難易度: {record.difficulty}</div>
          <div>天気: {record.weather}</div>
          {/* 必要に応じて他の情報も表示 */}
        </div>
      ))}
    </div>
  );
};

export default ClimbRecordList;