import re
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

from app.services.database import DB_PATH

# 8 Administrative Divisions of Bangladesh
DIVISIONS = [
    {"id": "DIV-01", "name_en": "Dhaka", "name_bn": "ঢাকা", "lat": 23.8103, "lng": 90.4125},
    {"id": "DIV-02", "name_en": "Chattogram", "name_bn": "চট্টগ্রাম", "lat": 22.3569, "lng": 91.7832},
    {"id": "DIV-03", "name_en": "Sylhet", "name_bn": "সিলেট", "lat": 24.8949, "lng": 91.8687},
    {"id": "DIV-04", "name_en": "Rajshahi", "name_bn": "রাজশাহী", "lat": 24.3636, "lng": 88.6241},
    {"id": "DIV-05", "name_en": "Khulna", "name_bn": "খুলনা", "lat": 22.8456, "lng": 89.5403},
    {"id": "DIV-06", "name_en": "Barishal", "name_bn": "বরিশাল", "lat": 22.7010, "lng": 90.3535},
    {"id": "DIV-07", "name_en": "Rangpur", "name_bn": "রংপুর", "lat": 25.7439, "lng": 89.2752},
    {"id": "DIV-08", "name_en": "Mymensingh", "name_bn": "ময়মনসিংহ", "lat": 24.7471, "lng": 90.4203},
]

# All 64 Districts with Administrative Metadata & Centroids
DISTRICTS = [
    # Dhaka Division
    {"id": "BD-13", "name_en": "Dhaka", "name_bn": "ঢাকা", "division": "Dhaka", "lat": 23.8103, "lng": 90.4125, "urban_type": "Metropolitan", "area_sq_km": 1463.6},
    {"id": "BD-18", "name_en": "Gazipur", "name_bn": "গাজীপুর", "division": "Dhaka", "lat": 24.0023, "lng": 90.4264, "urban_type": "Urban", "area_sq_km": 1806.36},
    {"id": "BD-40", "name_en": "Narayanganj", "name_bn": "নারায়ণগঞ্জ", "division": "Dhaka", "lat": 23.6238, "lng": 90.5000, "urban_type": "Urban", "area_sq_km": 684.37},
    {"id": "BD-42", "name_en": "Narsingdi", "name_bn": "নরসিংদী", "division": "Dhaka", "lat": 23.9322, "lng": 90.7154, "urban_type": "Semi-Urban", "area_sq_km": 1140.76},
    {"id": "BD-33", "name_en": "Manikganj", "name_bn": "মানিকগঞ্জ", "division": "Dhaka", "lat": 23.8617, "lng": 90.0003, "urban_type": "Rural", "area_sq_km": 1378.99},
    {"id": "BD-35", "name_en": "Munshiganj", "name_bn": "মুন্সীগঞ্জ", "division": "Dhaka", "lat": 23.5422, "lng": 90.5305, "urban_type": "Semi-Urban", "area_sq_km": 954.96},
    {"id": "BD-17", "name_en": "Faridpur", "name_bn": "ফরিদপুর", "division": "Dhaka", "lat": 23.6071, "lng": 89.8429, "urban_type": "Semi-Urban", "area_sq_km": 2072.72},
    {"id": "BD-53", "name_en": "Rajbari", "name_bn": "রাজবাড়ী", "division": "Dhaka", "lat": 23.7574, "lng": 89.6445, "urban_type": "Rural", "area_sq_km": 1118.8},
    {"id": "BD-20", "name_en": "Gopalganj", "name_bn": "গোপালগঞ্জ", "division": "Dhaka", "lat": 23.0051, "lng": 89.8266, "urban_type": "Rural", "area_sq_km": 1489.92},
    {"id": "BD-31", "name_en": "Madaripur", "name_bn": "মাদারীপুর", "division": "Dhaka", "lat": 23.1641, "lng": 90.1897, "urban_type": "Rural", "area_sq_km": 1144.96},
    {"id": "BD-62", "name_en": "Shariatpur", "name_bn": "শরীয়তপুর", "division": "Dhaka", "lat": 23.2423, "lng": 90.4348, "urban_type": "Rural", "area_sq_km": 1181.53},
    {"id": "BD-29", "name_en": "Kishoreganj", "name_bn": "কিশোরগঞ্জ", "division": "Dhaka", "lat": 24.4449, "lng": 90.7766, "urban_type": "Rural", "area_sq_km": 2688.59},
    {"id": "BD-63", "name_en": "Tangail", "name_bn": "টাঙ্গাইল", "division": "Dhaka", "lat": 24.2513, "lng": 89.9167, "urban_type": "Semi-Urban", "area_sq_km": 3414.35},

    # Chattogram Division
    {"id": "BD-10", "name_en": "Chattogram", "name_bn": "চট্টগ্রাম", "division": "Chattogram", "lat": 22.3569, "lng": 91.7832, "urban_type": "Metropolitan", "area_sq_km": 5282.98},
    {"id": "BD-11", "name_en": "Cox's Bazar", "name_bn": "কক্সবাজার", "division": "Chattogram", "lat": 21.4272, "lng": 92.0058, "urban_type": "Urban", "area_sq_km": 2491.86},
    {"id": "BD-12", "name_en": "Cumilla", "name_bn": "কুমিল্লা", "division": "Chattogram", "lat": 23.4607, "lng": 91.1809, "urban_type": "Urban", "area_sq_km": 3087.33},
    {"id": "BD-04", "name_en": "Brahmanbaria", "name_bn": "ব্রাহ্মণবাড়িয়া", "division": "Chattogram", "lat": 23.9571, "lng": 91.1119, "urban_type": "Semi-Urban", "area_sq_km": 1927.11},
    {"id": "BD-09", "name_en": "Chandpur", "name_bn": "চাঁদপুর", "division": "Chattogram", "lat": 23.2333, "lng": 90.6667, "urban_type": "Semi-Urban", "area_sq_km": 1704.06},
    {"id": "BD-16", "name_en": "Feni", "name_bn": "ফেনী", "division": "Chattogram", "lat": 23.0159, "lng": 91.3976, "urban_type": "Semi-Urban", "area_sq_km": 928.34},
    {"id": "BD-37", "name_en": "Noakhali", "name_bn": "নোয়াখালী", "division": "Chattogram", "lat": 22.8696, "lng": 91.0993, "urban_type": "Semi-Urban", "area_sq_km": 3600.99},
    {"id": "BD-30", "name_en": "Lakshmipur", "name_bn": "লক্ষ্মীপুর", "division": "Chattogram", "lat": 22.9425, "lng": 90.8412, "urban_type": "Rural", "area_sq_km": 1455.96},
    {"id": "BD-24", "name_en": "Khagrachhari", "name_bn": "খাগড়াছড়ি", "division": "Chattogram", "lat": 23.1193, "lng": 91.9847, "urban_type": "Hill Tracts", "area_sq_km": 2699.55},
    {"id": "BD-51", "name_en": "Rangamati", "name_bn": "রাঙ্গামাটি", "division": "Chattogram", "lat": 22.7324, "lng": 92.2985, "urban_type": "Hill Tracts", "area_sq_km": 6116.13},
    {"id": "BD-01", "name_en": "Bandarban", "name_bn": "বান্দরবান", "division": "Chattogram", "lat": 22.1953, "lng": 92.2184, "urban_type": "Hill Tracts", "area_sq_km": 4479.03},

    # Sylhet Division
    {"id": "BD-60", "name_en": "Sylhet", "name_bn": "সিলেট", "division": "Sylhet", "lat": 24.8949, "lng": 91.8687, "urban_type": "Metropolitan", "area_sq_km": 3490.4},
    {"id": "BD-36", "name_en": "Moulvibazar", "name_bn": "মৌলভীবাজার", "division": "Sylhet", "lat": 24.4829, "lng": 91.7774, "urban_type": "Semi-Urban", "area_sq_km": 2799.39},
    {"id": "BD-22", "name_en": "Habiganj", "name_bn": "হবিগঞ্জ", "division": "Sylhet", "lat": 24.3749, "lng": 91.4155, "urban_type": "Rural", "area_sq_km": 2636.58},
    {"id": "BD-61", "name_en": "Sunamganj", "name_bn": "সুনামগঞ্জ", "division": "Sylhet", "lat": 25.0658, "lng": 91.3950, "urban_type": "Rural", "area_sq_km": 3672.4},

    # Rajshahi Division
    {"id": "BD-54", "name_en": "Rajshahi", "name_bn": "রাজশাহী", "division": "Rajshahi", "lat": 24.3636, "lng": 88.6241, "urban_type": "Metropolitan", "area_sq_km": 2407.01},
    {"id": "BD-03", "name_en": "Bogura", "name_bn": "বগুড়া", "division": "Rajshahi", "lat": 24.8465, "lng": 89.3777, "urban_type": "Urban", "area_sq_km": 2919.9},
    {"id": "BD-48", "name_en": "Pabna", "name_bn": "পাবনা", "division": "Rajshahi", "lat": 24.0125, "lng": 89.2559, "urban_type": "Semi-Urban", "area_sq_km": 2371.5},
    {"id": "BD-64", "name_en": "Sirajganj", "name_bn": "সিরাজগঞ্জ", "division": "Rajshahi", "lat": 24.4534, "lng": 89.7008, "urban_type": "Rural", "area_sq_km": 2497.92},
    {"id": "BD-38", "name_en": "Naogaon", "name_bn": "নওগাঁ", "division": "Rajshahi", "lat": 24.7936, "lng": 88.9318, "urban_type": "Rural", "area_sq_km": 3435.67},
    {"id": "BD-39", "name_en": "Natore", "name_bn": "নাটোর", "division": "Rajshahi", "lat": 24.4206, "lng": 88.9324, "urban_type": "Rural", "area_sq_km": 1896.05},
    {"id": "BD-08", "name_en": "Chapainawabganj", "name_bn": "চাঁপাইনবাবগঞ্জ", "division": "Rajshahi", "lat": 24.5965, "lng": 88.2775, "urban_type": "Semi-Urban", "area_sq_km": 1702.56},
    {"id": "BD-26", "name_en": "Joypurhat", "name_bn": "জয়পুরহাট", "division": "Rajshahi", "lat": 25.0968, "lng": 89.0227, "urban_type": "Rural", "area_sq_km": 965.44},

    # Khulna Division
    {"id": "BD-27", "name_en": "Khulna", "name_bn": "খুলনা", "division": "Khulna", "lat": 22.8456, "lng": 89.5403, "urban_type": "Metropolitan", "area_sq_km": 4394.46},
    {"id": "BD-23", "name_en": "Jashore", "name_bn": "যশোর", "division": "Khulna", "lat": 23.1664, "lng": 89.2182, "urban_type": "Urban", "area_sq_km": 2570.42},
    {"id": "BD-28", "name_en": "Kushtia", "name_bn": "কুষ্টিয়া", "division": "Khulna", "lat": 23.9013, "lng": 89.1205, "urban_type": "Urban", "area_sq_km": 1621.15},
    {"id": "BD-57", "name_en": "Satkhira", "name_bn": "সাতক্ষীরা", "division": "Khulna", "lat": 22.7185, "lng": 89.0705, "urban_type": "Coastal/Rural", "area_sq_km": 3858.33},
    {"id": "BD-02", "name_en": "Bagerhat", "name_bn": "বাগেরহাট", "division": "Khulna", "lat": 22.6516, "lng": 89.7859, "urban_type": "Coastal/Rural", "area_sq_km": 3959.11},
    {"id": "BD-25", "name_en": "Jhenaidah", "name_bn": "ঝিনাইদহ", "division": "Khulna", "lat": 23.5448, "lng": 89.1539, "urban_type": "Rural", "area_sq_km": 1961.16},
    {"id": "BD-32", "name_en": "Magura", "name_bn": "মাগুরা", "division": "Khulna", "lat": 23.4873, "lng": 89.4199, "urban_type": "Rural", "area_sq_km": 1048.61},
    {"id": "BD-34", "name_en": "Meherpur", "name_bn": "মেহেরপুর", "division": "Khulna", "lat": 23.7622, "lng": 88.6318, "urban_type": "Rural", "area_sq_km": 716.08},
    {"id": "BD-36B", "name_en": "Narail", "name_bn": "নড়াইল", "division": "Khulna", "lat": 23.1725, "lng": 89.5127, "urban_type": "Rural", "area_sq_km": 990.23},
    {"id": "BD-10B", "name_en": "Chuadanga", "name_bn": "চুয়াডাঙ্গা", "division": "Khulna", "lat": 23.6402, "lng": 88.8418, "urban_type": "Rural", "area_sq_km": 1172.92},

    # Barishal Division
    {"id": "BD-06", "name_en": "Barishal", "name_bn": "বরিশাল", "division": "Barishal", "lat": 22.7010, "lng": 90.3535, "urban_type": "Metropolitan", "area_sq_km": 2790.51},
    {"id": "BD-07", "name_en": "Bhola", "name_bn": "ভোলা", "division": "Barishal", "lat": 22.6859, "lng": 90.6481, "urban_type": "Coastal/Island", "area_sq_km": 3737.21},
    {"id": "BD-47", "name_en": "Patuakhali", "name_bn": "পটুয়াখালী", "division": "Barishal", "lat": 22.3596, "lng": 90.3299, "urban_type": "Coastal/Rural", "area_sq_km": 3220.15},
    {"id": "BD-49", "name_en": "Pirojpur", "name_bn": "পিরোজপুর", "division": "Barishal", "lat": 22.5841, "lng": 89.9720, "urban_type": "Rural", "area_sq_km": 1307.61},
    {"id": "BD-05", "name_en": "Barguna", "name_bn": "বরগুনা", "division": "Barishal", "lat": 22.0953, "lng": 90.1121, "urban_type": "Coastal/Rural", "area_sq_km": 1831.31},
    {"id": "BD-21", "name_en": "Jhalokati", "name_bn": "ঝালকাঠি", "division": "Barishal", "lat": 22.6406, "lng": 90.1987, "urban_type": "Rural", "area_sq_km": 758.06},

    # Rangpur Division
    {"id": "BD-55", "name_en": "Rangpur", "name_bn": "রংপুর", "division": "Rangpur", "lat": 25.7439, "lng": 89.2752, "urban_type": "Metropolitan", "area_sq_km": 2307.78},
    {"id": "BD-14", "name_en": "Dinajpur", "name_bn": "দিনাজপুর", "division": "Rangpur", "lat": 25.6217, "lng": 88.6355, "urban_type": "Semi-Urban", "area_sq_km": 3437.98},
    {"id": "BD-46", "name_en": "Panchagarh", "name_bn": "পঞ্চগড়", "division": "Rangpur", "lat": 26.3411, "lng": 88.5542, "urban_type": "Rural", "area_sq_km": 1404.63},
    {"id": "BD-63B", "name_en": "Thakurgaon", "name_bn": "ঠাকুরগাঁও", "division": "Rangpur", "lat": 26.0337, "lng": 88.4617, "urban_type": "Rural", "area_sq_km": 1809.52},
    {"id": "BD-41", "name_en": "Nilphamari", "name_bn": "নীলফামারী", "division": "Rangpur", "lat": 25.9318, "lng": 88.8560, "urban_type": "Rural", "area_sq_km": 1580.85},
    {"id": "BD-19", "name_en": "Gaibandha", "name_bn": "গাইবান্ধা", "division": "Rangpur", "lat": 25.3288, "lng": 89.5408, "urban_type": "Rural", "area_sq_km": 2179.27},
    {"id": "BD-28B", "name_en": "Kurigram", "name_bn": "কুড়িগ্রাম", "division": "Rangpur", "lat": 25.8054, "lng": 89.6362, "urban_type": "Rural", "area_sq_km": 2296.16},
    {"id": "BD-31B", "name_en": "Lalmonirhat", "name_bn": "লালমনিরহাট", "division": "Rangpur", "lat": 25.9923, "lng": 89.2847, "urban_type": "Rural", "area_sq_km": 1241.46},

    # Mymensingh Division
    {"id": "BD-39B", "name_en": "Mymensingh", "name_bn": "ময়মনসিংহ", "division": "Mymensingh", "lat": 24.7471, "lng": 90.4203, "urban_type": "Metropolitan", "area_sq_km": 4363.48},
    {"id": "BD-21B", "name_en": "Jamalpur", "name_bn": "জামালপুর", "division": "Mymensingh", "lat": 24.9375, "lng": 89.9378, "urban_type": "Rural", "area_sq_km": 2031.98},
    {"id": "BD-38B", "name_en": "Netrokona", "name_bn": "নেত্রকোণা", "division": "Mymensingh", "lat": 24.8709, "lng": 90.7279, "urban_type": "Rural", "area_sq_km": 2810.4},
    {"id": "BD-57B", "name_en": "Sherpur", "name_bn": "শেরপুর", "division": "Mymensingh", "lat": 25.0205, "lng": 90.0153, "urban_type": "Rural", "area_sq_km": 1363.76},
]

# Upazila Directory for Key Active Hubs
UPAZILAS = {
    "Dhaka": [
        {"id": "UPZ-01", "name_en": "Savar", "name_bn": "সাভার", "code": "DEMO-U01", "lat": 23.8583, "lng": 90.2667, "type": "Suburban/Industrial"},
        {"id": "UPZ-02", "name_en": "Keraniganj", "name_bn": "কেরানীগঞ্জ", "code": "DEMO-U02", "lat": 23.6833, "lng": 90.3167, "type": "Semi-Urban"},
        {"id": "UPZ-03", "name_en": "Dhamrai", "name_bn": "ধামরাই", "code": "DEMO-U03", "lat": 23.9167, "lng": 90.2167, "type": "Rural"},
        {"id": "UPZ-04", "name_en": "Mirpur", "name_bn": "মিরপুর", "code": "DEMO-U04", "lat": 23.8041, "lng": 90.3667, "type": "Urban/Metropolitan"},
        {"id": "UPZ-05", "name_en": "Gulshan", "name_bn": "গুলশান", "code": "DEMO-U05", "lat": 23.7925, "lng": 90.4078, "type": "Metropolitan/Commercial"},
    ],
    "Chattogram": [
        {"id": "UPZ-11", "name_en": "Hathazari", "name_bn": "হাটহাজারী", "code": "DEMO-U02", "lat": 22.5083, "lng": 91.8083, "type": "Semi-Urban"},
        {"id": "UPZ-12", "name_en": "Sitakunda", "name_bn": "সীতাকুণ্ড", "code": "DEMO-U03", "lat": 22.6167, "lng": 91.6667, "type": "Industrial/Coastal"},
        {"id": "UPZ-13", "name_en": "Patiya", "name_bn": "পটিয়া", "code": "DEMO-U04", "lat": 22.2986, "lng": 91.9767, "type": "Rural"},
    ],
    "Sylhet": [
        {"id": "UPZ-21", "name_en": "Sylhet Sadar", "name_bn": "সিলেট সদর", "code": "DEMO-U01", "lat": 24.8949, "lng": 91.8687, "type": "Urban"},
        {"id": "UPZ-22", "name_en": "Golapganj", "name_bn": "গোলাপগঞ্জ", "code": "DEMO-U03", "lat": 24.8667, "lng": 92.0167, "type": "Rural"},
        {"id": "UPZ-23", "name_en": "Beanibazar", "name_bn": "বিয়ানীবাজার", "code": "DEMO-U04", "lat": 24.8250, "lng": 92.1667, "type": "Rural"},
    ]
}

# Cadastral Mouzas
MOUZAS = [
    {"mouza_code": "DEMO-M01", "name_en": "Birulia", "name_bn": "বিরুলিয়া", "jl_no": 45, "upazila": "Savar", "district": "Dhaka", "lat": 23.8340, "lng": 90.3120},
    {"mouza_code": "DEMO-M02", "name_en": "Fatehpur", "name_bn": "ফতেহপুর", "jl_no": 18, "upazila": "Hathazari", "district": "Chattogram", "lat": 22.4670, "lng": 91.7920},
    {"mouza_code": "DEMO-M03", "name_en": "Tukerbazar", "name_bn": "টুকেরবাজার", "jl_no": 5, "upazila": "Sylhet Sadar", "district": "Sylhet", "lat": 24.9120, "lng": 91.8250},
    {"mouza_code": "DEMO-M04", "name_en": "Tetuljhora", "name_bn": "তেঁতুলঝোড়া", "jl_no": 33, "upazila": "Savar", "district": "Dhaka", "lat": 23.7950, "lng": 90.2540},
]


def get_all_districts() -> List[Dict[str, Any]]:
    enriched = []
    for d in DISTRICTS:
        item = dict(d)
        item["district_name_en"] = d["name_en"]
        item["district_name_bn"] = d["name_bn"]
        item["classification"] = d["urban_type"]
        enriched.append(item)
    return enriched

def get_all_divisions() -> List[Dict[str, Any]]:
    return DIVISIONS



def resolve_parcel_gis(parcel_id: str, db_path: Path = DB_PATH) -> Dict[str, Any]:
    """
    Resolves synthetic parcel ID to genuine administrative geography and cadastral polygon metadata.
    """
    db_file = Path(db_path).resolve()
    with sqlite3.connect(db_file.as_uri() + "?mode=ro", uri=True) as conn:
        conn.row_factory = sqlite3.Row
        parcel = conn.execute(
            "SELECT parcel_id, district_code, upazila_code, mouza_code, reference_area_decimal FROM parcels WHERE parcel_id = ?",
            (parcel_id,)
        ).fetchone()

        if not parcel:
            raise ValueError(f"Parcel {parcel_id} not found")

        surveys = conn.execute(
            "SELECT survey_type, dag_no, khatian_no, area_decimal FROM survey_records WHERE parcel_id = ?",
            (parcel_id,)
        ).fetchall()

    p_data = dict(parcel)
    dist_code = p_data.get("district_code", "DEMO-D01")
    upz_code = p_data.get("upazila_code", "DEMO-U01")
    mouza_code = p_data.get("mouza_code", "DEMO-M01")

    # Map demo codes to realistic Bangladesh geographies
    if dist_code == "DEMO-D02":
        dist_meta = next(d for d in DISTRICTS if d["name_en"] == "Chattogram")
        upz_meta = {"name_en": "Hathazari", "name_bn": "হাটহাজারী", "lat": 22.5083, "lng": 91.8083}
        mouza_meta = next(m for m in MOUZAS if m["mouza_code"] == "DEMO-M02")
    elif dist_code == "DEMO-D03":
        dist_meta = next(d for d in DISTRICTS if d["name_en"] == "Sylhet")
        upz_meta = {"name_en": "Sylhet Sadar", "name_bn": "সিলেট সদর", "lat": 24.8949, "lng": 91.8687}
        mouza_meta = next(m for m in MOUZAS if m["mouza_code"] == "DEMO-M03")
    else:
        dist_meta = next(d for d in DISTRICTS if d["name_en"] == "Dhaka")
        upz_meta = {"name_en": "Savar", "name_bn": "সাভার", "lat": 23.8583, "lng": 90.2667}
        mouza_meta = next(m for m in MOUZAS if m["mouza_code"] == "DEMO-M01")

    # Derive representative bounding polygon around mouza centroid for visual demarcations
    c_lat, c_lng = mouza_meta["lat"], mouza_meta["lng"]
    offset = 0.0015  # approx 150 meters
    cadastral_polygon = [
        {"lat": round(c_lat + offset, 5), "lng": round(c_lng - offset, 5)},
        {"lat": round(c_lat + offset * 1.2, 5), "lng": round(c_lng + offset, 5)},
        {"lat": round(c_lat - offset, 5), "lng": round(c_lng + offset * 1.1, 5)},
        {"lat": round(c_lat - offset * 0.9, 5), "lng": round(c_lng - offset * 1.1, 5)},
    ]

    # GeoJSON Polygon feature
    polygon_coords = [[
        [pt["lng"], pt["lat"]] for pt in cadastral_polygon
    ]]
    polygon_coords[0].append([cadastral_polygon[0]["lng"], cadastral_polygon[0]["lat"]])

    ref_area = float(p_data["reference_area_decimal"])

    geojson_feature = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": polygon_coords,
        },
        "properties": {
            "parcel_id": parcel_id,
            "mouza": mouza_meta["name_en"],
            "area_decimal": ref_area,
        }
    }

    return {
        "parcel_id": parcel_id,
        "district": dist_meta,
        "upazila": upz_meta,
        "mouza": mouza_meta,
        "display_name_bn": f"{mouza_meta['name_bn']} {'আবাসিক' if ref_area <= 30 else 'নাল'} জমি",
        "display_name_en": f"{mouza_meta['name_en']} {'Residential' if ref_area <= 30 else 'Agricultural'} Land",
        "district_name_en": dist_meta["name_en"],
        "district_name_bn": dist_meta["name_bn"],
        "upazila_name_en": upz_meta["name_en"],
        "upazila_name_bn": upz_meta["name_bn"],
        "mouza_name_en": mouza_meta["name_en"],
        "mouza_name_bn": mouza_meta["name_bn"],
        "area_decimal": ref_area,
        "reference_area_decimal": ref_area,
        "land_classification_bn": "নাল জমি (কৃষি)" if ref_area > 30 else "ভিটি / বাড়ি (আবাসিক)",
        "urban_rural": dist_meta["urban_type"],
        "urban_rural_status": dist_meta["urban_type"],
        "survey_type": surveys[0]["survey_type"] if surveys else "RS",
        "center_coordinates": [c_lat, c_lng],
        "coordinates": {"lat": c_lat, "lng": c_lng},
        "recommended_zoom": 15,
        "boundary_geojson": geojson_feature,
        "cadastral_boundary_preview": cadastral_polygon,
        "surveys_linked": [dict(s) for s in surveys],
        "precision_level": "MOUZA_LEVEL_PROVENANCE",
        "has_exact_cadastral_boundary": False,
        "is_approximate_preview": True,
        "cadastral_status": "APPROXIMATE_DEMO_PREVIEW",
        "synthetic": True,
        "provenance": {
            "administrative_source": "Survey of Bangladesh (SoB) / BBS District Centroids",
            "cadastral_polygon_type": "Mouza Centroid Offset Geometry",
            "coordinates_provenance": "Synthetic Cadastral Polygon for Demonstration",
            "accuracy_disclaimer_bn": "ভৌগোলিক স্থানাঙ্ক ও সীমানা সিন্থেটিক মৌজা ভিত্তিক ডেমো মডেল। এটি কোনো সরকারি ডিজিটাল সার্ভেয়ার প্রত্যয়ন নয়।",
        },
        "disclaimer_bn": (
            "ভৌগোলিক স্থানাঙ্ক ও সীমানা সিন্থেটিক মৌজা ভিত্তিক ডেমো মডেল। "
            "এটি কোনো সরকারি ডিজিটাল সার্ভেয়ার প্রত্যয়ন নয়।"
        ),
    }


def search_locations(query: str, db_path: Path = DB_PATH) -> List[Dict[str, Any]]:
    q = query.strip().casefold()
    if not q:
        return []

    results = []

    # 1. Search districts
    for d in DISTRICTS:
        if q in d["name_en"].casefold() or q in d["name_bn"]:
            results.append({
                "type": "DISTRICT",
                "name_en": d["name_en"],
                "name_bn": d["name_bn"],
                "division": d["division"],
                "lat": d["lat"],
                "lng": d["lng"],
                "zoom_level": 11,
                "urban_type": d["urban_type"]
            })

    # 2. Search upazilas
    for dist_name, upz_list in UPAZILAS.items():
        for u in upz_list:
            if q in u["name_en"].casefold() or q in u["name_bn"]:
                results.append({
                    "type": "UPAZILA",
                    "name_en": u["name_en"],
                    "name_bn": u["name_bn"],
                    "parent_district": dist_name,
                    "lat": u["lat"],
                    "lng": u["lng"],
                    "zoom_level": 13,
                    "urban_type": u["type"]
                })

    # 3. Search mouzas
    for m in MOUZAS:
        if q in m["name_en"].casefold() or q in m["name_bn"] or q in str(m["jl_no"]):
            results.append({
                "type": "MOUZA",
                "name_en": m["name_en"],
                "name_bn": m["name_bn"],
                "jl_no": m["jl_no"],
                "upazila": m["upazila"],
                "district": m["district"],
                "lat": m["lat"],
                "lng": m["lng"],
                "zoom_level": 15,
                "cadastral_code": m["mouza_code"]
            })

    # 4. Search Parcels, Khatian numbers, and Dag numbers from SQLite database
    raw_q = query.strip()
    clean_digits = "".join(ch for ch in raw_q if ch.isdigit())
    clean_id = raw_q.upper()

    try:
        db_file = Path(db_path).resolve()
        with sqlite3.connect(db_file.as_uri() + "?mode=ro", uri=True) as conn:
            conn.row_factory = sqlite3.Row

            # Search by Parcel ID (e.g. LS-PARCEL-000001 or PARCEL)
            if "PARCEL" in clean_id or clean_id.startswith("LS-"):
                p_rows = conn.execute(
                    "SELECT parcel_id, reference_area_decimal FROM parcels WHERE parcel_id LIKE ? LIMIT 5",
                    (f"%{clean_id}%",)
                ).fetchall()
                for pr in p_rows:
                    pid = pr["parcel_id"]
                    try:
                        gis_info = resolve_parcel_gis(pid, db_path=db_file)
                        results.append({
                            "type": "PARCEL",
                            "parcel_id": pid,
                            "name_en": f"Parcel {pid} ({gis_info['display_name_en']})",
                            "name_bn": f"{pid} ({gis_info['display_name_bn']})",
                            "district": gis_info["district_name_bn"],
                            "upazila": gis_info["upazila_name_bn"],
                            "mouza": gis_info["mouza_name_bn"],
                            "area_decimal": gis_info["area_decimal"],
                            "lat": gis_info["center_coordinates"][0],
                            "lng": gis_info["center_coordinates"][1],
                            "zoom_level": 16,
                        })
                    except Exception:
                        pass

            # Search by Khatian or Dag number if numeric query (e.g. 111, 1007)
            if clean_digits:
                s_rows = conn.execute("""
                    SELECT s.parcel_id, s.khatian_no, s.dag_no, s.survey_type, s.area_decimal
                    FROM survey_records s
                    WHERE s.khatian_no = ? OR s.dag_no = ?
                    LIMIT 5
                """, (clean_digits, clean_digits)).fetchall()
                seen_parcels = set()
                for sr in s_rows:
                    pid = sr["parcel_id"]
                    if pid in seen_parcels:
                        continue
                    seen_parcels.add(pid)
                    try:
                        gis_info = resolve_parcel_gis(pid, db_path=db_file)
                        matched_by_bn = "খতিয়ান" if sr["khatian_no"] == clean_digits else "দাগ"
                        matched_by_en = "Khatian" if sr["khatian_no"] == clean_digits else "Dag"
                        results.append({
                            "type": "PARCEL",
                            "parcel_id": pid,
                            "khatian_no": sr["khatian_no"],
                            "dag_no": sr["dag_no"],
                            "survey_type": sr["survey_type"],
                            "name_en": f"{pid} ({matched_by_en}: {clean_digits}) · {gis_info['display_name_en']}",
                            "name_bn": f"{pid} ({matched_by_bn} নং: {clean_digits}) · {gis_info['display_name_bn']}",
                            "district": gis_info["district_name_bn"],
                            "upazila": gis_info["upazila_name_bn"],
                            "mouza": gis_info["mouza_name_bn"],
                            "area_decimal": sr["area_decimal"],
                            "lat": gis_info["center_coordinates"][0],
                            "lng": gis_info["center_coordinates"][1],
                            "zoom_level": 16,
                        })
                    except Exception:
                        pass
    except Exception:
        pass

    return results
