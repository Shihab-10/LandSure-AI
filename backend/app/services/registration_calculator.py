from typing import Literal
from pydantic import BaseModel, Field

class RegistrationCostRequest(BaseModel):
    deed_value_bdt: float = Field(gt=0, description="Deed value in BDT (দলিল মূল্য)")
    area_decimal: float = Field(default=1.0, gt=0, description="Land area in decimals (শতাংশ)")
    location_category: Literal[
        "dhaka_ctg_city",
        "other_city_corporation",
        "pourashava",
        "union_parishad"
    ] = Field(
        default="union_parishad",
        description="Location jurisdiction of the parcel"
    )
    is_residential: bool = Field(default=True, description="Residential or commercial")


def calculate_registration_cost(req: RegistrationCostRequest) -> dict:
    value = req.deed_value_bdt

    # 1. Stamp Duty (স্ট্যাম্প শুল্ক) - 1.5%
    stamp_duty_rate = 0.015
    stamp_duty_bdt = round(value * stamp_duty_rate, 2)

    # 2. Registration Fee (নিবন্ধন ফি) - 1.0%
    reg_fee_rate = 0.010
    reg_fee_bdt = round(value * reg_fee_rate, 2)

    # 3. Local Government Tax (স্থানীয় সরকার কর)
    # City Corp: 3%, Pourashava: 2%, Union Parishad: 1%
    if req.location_category in ("dhaka_ctg_city", "other_city_corporation"):
        local_gov_rate = 0.030
        local_gov_name = "সিটি কর্পোরেশন কর (Local Govt Tax - City Corp 3%)"
    elif req.location_category == "pourashava":
        local_gov_rate = 0.020
        local_gov_name = "পৌরসভা কর (Local Govt Tax - Pourashava 2%)"
    else:
        local_gov_rate = 0.010
        local_gov_name = "ইউনিয়ন পরিষদ কর (Local Govt Tax - Union Parishad 1%)"
    local_gov_bdt = round(value * local_gov_rate, 2)

    # 4. Advance Income Tax (AIT / উৎসে কর - Sec 53H)
    if req.location_category == "dhaka_ctg_city":
        ait_rate = 0.040 if not req.is_residential else 0.030
        ait_name = "উৎস আয়কর (AIT - Dhaka/Ctg 3-4%)"
    elif req.location_category == "other_city_corporation":
        ait_rate = 0.025
        ait_name = "উৎস আয়কর (AIT - Other City 2.5%)"
    elif req.location_category == "pourashava":
        ait_rate = 0.020
        ait_name = "উৎস আয়কর (AIT - Pourashava 2%)"
    else:
        ait_rate = 0.010
        ait_name = "উৎস আয়কর (AIT - Union Parishad 1%)"
    ait_bdt = round(value * ait_rate, 2)

    # 5. Fixed Statutory & Administrative Fees (স্থির সরকারি ফি)
    fixed_fees = [
        {"name_bn": "ই-ফি (E-Fee)", "name_en": "E-Tracking Fee", "amount_bdt": 100},
        {"name_bn": "এন-ফি (নকল ফি / N-Fee)", "name_en": "Copying Fee (N-Fee)", "amount_bdt": 240},
        {"name_bn": "হলফনামা স্ট্যাম্প (Affidavit Stamp)", "name_en": "Affidavit Stamp", "amount_bdt": 300},
        {"name_bn": "কোর্ট ফি ও তল্লাশি ফি (Court & Search Fee)", "name_en": "Court & Search Fee", "amount_bdt": 200},
    ]
    total_fixed_bdt = sum(item["amount_bdt"] for item in fixed_fees)

    # Total Sum
    total_estimated_cost = round(
        stamp_duty_bdt + reg_fee_bdt + local_gov_bdt + ait_bdt + total_fixed_bdt, 2
    )
    total_percentage = round((total_estimated_cost / value) * 100, 2)

    breakdown = [
        {
            "category": "stamp_duty",
            "title_bn": "স্ট্যাম্প শুল্ক",
            "title_en": "Stamp Duty",
            "rate_percent": round(stamp_duty_rate * 100, 2),
            "amount_bdt": stamp_duty_bdt,
        },
        {
            "category": "registration_fee",
            "title_bn": "নিবন্ধন ফি",
            "title_en": "Registration Fee",
            "rate_percent": round(reg_fee_rate * 100, 2),
            "amount_bdt": reg_fee_bdt,
        },
        {
            "category": "local_government_tax",
            "title_bn": local_gov_name,
            "title_en": "Local Government Tax",
            "rate_percent": round(local_gov_rate * 100, 2),
            "amount_bdt": local_gov_bdt,
        },
        {
            "category": "advance_income_tax",
            "title_bn": ait_name,
            "title_en": "Advance Income Tax (AIT)",
            "rate_percent": round(ait_rate * 100, 2),
            "amount_bdt": ait_bdt,
        },
        {
            "category": "administrative_fees",
            "title_bn": "স্থির সরকারি ও তল্লাশি ফি",
            "title_en": "Statutory Administrative Fees",
            "rate_percent": None,
            "amount_bdt": total_fixed_bdt,
            "details": fixed_fees,
        },
    ]

    return {
        "deed_value_bdt": value,
        "area_decimal": req.area_decimal,
        "location_category": req.location_category,
        "total_estimated_cost_bdt": total_estimated_cost,
        "effective_rate_percent": total_percentage,
        "breakdown": breakdown,
        "reference_rules": [
            "The Registration Act, 1908",
            "The Stamp Act, 1899",
            "Finance Act, Bangladesh (Income Tax Ordinance Sec 53H)",
        ],
        "disclaimer_bn": (
            "এই হিসাবটি বাংলাদেশ নিবন্ধন পরিদপ্তরের প্রজ্ঞাপন ও আয়কর নির্দেশিকা অনুযায়ী আনুমানিক। "
            "সংশ্লিষ্ট মৌজার সরকারি সর্বনিম্ন মূল্যায়ন তালিকা (মৌজা রেট) অনুযায়ী দলিল মূল্য নির্ধারিত হতে পারে।"
        ),
        "disclaimer_en": (
            "This calculation is an estimate based on current Bangladesh Registration Directorate and NBR regulations. "
            "The deed value cannot be lower than the government-mandated mouza minimum valuation rate."
        ),
        "synthetic_demo": True,
    }
