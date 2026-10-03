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

- 誤報が多い → `H2_RISE` や `ETH_RISE` を上げる、`HOLD_SEC` を長くする
- 気づいてくれない → それらを下げる、センサーを赤ちゃんに近づける
