# うんち警報器  Raspberry Pi Pico 2 W + SGP30 + アクティブブザー
#
# 考え方:
#   SGP30 の生信号(H2 / Ethanol)は、ガスが増えると値が「下がる」。
#   部屋のいつもの値をベースラインとしてゆっくり学習し、
#   そこから一定以上下がった状態が続いたら「うんち!」と判定してブザーを鳴らす。
#   ブザーは5秒鳴ったら自動でスヌーズ。においが残っていればスヌーズ明けにまた鳴る。
#   においが消えると自動で解除。
from machine import Pin, I2C
import time
from sgp30 import SGP30

# ===== 調整用の設定 =====
WARMUP_SEC = 60       # 起動直後のウォームアップ(センサーが安定するまで判定しない)
H2_RISE = 30          # H2 がベースラインから何カウント上がったら「におう」とするか
ETH_RISE = 80         # Ethanol がベースラインから何カウント上がったら「におう」とするか
AVG_SEC = 5           # 何秒分の平均で判定するか(ノイズよけ)
HOLD_SEC = 10         # 「におう」が何秒続いたら警報を出すか(息などの一瞬の変化よけ)
CLEAR_SEC = 60        # 「におわない」が何秒続いたら警報を解除するか
ALARM_SEC = 5         # 警報で何秒間ブザーを鳴らすか
SNOOZE_SEC = 600      # 鳴り終わってから何秒間静かにするか(においが残っていればまた鳴る)
BASE_ALPHA = 1 / 1200 # ベースラインの学習速度(大きいほど速く環境に慣れる)

# ===== ハードウェア =====
buzzer = Pin(15, Pin.OUT, value=0)   # SunFounder Kepler Kit と同じ GP15
led = Pin("LED", Pin.OUT)            # 基板上のLED
i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=100_000)


def beep(times, on=0.1, off=0.1):
    for _ in range(times):
        buzzer.value(1)
        time.sleep(on)
        buzzer.value(0)
        time.sleep(off)


def wait_until(deadline_ms):
    """次の周期まで待つ。"""
    wait = time.ticks_diff(deadline_ms, time.ticks_ms())
    if wait > 0:
        time.sleep_ms(wait)


# ===== 起動 =====
if SGP30.ADDR not in i2c.scan():
    print("SGP30 が見つかりません。配線(SDA=GP4, SCL=GP5, 3V3, GND)を確認してください。")
    while True:
        beep(1, on=1.0, off=2.0)

sgp = SGP30(i2c)
beep(1)
print("起動しました。ウォームアップ中 ({} 秒)...".format(WARMUP_SEC))

start_ms = time.ticks_ms()
next_ms = start_ms
h2_hist = []
eth_hist = []
base_h2 = base_eth = 0.0
monitoring = False
smelly_count = clear_count = 0
alarm = False
ring_until = snooze_until = 0

while True:
    next_ms = time.ticks_add(next_ms, 1000)
    elapsed = time.ticks_diff(time.ticks_ms(), start_ms) // 1000

    try:
        sgp.measure()  # 内部アルゴリズムを回すため1秒ごとに呼ぶ
        h2_raw, eth_raw = sgp.measure_raw()
    except OSError as e:
        print("読み取りエラー:", e)
        wait_until(next_ms)
        continue

    h2_hist.append(h2_raw)
    eth_hist.append(eth_raw)
    if len(h2_hist) > AVG_SEC:
        h2_hist.pop(0)
        eth_hist.pop(0)
    h2 = sum(h2_hist) / len(h2_hist)
    eth = sum(eth_hist) / len(eth_hist)

    # ウォームアップ中: LEDを点滅させて待つ(ベースラインは素早く追従させておく)
    if elapsed < WARMUP_SEC:
        led.toggle()
        base_h2, base_eth = h2, eth
        if elapsed % 10 == 0:
            print("warmup {:3d}s  H2={:.0f}  Eth={:.0f}".format(elapsed, h2, eth))
        wait_until(next_ms)
        continue

    if not monitoring:
        monitoring = True
        led.value(0)
        beep(2)
        print("監視を開始します")

    # 生信号は「下がる」ほどガスが濃いので、ベースライン - 現在値 = 上昇量
    d_h2 = base_h2 - h2
    d_eth = base_eth - eth
    smelly = d_h2 >= H2_RISE or d_eth >= ETH_RISE

    if smelly:
        smelly_count += 1
        clear_count = 0
    else:
        clear_count += 1
        smelly_count = 0

    # においが少しでもあるときは学習を止め、ベースラインがにおいに慣れないようにする
    if not alarm and d_h2 < H2_RISE / 2 and d_eth < ETH_RISE / 2:
        base_h2 += (h2 - base_h2) * BASE_ALPHA
        base_eth += (eth - base_eth) * BASE_ALPHA

    now = time.ticks_ms()
    if not alarm and smelly_count >= HOLD_SEC:
        alarm = True
        snooze_until = now  # すぐに鳴らす
        print("!!! うんち検知 !!!")
    elif alarm and clear_count >= CLEAR_SEC:
        alarm = False
        print("においが消えました。警報解除")

    # 鳴る(ALARM_SEC) → スヌーズ(SNOOZE_SEC) → まだにおえばまた鳴る、のくり返し
    if alarm and time.ticks_diff(now, snooze_until) >= 0:
        ring_until = time.ticks_add(now, ALARM_SEC * 1000)
        snooze_until = time.ticks_add(ring_until, SNOOZE_SEC * 1000)
    ringing = alarm and time.ticks_diff(ring_until, now) > 0
    snoozing = alarm and not ringing

    print("dH2={:4.0f}  dEth={:4.0f}  {}".format(
        d_h2, d_eth,
        "ALARM" if ringing else "ALARM(snooze)" if snoozing else "smelly" if smelly else "ok"))

    if ringing:
        led.value(1)
        beep(3)  # ピピピッ
    elif snoozing:
        led.toggle()  # スヌーズ中はLED点滅
    else:
        led.value(0)

    wait_until(next_ms)
