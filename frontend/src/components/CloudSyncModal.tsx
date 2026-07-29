import React, { useState } from 'react';
import { 
  X, 
  CloudCheck, 
  Laptop, 
  Tablet, 
  Smartphone, 
  HardDrive, 
  RefreshCw, 
  Download, 
  Upload, 
  ShieldCheck, 
  Check 
} from 'lucide-react';
import { SyncStatus, DeviceInfo } from '../types';

interface CloudSyncModalProps {
  syncStatus: SyncStatus;
  devices: DeviceInfo[];
  onTriggerSync: () => void;
  onClose: () => void;
  onExportBackupJson: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  syncStatus,
  devices,
  onTriggerSync,
  onClose,
  onExportBackupJson,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = () => {
    setIsSyncing(true);
    onTriggerSync();
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const getDeviceIcon = (type: DeviceInfo['type']) => {
    switch (type) {
      case 'desktop': return <Laptop className="w-4 h-4 text-indigo-600" />;
      case 'tablet': return <Tablet className="w-4 h-4 text-purple-600" />;
      case 'mobile': return <Smartphone className="w-4 h-4 text-emerald-600" />;
    }
  };

  const storagePercent = Math.min(100, Math.round((syncStatus.storageUsedMb / syncStatus.storageLimitMb) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Đồng bộ Đám mây Đa nền tảng</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Banner */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CloudCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-emerald-950">
                  Tài liệu & Trích dẫn của bạn đã được sao lưu
                </h4>
                <p className="text-xs text-emerald-800">
                  Đồng bộ lần cuối: {new Date(syncStatus.lastSynced).toLocaleTimeString('vi-VN')} ({new Date(syncStatus.lastSynced).toLocaleDateString('vi-VN')})
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
            </button>
          </div>

          {/* Storage Quota Gauge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span>Dung lượng lưu trữ Đám mây Nghiên cứu</span>
              </span>
              <span className="font-mono text-slate-600">
                {syncStatus.storageUsedMb} MB / {syncStatus.storageLimitMb / 1000} GB ({storagePercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>

          {/* Connected Devices List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thiết bị Đã kết nối ({devices.length})
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {devices.map((dev) => (
                <div key={dev.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      {getDeviceIcon(dev.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{dev.name}</span>
                        {dev.current && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-800 rounded">
                            Thiết bị này
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Hoạt động: {dev.lastActive} • {dev.location}
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Sẵn sàng</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Backup & Data Controls */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Bạn cũng có thể xuất sao lưu dữ liệu cục bộ dưới dạng tệp JSON.
            </div>
            <button
              onClick={onExportBackupJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải sao lưu JSON</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            Hoàn tất
          </button>
        </div>

      </div>
    </div>
  );
};
