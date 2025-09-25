'use client';

interface MapClickHandlerProps {
  onLocationChange?: (lat: number, lng: number, locationName?: string, elevation?: number) => void;
  enableLocationChange?: boolean;
  setClickedPosition?: (pos: [number, number] | null) => void;
  setIsLoading?: (loading: boolean) => void;
}

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';

// Leafletのデフォルトマーカーアイコンの修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MountainMapProps {
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation: number;
  onLocationChange?: (lat: number, lng: number) => void;
  enableLocationChange?: boolean;
}

// マップの中心を更新するためのコンポーネント
// MapCenterコンポーネント（マップの中心を更新）
function MapCenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([latitude, longitude]);
  }, [map, latitude, longitude]);
  
  return null;
}

// マップクリックハンドラーコンポーネント（改良版）
function MapClickHandler({ 
  onLocationChange,
  enableLocationChange,
  setClickedPosition,
  setIsLoading
  }: MapClickHandlerProps) {
  const map = useMap();
  useEffect(() => {
    if (!enableLocationChange) return;
  const handleClick = (e: LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
  setClickedPosition?.([lat, lng]);
      if (onLocationChange) onLocationChange(lat, lng);
      if (setIsLoading) setIsLoading(false);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, enableLocationChange, setClickedPosition, onLocationChange, setIsLoading]);
  return null;
}

export default function MountainMap(props: MountainMapProps) {
  const {
    latitude,
    longitude,
    mountainName,
    elevation,
    onLocationChange,
    enableLocationChange
  } = props;
  // enableLocationChange がundefinedの場合はtrue扱い
  const effectiveEnableLocationChange = enableLocationChange !== false;
  const spots = [
    { type: 'onsen', name: '白馬八方温泉', lat: 36.697, lng: 137.837 },
    { type: 'parking', name: '富士山五合目駐車場', lat: 35.3606, lng: 138.7274 },
    { type: 'mountain', name: '槍ヶ岳', lat: 36.3414, lng: 137.6461 },
    { type: 'hotel', name: '上高地ホテル', lat: 36.235, lng: 137.634 },
    { type: 'camp', name: '涸沢キャンプ場', lat: 36.282, lng: 137.711 },
  ];

  // アイコン定義（重複排除）
  const iconUrls: Record<string, string> = {
    onsen: 'https://cdn-icons-png.flaticon.com/128/2933/2933186.png',
    parking: 'https://cdn-icons-png.flaticon.com/128/854/854878.png',
    mountain: 'https://cdn-icons-png.flaticon.com/128/684/684908.png',
    hotel: 'https://cdn-icons-png.flaticon.com/128/235/235861.png',
    camp: 'https://cdn-icons-png.flaticon.com/128/190/190411.png',
  };

  // アイコン生成関数（重複排除）
  const getSpotIcon = (type: string) => new L.Icon({
    iconUrl: iconUrls[type] || iconUrls['mountain'],
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const [mounted, setMounted] = useState(false);
  const [clickedPosition, setClickedPosition] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // サーバーサイドレンダリング中は何も表示しない
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-gray-500">地図を読み込み中...</div>
        </div>
      </div>
    );
  }

  // カスタム山マーカーアイコン
  const mountainIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" width="32" height="32">
        <path d="M14,6L10.25,11L13.1,14.8L11.5,16C9.81,13.75 7,10 7,10L1,20H23L14,6Z" />
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          位置情報
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          緯度: {latitude.toFixed(6)}, 経度: {longitude.toFixed(6)}
        </p>
      </div>
      
      <div className="relative h-64">
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0 custom-cursor-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution={process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "© OpenStreetMap contributors"}
          />
          <Marker position={[latitude, longitude]} icon={mountainIcon}>
            <Popup>
              <div className="text-center">
                <h4 className="font-semibold text-lg">{mountainName}</h4>
                <p className="text-sm text-gray-600">標高: {elevation}m</p>
                <p className="text-xs text-gray-500 mt-1">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
          {/* スポットマーカー表示 */}
          {spots.map((spot, idx) => (
            <Marker key={spot.type + '-' + idx} position={[spot.lat, spot.lng]} icon={getSpotIcon(spot.type)}>
              <Popup>
                <strong>{spot.name}</strong><br />
                種別: {spot.type}
              </Popup>
            </Marker>
          ))}
          {clickedPosition && effectiveEnableLocationChange && (
            <Marker position={clickedPosition} icon={new L.Icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" width="24" height="24">
                  <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                </svg>
              `),
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -12],
            })}>
              <Popup>
                <div className="text-center">
                  <h5 className="font-medium">選択した地点</h5>
                  <p className="text-xs text-gray-500">
                    {clickedPosition[0].toFixed(6)}, {clickedPosition[1].toFixed(6)}
                  </p>
                  {isLoading && <p className="text-xs text-blue-500 mt-1">天気を取得中...</p>}
                </div>
              </Popup>
            </Marker>
          )}
          <MapCenter latitude={latitude} longitude={longitude} />
          {enableLocationChange && (
            <MapClickHandler 
              onLocationChange={onLocationChange}
              enableLocationChange={enableLocationChange}
              setClickedPosition={setClickedPosition}
              setIsLoading={setIsLoading}
            />
          )}
        </MapContainer>
      </div>
      {/* 地図操作のヒント */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>🖱️ ドラッグで移動</span>
            <span>🔍 ズームイン/アウト</span>
            {enableLocationChange && <span>📍 クリックで天気予報を変更</span>}
          </div>
          <button 
            onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Google Mapsで開く →
          </button>
        </div>
      </div>
    </div>
  );
}
