import pandas as pd

# Data terbaru Anda
data = {
    "action_name": [
        "Idle", "Selamat Datang", "Cek Etalase", "Yuk Tanya", "Cek Keranjang",
        "Cek Gratis Ongkir", "Harga Promo", "Garansi Produk", "Gak Live Lama", 
        "Closing", "Etalase 1", "Etalase 2", "Etalase 3", "Etalase 4", "Etalase 5",
        "Etalase 6", "Etalase 7", "Etalase 8", "Etalase 9", "Etalase 10", 
        "Etalase 11", "Etalase 12", "Etalase 13", "Etalase 14", "Etalase 15",
        "Etalase 16", "Etalase 17", "Etalase 18", "Etalase 19", "Etalase 20"
    ],
    "code": [
        "0", "A", "S", "D", "F", "G", "H", "J", "K", "L", "1", "2", "3", "4", "5",
        "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"
    ],
    "time_start": [
        "00:00:00.00", "00:01:03.26", "00:01:23.70", "00:01:38.40", "00:01:45.73",
        "00:01:55.56", "00:02:07.56", "00:02:14.96", "00:02:24.36", "00:02:35.83",
        "00:02:47.63", "00:03:54.63", "00:04:56.03", "00:05:49.20", "00:06:35.06",
        "00:07:16.90", "00:08:05.30", "00:08:54.70", "00:09:35.73", "00:10:30.30",
        "00:11:16.30", "00:12:06.16", "00:12:39.30", "00:13:19.50", "00:14:08.06",
        "00:14:53.86", "00:15:34.76", "00:16:17.96", "00:16:58.86", "00:17:40.66"
    ],
    "time_end": [
        "00:01:02.96", "00:01:23.40", "00:01:38.10", "00:01:45.43", "00:01:55.26",
        "00:02:07.26", "00:02:14.66", "00:02:24.06", "00:02:35.53", "00:02:47.33",
        "00:03:54.33", "00:04:55.73", "00:05:48.90", "00:06:34.76", "00:07:16.60",
        "00:08:05.00", "00:08:54.40", "00:09:35.43", "00:10:30.00", "00:11:16.00",
        "00:12:05.86", "00:12:39.00", "00:13:19.20", "00:14:07.76", "00:14:53.56",
        "00:15:34.46", "00:16:17.66", "00:16:58.56", "00:17:40.36", "00:18:09.26"
    ]
}

df = pd.DataFrame(data)

# Fungsi untuk konversi ke detik
def convert_to_seconds(time_str):
    hh, mm, ss_ms = time_str.split(':')
    ss, ms = ss_ms.split('.')
    total_seconds = int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000
    return total_seconds

# Aplikasikan konversi ke kolom time_start dan time_end
df['time_start'] = df['time_start'].apply(convert_to_seconds)
df['time_end'] = df['time_end'].apply(convert_to_seconds)

# Tambahkan kolom id_voice dan model_id dengan nilai tetap
df['id_voice'] = "BQU7aoylGgPcFLGwGC8r"
df['model_id'] = "chikglow"

# Menyimpan data ke dalam file CSV
csv_filename = "output.csv"
df.to_csv(csv_filename, index=False)

print(f"Data telah disimpan ke file {csv_filename}")
