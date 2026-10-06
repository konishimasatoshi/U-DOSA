# うんち警報器 (Pico 2 W + SGP30 + ブザー)

## 配線

| 部品 | 部品側 | Pico 2 W |
|---|---|---|
| SGP30 | VCC / VIN | 3V3 (36番ピン) |
| SGP30 | GND | GND (38番ピン) |
| SGP30 | SDA | GP4 (6番ピン) |
| SGP30 | SCL | GP5 (7番ピン) |
| アクティブブザー | S8050経由 (Kepler Kitと同じ) | GP15 (20番ピン) |

ブザーまわりは [Kepler Kit 2.10 ブザー](https://docs.sunfounder.com/projects/kepler-kit/ja/latest/pyproject/py_ac_buz.html) と同じです
(GP15 → 1kΩ → S8050のベース、エミッタ → GND、コレクタ → ブザー(-)、ブザー(+) → 3V3)。

## 書き込み

1. Pico 2 W に MicroPython (RPI_PICO2_W 用) を入れる
2. Thonny で `sgp30.py` と `main.py` を Pico に保存する
3. USB電源につなぐと自動で起動する

## 動作

- 起動時に「ピッ」→ LEDが点滅(60秒間ウォームアップ)→「ピピッ」で監視開始(4分間のデータ蓄積後に判定開始)
- SGP30の水素(H2)生信号を監視し、「直近1分のH2生信号平均」が「4分前〜3分前の平均」から閾値(初期値50)以上急激に上昇(低下)したらアラート発報(「ピピピッ」を5秒鳴らす)
- TVOCの内部計算値に頼らないため、TVOCがベースライン狂いで数千ppbになっても誤検知しません
- アラート後は10分間スヌーズ(ブザー停止・LED点滅)。においが残っていても連続発報せず静かに待機
- 10分経過後に監視を再開

## 調整

Thonny のシェル(または「表示 → プロッター」)で値を見ながら `main.py` の上の方にある数値を変えてください。

- 判定は `H2_DELTA_THRESHOLD`(初期値50)
  - 実際のデータ実績:
    - 平常時・誤報時: `dH2 <= 0` (マイナス〜0付近)
    - 軽微なにおい: `dH2 = 70〜90`
    - うんち検知時: `dH2 = 1500〜1800`
  - 誤報が多い → `H2_DELTA_THRESHOLD` を上げる(例: 70〜100)
  - より敏感に検知したい → `H2_DELTA_THRESHOLD` を下げる(例: 30〜40)
- スヌーズ時間 → `SNOOZE_SEC`(初期値600秒 = 10分)

## U-DOSA に記録を送る

警報が鳴ると Supabase に記録が送られ、ブラウザのアプリ U-DOSA([web/](web/))で見られます。

1. 先に [web/README.md](web/README.md) の手順で Supabase にテーブルを作る
2. `config.py` に Wi-Fi の SSID・パスワードと、Supabase の URL・anon キーを入れる
3. `config.py`・`uploader.py` も Pico に保存する

- 検知した時点で記録を作り、においが消えたら「においが続いた時間」と TVOC の最大値・H2 / Ethanol の最大上昇量を書き足します
- Wi-Fi やネットにつながらなくても、警報器はそのまま動きます(記録が送られないだけ)
- config.py は空のままでも動きます
