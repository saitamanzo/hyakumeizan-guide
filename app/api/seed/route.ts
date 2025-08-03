import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const sampleMountains = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: '富士山',
    name_kana: 'フジサン',
    elevation: 3776,
    location: '静岡県と山梨県の境',
    prefecture: '静岡県・山梨県',
    description: '日本最高峰。世界文化遺産に登録されており、年間約30万人が登山する。',
    best_season: '7月～9月上旬',
    difficulty_level: '中級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: '北岳',
    name_kana: 'キタダケ',
    elevation: 3193,
    location: '山梨県南アルプス市',
    prefecture: '山梨県',
    description: '日本第2位の高峰。南アルプスの盟主として親しまれている。',
    best_season: '7月～9月',
    difficulty_level: '上級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: '奥穂高岳',
    name_kana: 'オクホタカダケ',
    elevation: 3190,
    location: '長野県と岐阜県の境',
    prefecture: '長野県・岐阜県',
    description: '日本第3位の高峰。穂高連峰の最高峰で、岩稜歩きが楽しめる。',
    best_season: '7月～9月',
    difficulty_level: '上級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: '立山',
    name_kana: 'タテヤマ',
    elevation: 3015,
    location: '富山県立山町',
    prefecture: '富山県',
    description: '立山三山の一つ。雄山、大汝山、富士ノ折立の総称。',
    best_season: '7月～9月',
    difficulty_level: '中級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: '剱岳',
    name_kana: 'ツルギダケ',
    elevation: 2999,
    location: '富山県立山町',
    prefecture: '富山県',
    description: '日本屈指の岩峰。別山尾根コースが一般的だが技術が必要。',
    best_season: '7月～9月',
    difficulty_level: '上級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: '白馬岳',
    name_kana: 'シロウマダケ',
    elevation: 2932,
    location: '長野県と富山県の境',
    prefecture: '長野県・富山県',
    description: '大雪渓で有名。高山植物の宝庫として知られる。',
    best_season: '7月～9月',
    difficulty_level: '中級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: '槍ヶ岳',
    name_kana: 'ヤリガタケ',
    elevation: 3180,
    location: '長野県と岐阜県の境',
    prefecture: '長野県・岐阜県',
    description: '日本のマッターホルンと呼ばれる美しい山容。',
    best_season: '7月～9月',
    difficulty_level: '上級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: '八ヶ岳',
    name_kana: 'ヤツガタケ',
    elevation: 2899,
    location: '長野県と山梨県の境',
    prefecture: '長野県・山梨県',
    description: '赤岳を主峰とする連峰。初心者から上級者まで楽しめる。',
    best_season: '6月～10月',
    difficulty_level: '中級'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: '大菩薩嶺',
    name_kana: 'ダイボサツレイ',
    elevation: 2057,
    location: '山梨県甲州市・丹波山村',
    prefecture: '山梨県',
    description: '初心者にも人気の山。大菩薩峠からの眺望が素晴らしい。',
    best_season: '4月～11月',
    difficulty_level: '初級'
  },
  {
    id: '550e8400-e29b-41d4-a716-44665544000a',
    name: '筑波山',
    name_kana: 'ツクバサン',
    elevation: 877,
    location: '茨城県つくば市',
    prefecture: '茨城県',
    description: '西の富士、東の筑波と称される。関東平野を一望できる。',
    best_season: '通年',
    difficulty_level: '初級'
  }
];

const sampleRoutes = [
  {
    id: '650e8400-e29b-41d4-a716-446655440001',
    mountain_id: '550e8400-e29b-41d4-a716-446655440001',
    name: '吉田ルート',
    description: '最も人気の高いルート。山小屋や救護所が充実しており、初心者におすすめ。',
    distance: 7.5,
    elevation_gain: 1450,
    estimated_time: 360,
    difficulty_level: '中級',
    starting_point: '富士スバルライン五合目',
    trail_head_access: 'JR新宿駅から高速バスで河口湖駅、そこからバスで五合目へ'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440002',
    mountain_id: '550e8400-e29b-41d4-a716-446655440001',
    name: '富士宮ルート',
    description: '最短距離で山頂に到達できるルート。急登が多く体力が必要。',
    distance: 5.0,
    elevation_gain: 1330,
    estimated_time: 300,
    difficulty_level: '中級',
    starting_point: '富士宮口五合目',
    trail_head_access: 'JR新富士駅からバスで富士宮口五合目へ'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440003',
    mountain_id: '550e8400-e29b-41d4-a716-446655440002',
    name: '白根御池小屋経由',
    description: '最も一般的なルート。白根御池小屋で一泊するのが基本。',
    distance: 12.0,
    elevation_gain: 1400,
    estimated_time: 540,
    difficulty_level: '上級',
    starting_point: '広河原',
    trail_head_access: 'JR甲府駅からバスで広河原へ（夏季のみ運行）'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440004',
    mountain_id: '550e8400-e29b-41d4-a716-446655440009',
    name: '上日川峠ルート',
    description: '最も楽なルート。大菩薩峠まで稜線歩きが楽しめる。',
    distance: 6.0,
    elevation_gain: 300,
    estimated_time: 240,
    difficulty_level: '初級',
    starting_point: '上日川峠',
    trail_head_access: 'JR甲斐大和駅からバスで上日川峠へ'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440005',
    mountain_id: '550e8400-e29b-41d4-a716-44665544000a',
    name: '御幸ヶ原コース',
    description: 'ケーブルカー利用で山頂駅から徒歩。最も楽なルート。',
    distance: 1.0,
    elevation_gain: 200,
    estimated_time: 60,
    difficulty_level: '初級',
    starting_point: '筑波山神社',
    trail_head_access: 'つくばエクスプレスつくば駅からバスで筑波山神社入口へ'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440006',
    mountain_id: '550e8400-e29b-41d4-a716-44665544000a',
    name: '白雲橋コース',
    description: '自然研究路を歩く登山コース。様々な植物を観察できる。',
    distance: 2.8,
    elevation_gain: 610,
    estimated_time: 120,
    difficulty_level: '初級',
    starting_point: '筑波山神社',
    trail_head_access: 'つくばエクスプレスつくば駅からバスで筑波山神社入口へ'
  }
];

export async function POST() {
  try {
    const supabase = await createClient();
    
    console.log('Inserting sample mountains...');
    const { error: mountainError } = await supabase
      .from('mountains')
      .insert(sampleMountains);
    
    if (mountainError) {
      console.error('Error inserting mountains:', mountainError);
      return NextResponse.json({ error: 'Failed to insert mountains' }, { status: 500 });
    }
    
    console.log('Mountains inserted successfully');
    
    console.log('Inserting sample routes...');
    const { error: routeError } = await supabase
      .from('routes')
      .insert(sampleRoutes);
    
    if (routeError) {
      console.error('Error inserting routes:', routeError);
      return NextResponse.json({ error: 'Failed to insert routes' }, { status: 500 });
    }
    
    console.log('Routes inserted successfully');

    // サンプルレビューも挿入
    const sampleReviews = [
      {
        id: '750e8400-e29b-41d4-a716-446655440001',
        user_id: '00000000-0000-0000-0000-000000000001', // ダミーユーザーID
        mountain_id: '550e8400-e29b-41d4-a716-446655440001', // 富士山
        rating: 5,
        content: '素晴らしい山でした！登頂からの眺めは言葉では表現できないほど美しく、一生の思い出になりました。',
        created_at: new Date().toISOString()
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440002',
        user_id: '00000000-0000-0000-0000-000000000002', // ダミーユーザーID
        mountain_id: '550e8400-e29b-41d4-a716-446655440001', // 富士山
        rating: 4,
        content: '天候に恵まれて良い登山ができました。ただし、夏場は非常に混雑するので、早めの出発をお勧めします。',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1日前
      }
    ];

    console.log('Inserting sample reviews...');
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert(sampleReviews);
    
    if (reviewError) {
      console.log('Review insertion failed (expected if no auth users exist):', reviewError);
    } else {
      console.log('Reviews inserted successfully');
    }
    
    return NextResponse.json({ 
      message: 'Sample data inserted successfully',
      mountains: sampleMountains.length,
      routes: sampleRoutes.length,
      reviews: sampleReviews.length
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}
