import React from 'react';
import type { RecordData } from './useClimbRecords';
import type { UploadedPhoto } from './PhotoUpload';
import Button from './ui/Button';

interface ClimbRecordFormProps {
  record: RecordData;
  setRecord: (r: RecordData) => void;
  onSave: () => void;
  saving: boolean;
  photos: UploadedPhoto[];
  setPhotos: (p: UploadedPhoto[]) => void;
  user: unknown;
  loading: boolean;
  show: boolean;
  onClose: () => void;
}

const ClimbRecordForm: React.FC<ClimbRecordFormProps> = ({
  record,
  setRecord,
  onSave,
  saving,
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
          <Button type="submit" variant="primary" disabled={saving || loading}>
            保存
          </Button>
          <Button type="button" variant="secondary" className="ml-2" onClick={onClose}>
            キャンセル
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ClimbRecordForm;