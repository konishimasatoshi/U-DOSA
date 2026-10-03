# SGP30 ガスセンサー用 最小ドライバ (MicroPython)
import time


def _crc8(data):
    crc = 0xFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x31) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc


class SGP30:
    ADDR = 0x58

    def __init__(self, i2c, addr=ADDR):
        self.i2c = i2c
        self.addr = addr
        self._cmd(0x2003, 0, 0.01)  # init_air_quality

    def _cmd(self, cmd, nwords, delay):
        self.i2c.writeto(self.addr, bytes([cmd >> 8, cmd & 0xFF]))
        time.sleep(delay)
        if nwords == 0:
            return []
        raw = self.i2c.readfrom(self.addr, nwords * 3)
        words = []
        for i in range(nwords):
            w = raw[i * 3:i * 3 + 2]
            if _crc8(w) != raw[i * 3 + 2]:
                raise OSError("SGP30 CRC error")
            words.append((w[0] << 8) | w[1])
        return words

    def measure(self):
        """(eCO2 [ppm], TVOC [ppb]) を返す。1秒ごとに呼ぶこと。"""
        eco2, tvoc = self._cmd(0x2008, 2, 0.012)
        return eco2, tvoc

    def measure_raw(self):
        """(H2 raw, Ethanol raw) を返す。値が「下がる」ほどガスが濃い。"""
        h2, eth = self._cmd(0x2050, 2, 0.025)
        return h2, eth
