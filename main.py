# うんち警報器  Raspberry Pi Pico 2 W + SGP30 + アクティブブザー
#
# 考え方:
#   SGP30 の TVOC(揮発性有機化合物の総量)が閾値を超えた状態が続いたら
#   「うんち!」と判定してブザーを鳴らす。
#   生信号(H2 / Ethanol)の上昇量も表示し、U-DOSA に参考値として記録する。
#   ブザーは5秒鳴ったら自動でスヌーズ。においが残っていればスヌーズ明けにまた鳴る。
#   においが消えると自動で解除。
#   config.py に Wi-Fi と Supabase を設定すると、警報を U-DOSA に記録する。
from machine import Pin, I2C
import time
from sgp30 import SGP30
import uploader

# ===== 調整用の設定 =====
WARMUP_SEC = 60       # 起動直後のウォームアップ(センサーが安定するまで判定しない)
TVOC_THRESHOLD = 70   # TVOC [ppb] がいくつ以上で「におう」とするか
AVG_SEC = 5           # 何秒分の平均で判定するか(ノイズよけ)
HOLD_SEC = 10         # 「におう」が何秒続いたら警報を出すか(息などの一瞬の変化よけ)
CLEAR_SEC = 60        # 「におわない」が何秒続いたら警報を解除するか
ALARM_SEC = 5         # 警報で何秒間ブザーを鳴らすか
SNOOZE_SEC = 600      # 鳴り終わってから何秒間静かにするか(においが残っていればまた鳴る)
BASE_ALPHA = 1 / 1200 # 生信号のベースラインの学習速度(表示・記録用)

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
if uploader.enabled():
    uploader.connect()
print("起動しました。ウォームアップ中 ({} 秒)...".format(WARMUP_SEC))

start_ms = time.ticks_ms()
next_ms = start_ms
h2_hist = []
eth_hist = []
tvoc_hist = []
base_h2 = base_eth = 0.0
monitoring = False
smelly_count = clear_count = 0
alarm = False
ring_until = snooze_until = 0
alarm_start_ms = 0
peak_tvoc = peak_h2 = peak_eth = 0.0
event_id = None
upload = None  # "start" / "finish": ブザーを鳴らした後に送る

while True:
    next_ms = time.ticks_add(next_ms, 1000)
    elapsed = time.ticks_diff(time.ticks_ms(), start_ms) // 1000

    try:
        # TVOC: 揮発性有機化合物の総量 [ppb](判定に使う) / eCO2: 推定 CO2 濃度 [ppm](表示だけ)
        eco2, tvoc = sgp.measure()
        h2_raw, eth_raw = sgp.measure_raw()
    except OSError as e:
        print("読み取りエラー:", e)
        wait_until(next_ms)
        continue

    h2_hist.append(h2_raw)
    eth_hist.append(eth_raw)
    tvoc_hist.append(tvoc)
    if len(h2_hist) > AVG_SEC:
        h2_hist.pop(0)
        eth_hist.pop(0)
        tvoc_hist.pop(0)
    h2 = sum(h2_hist) / len(h2_hist)
    eth = sum(eth_hist) / len(eth_hist)
    tvoc_avg = sum(tvoc_hist) / len(tvoc_hist)

    # ウォームアップ中: LEDを点滅させて待つ(ベースラインは素早く追従させておく)
    if elapsed < WARMUP_SEC:
        led.toggle()
        base_h2, base_eth = h2, eth
        if elapsed % 10 == 0:
            print("warmup {:3d}s  H2={:.0f}  Eth={:.0f}  TVOC={}ppb  eCO2={}ppm".format(
                elapsed, h2, eth, tvoc, eco2))
        wait_until(next_ms)
        continue

    if not monitoring:
        monitoring = True
        led.value(0)
        beep(2)
        print("監視を開始します")

    # 判定: AVG_SEC 秒平均の TVOC が閾値以上なら「におう」
    smelly = tvoc_avg >= TVOC_THRESHOLD

    # 生信号は「下がる」ほどガスが濃いので、ベースライン - 現在値 = 上昇量(表示・記録用)
    d_h2 = base_h2 - h2
    d_eth = base_eth - eth

    if smelly:
        smelly_count += 1
        clear_count = 0
    else:
        clear_count += 1
        smelly_count = 0

    # においがあるときは学習を止め、ベースラインがにおいに慣れないようにする
    if not alarm and not smelly:
        base_h2 += (h2 - base_h2) * BASE_ALPHA
        base_eth += (eth - base_eth) * BASE_ALPHA

    now = time.ticks_ms()
    if not alarm and smelly_count >= HOLD_SEC:
        alarm = True
        snooze_until = now  # すぐに鳴らす
        alarm_start_ms = now
        peak_tvoc, peak_h2, peak_eth = tvoc, d_h2, d_eth
        upload = "start"
        print("!!! うんち検知 !!!")
    elif alarm and clear_count >= CLEAR_SEC:
        alarm = False
        upload = "finish"
        print("においが消えました。警報解除")
    if alarm:
        peak_tvoc = max(peak_tvoc, tvoc)
        peak_h2 = max(peak_h2, d_h2)
        peak_eth = max(peak_eth, d_eth)

    # 鳴る(ALARM_SEC) → スヌーズ(SNOOZE_SEC) → まだにおえばまた鳴る、のくり返し
    if alarm and time.ticks_diff(now, snooze_until) >= 0:
        ring_until = time.ticks_add(now, ALARM_SEC * 1000)
        snooze_until = time.ticks_add(ring_until, SNOOZE_SEC * 1000)
    ringing = alarm and time.ticks_diff(ring_until, now) > 0
    snoozing = alarm and not ringing

    print("TVOC={:5d}ppb (平均{:5.0f}/閾値{})  eCO2={:5d}ppm  dH2={:4.0f}  dEth={:4.0f}  {}".format(
        tvoc, tvoc_avg, TVOC_THRESHOLD, eco2, d_h2, d_eth,
        "ALARM" if ringing else "ALARM(snooze)" if snoozing else "smelly" if smelly else "ok"))

    if ringing:
        led.value(1)
        beep(3)  # ピピピッ
    elif snoozing:
        led.toggle()  # スヌーズ中はLED点滅
    else:
        led.value(0)

    # U-DOSA への送信(通信に数秒かかることがあるので、ブザーの後に行う)
    if upload == "start":
        event_id = uploader.post_alarm(peak_tvoc, peak_h2, peak_eth)
    elif upload == "finish":
        # においが続いた時間 = 検知前の HOLD_SEC + 警報中 - 解除待ちの CLEAR_SEC
        alarm_sec = time.ticks_diff(now, alarm_start_ms) // 1000
        uploader.finish_alarm(event_id, max(0, alarm_sec + HOLD_SEC - CLEAR_SEC),
                              peak_tvoc, peak_h2, peak_eth)
        event_id = None
    if upload and time.ticks_diff(time.ticks_ms(), next_ms) > 0:
        next_ms = time.ticks_ms()  # 送信で遅れた分は取り戻さず、1 秒周期に戻す
    upload = None

    wait_until(next_ms)
