# うんち警報器  Raspberry Pi Pico 2 W + SGP30 + アクティブブザー
#
# 考え方:
#   SGP30 の水素(H2)生信号を使って「うんち!」を検知する。
#   (TVOCの内部計算値はベースラインのズレで数百〜数千ppbに暴走しやすいため、
#    物理素子の生信号 H2 を使うことで誤検知を防止する)
#   4分前〜3分前のH2生信号平均値と、直近1分間のH2生信号平均値を比較し、
#   H2の上昇量(低下幅)が閾値(初期値50)以上になったらブザーを鳴らす。
#   アラート発生後、10分間はスヌーズ(ブザー停止)。
#   10分経過後に再び監視を再開する。
#   config.py に Wi-Fi と Supabase を設定すると、警報を U-DOSA に記録する。
from machine import Pin, I2C
import time
from sgp30 import SGP30
import uploader

# ===== 調整用の設定 =====
WARMUP_SEC = 60            # 起動直後のウォームアップ(センサーが安定するまで待つ)
H2_DELTA_THRESHOLD = 50    # H2上昇量(過去4〜3分前平均 - 直近1分平均)の閾値 (誤報が多いなら70〜100、敏感にするなら30〜40)
HISTORY_SEC = 240          # 履歴保持秒数(4分 = 240秒)
ALARM_SEC = 5              # 警報で何秒間ブザーを鳴らすか
SNOOZE_SEC = 600           # 発生後、何秒間スヌーズ(ブザー停止)するか(10分 = 600秒)
BASE_ALPHA = 1 / 1200      # 生信号(H2/Eth)のベースラインの学習速度(表示・記録用)

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
h2_history = []
base_h2 = base_eth = 0.0
monitoring = False
state = "MONITORING"       # "MONITORING" / "ALARM" / "SNOOZE"
alarm_start_ms = 0
alarm_end_ms = 0
snooze_until_ms = 0
peak_tvoc = peak_h2 = peak_eth = 0.0
event_id = None
upload = None  # "start" / "finish": ブザーを鳴らした後に送る

while True:
    next_ms = time.ticks_add(next_ms, 1000)
    elapsed = time.ticks_diff(time.ticks_ms(), start_ms) // 1000

    try:
        # TVOC / eCO2 は表示・記録用、生信号(H2 / Ethanol)を判定に使う
        eco2, tvoc = sgp.measure()
        h2_raw, eth_raw = sgp.measure_raw()
    except OSError as e:
        print("読み取りエラー:", e)
        wait_until(next_ms)
        continue

    # ウォームアップ中: LEDを点滅させて待つ
    if elapsed < WARMUP_SEC:
        led.toggle()
        base_h2, base_eth = h2_raw, eth_raw
        h2_history.append(h2_raw)
        if len(h2_history) > HISTORY_SEC:
            h2_history.pop(0)
        if elapsed % 10 == 0:
            print("warmup {:3d}s  H2_raw={}  TVOC={}ppb  eCO2={}ppm".format(
                elapsed, h2_raw, tvoc, eco2))
        wait_until(next_ms)
        continue

    if not monitoring:
        monitoring = True
        led.value(0)
        beep(2)
        print("監視を開始します (4分間のデータ蓄積後に判定開始)")

    # 履歴を更新(最大4分=240秒)
    h2_history.append(h2_raw)
    if len(h2_history) > HISTORY_SEC:
        h2_history.pop(0)

    # 生信号(H2/Eth)の上昇量(表示・記録用: base - raw)
    d_h2 = base_h2 - h2_raw
    d_eth = base_eth - eth_raw
    if state == "MONITORING":
        base_h2 += (h2_raw - base_h2) * BASE_ALPHA
        base_eth += (eth_raw - base_eth) * BASE_ALPHA

    # 4分前〜3分前(240〜180秒前)の60秒間 と 直近60秒間の平均を計算
    ready = len(h2_history) >= HISTORY_SEC
    if ready:
        past_1m_h2 = h2_history[0:60]      # 4分前〜3分前の1分間
        recent_1m_h2 = h2_history[-60:]    # 直近1分間
        avg_past_h2 = sum(past_1m_h2) / len(past_1m_h2)
        avg_recent_h2 = sum(recent_1m_h2) / len(recent_1m_h2)
        # H2生信号はガスが濃くなると数値が下がるため、過去平均 - 直近平均 が「上昇量」
        delta_h2 = avg_past_h2 - avg_recent_h2
    else:
        avg_past_h2 = 0.0
        avg_recent_h2 = sum(h2_history) / len(h2_history)
        delta_h2 = 0.0

    now = time.ticks_ms()

    # 状態遷移
    if state == "ALARM":
        if time.ticks_diff(now, alarm_end_ms) >= 0:
            state = "SNOOZE"
            print("ブザー停止。10分間のスヌーズに入ります")
    elif state == "SNOOZE":
        if time.ticks_diff(now, snooze_until_ms) >= 0:
            state = "MONITORING"
            upload = "finish"
            print("スヌーズ終了。監視を再開します")
    elif state == "MONITORING":
        if ready and delta_h2 >= H2_DELTA_THRESHOLD:
            state = "ALARM"
            alarm_start_ms = now
            alarm_end_ms = time.ticks_add(now, ALARM_SEC * 1000)
            snooze_until_ms = time.ticks_add(now, (ALARM_SEC + SNOOZE_SEC) * 1000)
            peak_tvoc, peak_h2, peak_eth = tvoc, d_h2, d_eth
            upload = "start"
            print("!!! うんち検知 !!! (H2上昇量: +{:.1f}, 4〜3分前: {:.0f}, 直近1分: {:.0f}, 閾値: {})".format(
                delta_h2, avg_past_h2, avg_recent_h2, H2_DELTA_THRESHOLD))

    if state in ("ALARM", "SNOOZE"):
        peak_tvoc = max(peak_tvoc, tvoc)
        peak_h2 = max(peak_h2, d_h2)
        peak_eth = max(peak_eth, d_eth)

    # 表示
    status_str = "ALARM" if state == "ALARM" else "SNOOZE" if state == "SNOOZE" else "ok"
    if ready:
        print("dH2={:+5.1f}(閾値{}) H2_raw={:5d} TVOC={:4d}ppb eCO2={:4d} dEth={:4.0f} {}".format(
            delta_h2, H2_DELTA_THRESHOLD, h2_raw, tvoc, eco2, d_eth, status_str))
    else:
        print("H2_raw={:5d}(蓄積中 {:3d}/{}s) TVOC={:4d}ppb 準備中".format(
            h2_raw, len(h2_history), HISTORY_SEC, tvoc))

    # ハードウェア動作
    if state == "ALARM":
        led.value(1)
        beep(3)  # ピピピッ
    elif state == "SNOOZE":
        led.toggle()  # スヌーズ中はLED点滅
    else:
        led.value(0)

    # U-DOSA への送信(通信に数秒かかることがあるので、ブザーの後に行う)
    if upload == "start":
        event_id = uploader.post_alarm(peak_tvoc, peak_h2, peak_eth)
    elif upload == "finish":
        alarm_sec = time.ticks_diff(now, alarm_start_ms) // 1000
        uploader.finish_alarm(event_id, alarm_sec, peak_tvoc, peak_h2, peak_eth)
        event_id = None
    if upload and time.ticks_diff(time.ticks_ms(), next_ms) > 0:
        next_ms = time.ticks_ms()
    upload = None

    wait_until(next_ms)


