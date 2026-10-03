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

- 起動時に「ピッ」→ LEDが点滅(60秒間ウォームアップ)→「ピピッ」で監視開始
- においが急に増えて10秒続くと「ピピピッ」を5秒鳴らす
- 鳴り終わると自動で10分間スヌーズ(LEDは点滅)。においが残っていればまた5秒鳴る
- においが60秒消えると自動で解除

## 調整

Thonny のシェル(または「表示 → プロッター」)で値を見ながら `main.py` の上の方にある数値を変えてください。

- 判定は TVOC(5秒平均)が `TVOC_THRESHOLD`(70ppb)以上の状態が `HOLD_SEC` 秒続いたとき
- 誤報が多い → `TVOC_THRESHOLD` を上げる、`HOLD_SEC` を長くする
- 気づいてくれない → それらを下げる、センサーを赤ちゃんに近づける

## U-DOSA に記録を送る

警報が鳴ると Supabase に記録が送られ、ブラウザのアプリ U-DOSA([web/](web/))で見られます。

1. 先に [web/README.md](web/README.md) の手順で Supabase にテーブルを作る
2. `config.py` に Wi-Fi の SSID・パスワードと、Supabase の URL・anon キーを入れる
3. `config.py`・`uploader.py` も Pico に保存する

- 検知した時点で記録を作り、においが消えたら「においが続いた時間」と TVOC の最大値・H2 / Ethanol の最大上昇量を書き足します
- Wi-Fi やネットにつながらなくても、警報器はそのまま動きます(記録が送られないだけ)
- config.py は空のままでも動きます
