# うんち警報を Supabase(U-DOSA)に送る
# 通信に失敗しても警報器は止めない。失敗はシェルに表示するだけ。
import time
import network
import config

try:
    import requests
except ImportError:
    import urequests as requests

wlan = network.WLAN(network.STA_IF)


def enabled():
    return bool(config.WIFI_SSID and config.SUPABASE_URL and config.SUPABASE_KEY)


def connect(timeout_sec=15):
    """Wi-Fi につなぐ。つながれば True。"""
    if not enabled():
        return False
    if wlan.isconnected():
        return True
    wlan.active(True)
    wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
    for _ in range(timeout_sec * 10):
        if wlan.isconnected():
            print("Wi-Fi 接続:", wlan.ifconfig()[0])
            return True
        time.sleep_ms(100)
    print("Wi-Fi につながりませんでした")
    return False


def _headers():
    return {
        "apikey": config.SUPABASE_KEY,
        "Authorization": "Bearer " + config.SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _url(query=""):
    return config.SUPABASE_URL.rstrip("/") + "/rest/v1/poop_events" + query


def post_alarm(peak_tvoc, peak_h2, peak_eth):
    """警報を記録する。記録の id を返す(失敗したら None)。日時はサーバーの現在時刻になる。"""
    if not connect():
        return None
    try:
        r = requests.post(_url(), headers=_headers(), json={
            "source": "sensor",
            "peak_tvoc": int(peak_tvoc),
            "peak_h2": int(peak_h2),
            "peak_eth": int(peak_eth),
        })
        try:
            if r.status_code != 201:
                print("Supabase への送信に失敗:", r.status_code, r.text)
                return None
            event_id = r.json()[0]["id"]
            print("Supabase に記録しました:", event_id)
            return event_id
        finally:
            r.close()
    except Exception as e:
        print("Supabase への送信に失敗:", e)
        return None


def finish_alarm(event_id, duration_sec, peak_tvoc, peak_h2, peak_eth):
    """警報が解除されたら、においが続いた時間と最大値を書き足す。"""
    if event_id is None or not connect():
        return
    try:
        r = requests.patch(_url("?id=eq." + event_id), headers=_headers(), json={
            "duration_sec": int(duration_sec),
            "peak_tvoc": int(peak_tvoc),
            "peak_h2": int(peak_h2),
            "peak_eth": int(peak_eth),
        })
        try:
            if r.status_code != 200:
                print("Supabase の更新に失敗:", r.status_code, r.text)
        finally:
            r.close()
    except Exception as e:
        print("Supabase の更新に失敗:", e)
