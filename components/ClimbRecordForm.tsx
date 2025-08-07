import React from 'react';
import type { RecordData } from './useClimbRecords';

interface ClimbRecordFormProps {
  record: RecordData;
  setRecord: (r: RecordData) => void;
  onSave: () => void;
  saving: boolean;
  photos: any[];
  setPhotos: (p: any[]) => void;
  user: any;
  loading: boolean;
  show: boolean;
  onClose: () => void;
}

const ClimbRecordForm: React.FC<ClimbRecordFormProps> = ({
  record,
  setRecord,
  onSave,
  saving,
  photos,
  setPhotos,
  user,
  loading,
  show,
  onClose
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">登山記録を追加</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(); }}>
          <input
            type="date"
            value={record.date}
            onChange={e => setRecord({ ...record, date: e.target.value })}
            className="border p-1 mb-2 w-full"
            required
          />
          {/* 他の入力項目もここに追加 */}
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={saving || loading}>
            保存
          </button>
          <button type="button" className="ml-2" onClick={onClose}>キャンセル</button>
        </form>
      </div>
    </div>
  );
};

export default ClimbRecordForm;