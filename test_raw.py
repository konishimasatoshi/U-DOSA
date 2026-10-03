# SGP30 の生信号を確認するテスト
# Thonny で実行し、「表示 → プロッター」でグラフを見る。
# dH2 / dEth はガスが増えるとプラスになる(最初の30秒の平均との差)。
from machine import Pin, I2C
import time
import math
from sgp30 import SGP30

i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=100_000)
sgp = SGP30(i2c)

print("30秒間、きれいな空気で基準を取ります。センサーに近づかないでください...")
time.sleep(15)  # SGP30 のウォームアップ
h2_sum = eth_sum = 0
for _ in range(30):
    sgp.measure()
    h2, eth = sgp.measure_raw()
    h2_sum += h2
    eth_sum += eth
    time.sleep(1)
base_h2 = h2_sum / 30
base_eth = eth_sum / 30
print("基準 H2={:.0f} Eth={:.0f}  ここからテスト開始".format(base_h2, base_eth))

t = 0
while True:
    eco2, tvoc = sgp.measure()
    h2, eth = sgp.measure_raw()
    d_h2 = base_h2 - h2
    d_eth = base_eth - eth
    ratio = max(math.exp(d_h2 / 512), math.exp(d_eth / 512))
    print("t={} TVOC={} dH2={:.0f} dEth={:.0f} ratio={:.2f}".format(t, tvoc, d_h2, d_eth, ratio))
    t += 1
    time.sleep(1)
