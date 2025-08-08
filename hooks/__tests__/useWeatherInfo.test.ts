import { renderHook, act } from '@testing-library/react-hooks';
import { useWeatherInfo } from '../useWeatherInfo';

describe('useWeatherInfo', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useWeatherInfo({ latitude: 35.0, longitude: 138.0, mountainName: '富士山' }));
    expect(result.current.loading).toBe(true);
    expect(result.current.weather).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // APIモックや詳細テストは本番環境に合わせて追加
});
