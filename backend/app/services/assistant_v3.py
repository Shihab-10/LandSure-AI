import os
import re
import json
import sqlite3
import unicodedata
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.services.database import DB_PATH, get_parcel
from app.services.ai_model_integration_v4 import classify_with_v4
from app.services.parcel_ml_review import predict_parcel_review
from app.services.registration_calculator import calculate_registration_cost, RegistrationCostRequest
from app.services.lawyer_service import get_lawyers
from app.services.ownership_chain import get_ownership_chain
from app.services.land_verification_extended import get_tax_verification, get_legal_case_checklist
from app.services.document_processor import get_document_cache

# Load terminology knowledge base
PROJECT_ROOT = Path(__file__).resolve().parents[3]
TERMS_PATH = PROJECT_ROOT / "models" / "retrieval" / "LAND_TERMINOLOGY.json"

KNOWLEDGE = []
if TERMS_PATH.is_file():
    try:
        KNOWLEDGE = json.loads(TERMS_PATH.read_text(encoding="utf-8"))
    except Exception:
        KNOWLEDGE = []

PARCEL_PATTERN = re.compile(r"\bLS-PARCEL-\d{6}\b", re.IGNORECASE)

DISCLAIMER_BN = (
    "সতর্কতা: এটি ল্যান্ডসিওর এআই-এর সিন্থেটিক ও শিক্ষামূলক তথ্য। "
    "এটি কোনো সরকারি মালিকানা প্রত্যয়ন, চূড়ান্ত আইনি নিষ্পত্তি বা জমি কেনার ছাড়পত্র নয়। "
    "বাধ্যতামূলক যাচাইয়ের জন্য একজন নিবন্ধিত আইনজীবীর পরামর্শ নিন।"
)

DISCLAIMER_EN = (
    "Disclaimer: Synthetic educational intelligence from LandSure AI. "
    "Not official government certification, fraud clearance, or title warranty. "
    "Consult a licensed Advocate for binding due diligence."
)

GENERAL_KNOWLEDGE_BASE = {
    "cs_vs_rs": {
        "keywords": ["cs", "rs", "পার্থক্য", "খতিয়ান", "khatian", "সার্ভে", "survey"],
        "answer_bn": (
            "**সিএস (CS) বনাম আরএস (RS) খতিয়ানের মূল পার্থক্য ও গুরুত্ব:**\n\n"
            "১. **সিএস (Cadastral Survey - ১৮৮৮-১৯৪০):** এটি ভারতীয় উপমহাদেশের প্রথম পূর্ণাঙ্গ বৈজ্ঞানিক ভূমি জরিপ। "
            "এর মাধ্যমে জমির মূল ভিত্তি ও আদি মালিকানা নিশ্চিত করা হয়। বায়া দলিল ও মূল দলিলের ধারাবাহিকতা মেলাতে সিএস খতিয়ান দেখা আবশ্যক।\n\n"
            "২. **এসএ (State Acquisition Survey - ১৯৫৬-১৯৬৩):** জমিদারী প্রথা উচ্ছেদের পর প্রজাস্বত্ব রেকর্ড তৈরি করা হয়।\n\n"
            "৩. **আরএস (Revisional Survey - ১৯৬৫-বর্তমান):** সিএস ও এসএ জরিপের ভুলভ্রান্তি সংশোধন ও নতুন দখলদারের নাম অন্তর্ভুক্ত করে আরএস প্রস্তুত করা হয়। "
            "বর্তমানে জমি হস্তান্তর ও নামজারিতে আরএস খতিয়ান সবচেয়ে কার্যকর ও আদালতের নিকট প্রধান সাক্ষ্য হিসেবে গণ্য হয়।\n\n"
            "**পরামর্শ:** জমি কেনার পূর্বে সিএস থেকে আরএস পর্যন্ত খতিয়ানের ধারাবাহিক মিল (Chain of Title) যাচাই করা বাধ্যতামূলক।"
        ),
        "answer_en": (
            "**Difference between CS and RS Survey Khatians:**\n\n"
            "1. **CS (Cadastral Survey, 1888-1940):** The first baseline cadastre of undivided Bengal. Essential for establishing original root of title.\n"
            "2. **SA (State Acquisition Survey, 1956-1963):** Prepared post-zamindari abolition under SAT Act 1950.\n"
            "3. **RS (Revisional Survey, 1965-present):** Revises CS/SA errors, reflects updated ground possession, and serves as primary judicial evidentiary record.\n\n"
            "**Due Diligence Rule:** Always verify the unbroken chain of title from CS to RS before transaction."
        ),
        "legal_reference": "Bengal Tenancy Act 1885; State Acquisition and Tenancy Act 1950 (Sec 143-144)"
    },
    "pre_purchase_checklist": {
        "keywords": ["কেনার আগে", "যাচাই", "checklist", "pre-purchase", "due diligence", "কিনব"],
        "answer_bn": (
            "**জমি কেনার পূর্বে আবশ্যক ১২-দফা আইনি যাচাই চেকলিস্ট:**\n\n"
            "১. **মূল দলিল ও বায়া দলিল:** বিক্রেতার রেজিস্ট্রি মূল দলিল এবং বিগত ২৫ বছরের বায়া দলিলের ধারাবাহিকতা যাচাই করুন।\n"
            "২. **খতিয়ানের ধারাবাহিকতা:** সিএস (CS) ➔ এসএ (SA) ➔ আরএস (RS) ➔ বিএস/সিটি জরিপ খতিয়ানে নাম ও দাগের মিল আছে কিনা।\n"
            "৩. **হাল নামজারি (Mutation) ও ডিসিআর:** বিক্রেতার নামে নামজারি খতিয়ান, জমাভাগ ডিসিআর (DCR) ও প্রস্তাবিত খতিয়ান সৃষ্টি হয়েছে কিনা।\n"
            "৪. **ভূমি উন্নয়ন কর (খাজনা):** চলতি বাংলা সন পর্যন্ত খাজনা পরিশোধের ই-দাখিলা ও কিউআর কোড যাচাই।\n"
            "৫. **সরেজমিনে দখল ও সীমানা:** বিক্রেতার বাস্তব দখল আছে কিনা, চৌহদ্দি ও পরিমাপ নকশার সাথে মিলিয়ে নেওয়া।\n"
            "৬. **ওয়ারিশান সনদ ও বণ্টননামা:** পৈতৃক সম্পত্তি হলে সকল বৈধ ওয়ারিশের বণ্টননামা দলিল বা রেজিস্ট্রি ফারায়েজ আছে কিনা।\n"
            "৭. **সাব-রেজিস্ট্রি অফিসে এনইসি (NEC):** দায়মুক্তি সনদ (Non-Encumbrance Certificate) তুলে ব্যাংক বন্ধক বা পূর্বে বিক্রি হয়েছে কিনা দেখা।\n"
            "৮. **আদালতের নিষেধাজ্ঞা:** কোনো দেওয়ানি মামলা (Title Suit) বা নিষেধাজ্ঞা (Injunction) আছে কিনা খোঁজ নেওয়া।\n"
            "৯. **খাস, ওয়াকফ বা অর্পিত সম্পত্তি:** জমিটি সরকারি খাস, ভেস্টেড প্রোপার্টি বা অধিগ্রহণভুক্ত কিনা সহকারী কমিশনার (ভূমি) অফিসে যাচাই।"
        ),
        "answer_en": (
            "**Mandatory 12-Step Pre-Purchase Due Diligence Checklist:**\n\n"
            "1. Inspect Original Title Deed and unbroken 25-year chain of Baya deeds.\n"
            "2. Check survey lineage from CS to SA to RS and BS/City Survey.\n"
            "3. Confirm updated Mutation (Namjari), DCR receipt, and distinct Khatian created in seller's name.\n"
            "4. Verify up-to-date Land Development Tax (LD Tax / Khajna) electronic receipt via ldtax.gov.bd.\n"
            "5. Conduct physical site survey to verify actual possession, boundaries, and road access.\n"
            "6. Inspect registered partition deed (Bonton-nama) and legal heir certificate for inherited land.\n"
            "7. Conduct search at Sub-Registry office for Non-Encumbrance Certificate (NEC).\n"
            "8. Check district and local civil courts for pending litigation or injunctions.\n"
            "9. Verify land is not vested, evacuee, khas, waqf, or earmarked for public acquisition."
        ),
        "legal_reference": "Transfer of Property Act 1882 (Sec 54); Registration Act 1908 (Sec 52A); Land Reforms Ordinance 1984"
    },
    "dag_mismatch": {
        "keywords": ["দাগ নম্বর", "খতিয়ান", "না মিললে", "অমিল", "dag mismatch", "plot number"],
        "answer_bn": (
            "**দলিলের দাগ নম্বর এবং খতিয়ানের দাগ নম্বর না মিললে করণীয়:**\n\n"
            "১. **জরিপের পরিবর্তন অনুসন্ধান:** দলিলের দাগটি সিএস (CS) নাকি আরএস (RS) জরিপের তা যাচাই করুন। এক জরিপ থেকে অন্য জরিপে দাগ নম্বর পুনঃবিন্যস্ত হয়। "
            "সংশ্লিষ্ট তহশিল অফিস বা সেটেলমেন্ট অফিস থেকে 'তুলনামূলক বিবরণী' (Survey Correspondence Map) সংগ্রহ করুন।\n"
            "২. **চৌহদ্দি ও বাউন্ডারি মিলিয়ে দেখা:** দাগ নম্বরে মুদ্রণপ্রমাদ থাকলে দলিলের বর্ণিত সীমানা (উত্তর, দক্ষিণ, পূর্ব, পশ্চিম) খতিয়ানের দাগের সাথে মিলে কিনা পরীক্ষা করুন।\n"
            "৩. **ভ্রম সংশোধন বা এওয়াজ দলিল:** যদি দলিলে লেখার ভুলের কারণে ভুল দাগ নম্বর উঠে থাকে, তবে মূল বিক্রেতাকে দিয়ে সাব-রেজিস্ট্রি অফিসে 'ভ্রম সংশোধন দলিল' (Rectification Deed) রেজিস্ট্রি করাতে হবে।\n"
            "৪. **নামজারি সংশোধন আবেদন:** সহকারী কমিশনার (ভূমি) বা এসি ল্যান্ড বরাবর রেকর্ড সংশোধনের জন্য বিধি মোতাবেক মিসকেস (Miss Case) দাখিল করতে পারেন।"
        ),
        "answer_en": (
            "**Action Plan if Deed Dag Number Does Not Match Khatian Dag Number:**\n\n"
            "1. **Survey Correspondence Check:** Check whether the deed references CS dag while the khatian shows RS dag. Obtain an official survey correspondence comparison sheet from the Settlement Office.\n"
            "2. **Boundary Cross-Reference:** Compare geographical boundaries (North, South, East, West) in the deed against the khatian.\n"
            "3. **Rectification Deed:** If a typographical error occurred, execute a registered Rectification Deed (Bhrom Songshodhon) signed by the original vendor.\n"
            "4. **AC Land Miss Case:** Submit a formal correction petition to the Assistant Commissioner (Land) under SAT Act section 143."
        ),
        "legal_reference": "Specific Relief Act 1877 (Sec 31); State Acquisition and Tenancy Act 1950 (Sec 143)"
    },
    "registration_cost_info": {
        "keywords": ["রেজিস্ট্রেশন খরচ", "কত খরচ", "ফি", "registration cost", "stamp duty"],
        "answer_bn": (
            "**বাংলাদেশে জমি রেজিস্ট্রেশনের আনুমানিক সরকারি খরচ হিসাব কাঠামো:**\n\n"
            "১. **স্ট্যাম্প শুল্ক (Stamp Duty):** দলিল মূল্যের ১.৫% (স্ট্যাম্প আইন ১৮৯৯ অনুসারে)\n"
            "২. **নিবন্ধন ফি (Registration Fee):** দলিল মূল্যের ১.০%\n"
            "৩. **স্থানীয় সরকার কর (Local Govt Tax):** ইউনিয়ন পরিষদ ১%, পৌরসভা ২%, সিটি কর্পোরেশন ৩%\n"
            "৪. **উৎস কর (AIT / Sec 53H):** বাণিজ্যিক/সিটি এলাকায় ৩-৪%, অন্যান্য এলাকায় এলাকাভিত্তিক নির্ধারিত হার\n"
            "৫. **অন্যান্য চার্জ:** ই-ফি, হলফনামা ও এন-ফি বাবদ প্রায় ৫০০ - ১,০০০ টাকা\n\n"
            "মোট খরচ সাধারণত দলিল মূল্যের প্রায় ৭% থেকে ৯% এর মধ্যে হয়। আপনার সুনির্দিষ্ট জমির দাগ ও দলিল মূল্যের সঠিক খরচ হিসাব করতে আমাদের 'নিবন্ধন খরচ ক্যালকুলেটর' মেন্যু ব্যবহার করুন।"
        ),
        "answer_en": (
            "**Estimated Land Registration Statutory Fee Structure in Bangladesh:**\n\n"
            "1. Stamp Duty: 1.5% of deed value (Stamp Act 1899)\n"
            "2. Registration Fee: 1.0% of deed value (Registration Act 1908)\n"
            "3. Local Government Tax: 1% (Union Parishad), 2% (Pourashava), 3% (City Corporation)\n"
            "4. Advance Income Tax (AIT u/s 53H): 3% - 4% depending on location and residential classification\n"
            "5. Incidental fees (E-fee, Affidavit stamp, N-fee): Approx BDT 500 - 1,000\n\n"
            "Total statutory expenditure typically ranges between 7% and 9% of deed consideration. Use our interactive Registration Calculator to get exact figures."
        ),
        "legal_reference": "Registration Act 1908; Stamp Act 1899; Finance Act 2023"
    },
    "lawyer_recommendation": {
        "keywords": ["আইনজীবী", "আইনজীবি", "উকিল", "পরামর্শ", "lawyer", "advocate", "counsel"],
        "answer_bn": (
            "**জমি সংক্রান্ত বিষয়ে অভিজ্ঞ আইনজীবী নির্বাচন:**\n\n"
            "ল্যান্ডসিওর এআই-এর ডাটাবেজে ৫০ জন অভিজ্ঞ ভূমি আইন বিশেষজ্ঞ আইনজীবীর প্রোফাইল সংরক্ষিত আছে। "
            "আপনার জমির খতিয়ান জটিলতা, দ্বৈত বিক্রয় ঝুঁকি, নামজারি মামলা বা দলিল যাচাইয়ের জন্য আপনি সরাসরি আইনজীবী মেন্যু থেকে জেলা ও বিষয়ভিত্তিক বিজ্ঞ আইনজীবী নির্বাচন করতে পারেন এবং সরাসরি পরামর্শের অ্যাপয়েন্টমেন্ট শিডিউল করতে পারেন।\n\n"
            "আমাদের 'বিজ্ঞ আইনজীবী' (Legal Experts) ট্যাবে গিয়ে আপনার জেলার আইনজীবী বেছে নিন।"
        ),
        "answer_en": (
            "**Land Specialist Legal Counsel Recommendation:**\n\n"
            "LandSure AI connects you with 50 verified synthetic property advocate profiles specializing in Mutation disputes, Title searches, Boundary litigation, and Sub-Registry deed verification. "
            "Browse our 'Legal Experts' tab to filter counsel by District and book an advisory consultation."
        ),
        "legal_reference": "Bangladesh Legal Practitioners and Bar Council Order 1972"
    },
    "document_extract_guidance": {
        "keywords": ["আপলোড", "দলিল থেকে", "মালিকের নাম", "extract", "uploaded deed"],
        "answer_bn": (
            "**আপলোড করা দলিল থেকে মালিকের নাম ও তথ্য নিষ্কাশন:**\n\n"
            "আপনার আপলোড করা দলিলটির জন্য আমাদের 'দলিল ইন্টেলিজেন্স' (Document Intelligence) মডিউল ব্যবহার করুন। "
            "সেখানে দলিল আপলোড করার সাথে সাথে স্বয়ংক্রিয় বাংলা ওসিআর (OCR) প্রযুক্তির মাধ্যমে:\n"
            "- দাতা (বিক্রেতা) ও গ্রহীতার (ক্রেতার) নাম\n"
            "- দলিল নম্বর, তারিখ ও সাব-রেজিস্ট্রি অফিস\n"
            "- দাগ, খতিয়ান, মৌজা ও জমির পরিমাণ\n"
            "স্বয়ংক্রিয়ভাবে পৃথক ছকে প্রদর্শন করা হবে এবং প্রয়োজনে আপনি তা ম্যানুয়ালি সংশোধন করতে পারবেন।"
        ),
        "answer_en": (
            "**Extracting Owner & Property Information from Uploaded Deed:**\n\n"
            "Please use our 'Document Intelligence' tab to upload your deed (PDF, PNG, JPG). "
            "Our Bangla OCR pipeline will automatically extract:\n"
            "- Vendor (Seller) and Purchaser (Buyer) names\n"
            "- Deed Number, Registration Date, Sub-Registry Office\n"
            "- Dag, Khatian, Mouza, and normalized area (in Decimals)\n"
            "You can review, correct, and confirm these extracted fields directly."
        ),
        "legal_reference": "LandSure Document AI Pipeline"
    }
}


def query_gemini_api(prompt: str, system_instruction: str) -> Optional[str]:
    """
    Optional Gemini integration via backend environment variable GEMINI_API_KEY.
    Never exposed to client. Robust timeout, safety limits, and graceful fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800,
        }
    }

    try:
        import httpx
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
    except Exception as exc:
        print(f"Gemini API request failed (falling back to local engine): {exc}")

    return None


def handle_followup_question(
    followup: str,
    last_answer: str,
    topic: Optional[str],
    parcel_id: Optional[str],
    lang: str = "bn"
) -> Dict[str, Any]:
    """
    Handles conversational follow-ups: 'কেন?', 'আরও সহজ করে বলো', 'এর প্রমাণ কোথায়?'
    """
    norm_q = followup.strip().lower()

    # 1. "কেন?" / "Why?"
    if norm_q in ["কেন?", "কেন", "why?", "why"]:
        if lang == "bn":
            ans = (
                f"**বিশ্লেষণ ও আইনি কারণ:**\n\n"
                f"উপরে উল্লেখিত বিষয়টি জমি সংক্রান্ত জটিলতা ও জালিয়াতি রোধের জন্য অত্যন্ত গুরুত্বপূর্ণ। "
                f"বাংলাদেশে রেজিস্ট্রেশন আইন ১৯০৮ এবং রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইন ১৯৫০ অনুযায়ী, "
                f"কোনো জমিতে যদি স্বত্ব বা দখল সংক্রান্ত ত্রুটি থাকে তবে ভবিষ্যতে ক্রেতার অনুকূলে নামজারি বাতিল বা চুক্তি বাতিল (Cancellation of Deed) হতে পারে। "
                f"এই কারণেই সংশ্লিষ্ট খতিয়ান, দাখিলা ও সরেজমিন দখল পুঙ্খানুপুঙ্খভাবে যাচাই করা আবশ্যক।"
            )
        else:
            ans = (
                f"**Legal Rationale:**\n\n"
                f"Under the Registration Act 1908 and SAT Act 1950, failure to verify unbroken chain of title, "
                f"proper mutation, and ground possession exposes the buyer to deed cancellation suits or title invalidation. "
                f"Strict verification is therefore required to prevent fraudulent transactions."
            )
        return {
            "status": "FOLLOWUP_ANSWERED",
            "answer": ans,
            "followup_type": "WHY_EXPLANATION",
            "answer_type": "GENERAL_EDUCATIONAL"
        }

    # 2. "আরও সহজ করে বলো" / "Explain simply"
    if any(phrase in norm_q for phrase in ["সহজ", "সহজ করে", "explain simply", "simple", "simpler"]):
        if lang == "bn":
            ans = (
                f"**সহজ বাংলায় সারসংক্ষেপ:**\n\n"
                f"• **সোজা কথা:** জমি কেনার আগে নিশ্চিত হোন যে বিক্রেতার নামে আসল দলিল আছে, খতিয়ানে তার নাম উঠেছে এবং সরকারিতে খাজনা দেওয়া আছে।\n"
                f"• **কী করবেন:** সরেজমিনে গিয়ে প্রতিবেশীদের জিজ্ঞেস করুন এবং কোনো ঝামেলা থাকলে অবশ্যই আইনজীবীর পরামর্শ নিন।\n"
                f"• **মনে রাখবেন:** শুধু কথায় বিশ্বাস না করে কাগজের প্রমাণ মিলিয়ে দেখা জরুরি।"
            )
        else:
            ans = (
                f"**Simple Summary:**\n\n"
                f"• **Bottom Line:** Ensure the seller holds original deeds, has mutated khatian in their name, and paid land tax.\n"
                f"• **Action:** Verify physical ground possession and inspect neighbor boundaries.\n"
                f"• **Caution:** Never purchase land based solely on oral assurances without verified paperwork."
            )
        return {
            "status": "FOLLOWUP_ANSWERED",
            "answer": ans,
            "followup_type": "SIMPLIFIED_EXPLANATION",
            "answer_type": "GENERAL_EDUCATIONAL"
        }

    # 3. "এর প্রমাণ কোথায়?" / "Where is the evidence?"
    if any(phrase in norm_q for phrase in ["প্রমাণ", "প্রমাণ কোথায়", "evidence", "proof"]):
        evidence_records = []
        if parcel_id:
            with sqlite3.connect(DB_PATH.resolve().as_uri() + "?mode=ro", uri=True) as conn:
                conn.row_factory = sqlite3.Row
                surveys = conn.execute("SELECT * FROM survey_records WHERE parcel_id = ? LIMIT 3", (parcel_id,)).fetchall()
                txs = conn.execute("SELECT * FROM transactions WHERE parcel_id = ? LIMIT 3", (parcel_id,)).fetchall()
                for s in surveys:
                    evidence_records.append({"source_table": "survey_records", "source_record_id": s["survey_record_id"], "data": dict(s)})
                for t in txs:
                    evidence_records.append({"source_table": "transactions", "source_record_id": t["transaction_id"], "data": dict(t)})

        if lang == "bn":
            ans = (
                f"**আইনি ও ডাটাবেজ প্রমাণসূত্র:**\n\n"
                f"১. **আইনগত ভিত্তি:** রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ৫২এ), বঙ্গীয় প্রজাস্বত্ব আইন ১৮৮৫ এবং ভূমি সংস্কার অধ্যাদেশ ১৯৮৪।\n"
                f"২. **রেকর্ড সূত্র:** সহকারী কমিশনার (ভূমি) অফিসের রেকর্ড রুম, সাব-রেজিস্ট্রি অফিসের বালাম বহি ও জেলা জজ আদালতের রেকর্ড।"
            )
            if parcel_id and evidence_records:
                ans += f"\n৩. **পার্সেল {parcel_id}-এর প্রমাণ:** ডাটাবেজের `survey_records` ও `transactions` টেবিলে {len(evidence_records)}টি রেকর্ড যুক্ত রয়েছে।"
        else:
            ans = (
                f"**Statutory and Evidentiary Provenance:**\n\n"
                f"1. **Statutory Grounds:** Registration Act 1908 (Sec 52A), Transfer of Property Act 1882, and State Acquisition & Tenancy Act 1950.\n"
                f"2. **Official Repositories:** AC Land Record Room, Sub-Registry Volume Books, and District Civil Court archives."
            )
            if parcel_id and evidence_records:
                ans += f"\n3. **Evidence Records for {parcel_id}:** {len(evidence_records)} matching rows retrieved from database tables."

        return {
            "status": "FOLLOWUP_ANSWERED",
            "answer": ans,
            "followup_type": "EVIDENCE_REFERENCE",
            "evidence": evidence_records,
            "answer_type": "PARCEL_EVIDENCE" if evidence_records else "GENERAL_EDUCATIONAL"
        }

    return {}


def process_assistant_query(
    question: str,
    parcel_id: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    document_hash: Optional[str] = None,
    language: str = "bn"
) -> Dict[str, Any]:
    """
    Rebuilt LandSure AI Conversational Assistant Engine (Layers A, B, C, D).
    """
    clean_q = question.strip()
    history = history or []

    # Detect parcel ID in query text if not explicitly provided
    if not parcel_id:
        p_matches = PARCEL_PATTERN.findall(clean_q)
        if p_matches:
            parcel_id = p_matches[0].upper()

    # 1. Handle Follow-up questions if conversation history exists
    if history and len(clean_q.split()) <= 4:
        last_assistant_msg = ""
        for msg in reversed(history):
            if msg.get("role") == "assistant":
                last_assistant_msg = msg.get("content", "")
                break
        if last_assistant_msg:
            followup_res = handle_followup_question(clean_q, last_assistant_msg, None, parcel_id, language)
            if followup_res:
                followup_res.update({
                    "parcel_id": parcel_id,
                    "question": clean_q,
                    "synthetic": True,
                    "legal_conclusion": False,
                    "disclaimer_bn": DISCLAIMER_BN,
                    "disclaimer_en": DISCLAIMER_EN,
                })
                return followup_res

    # 2. Layer B: Existing trained models (Router V4 and Gate V2)
    router_info = {}
    gate_label = "LAND_QUERY"
    feature_id = 18
    try:
        router_info = classify_with_v4(clean_q)
        gate_label = router_info.get("gate_label", "LAND_QUERY")
        feature_id = router_info.get("router_candidate_feature_id", 18)
    except Exception as exc:
        print(f"Router V4 classification error: {exc}")

    # Check for general educational questions in knowledge base
    norm_q = clean_q.lower()
    matched_kb_key = None
    for key, item in GENERAL_KNOWLEDGE_BASE.items():
        if any(kw in norm_q for kw in item["keywords"]):
            matched_kb_key = key
            break

    # 3. Layer C: Grounded Retrieval
    evidence_rows = []
    grounded_context = ""
    answer_text = ""
    answer_type = "GENERAL_EDUCATIONAL"
    detected_topic = None

    # If asking for parcel specific info or parcel_id is present
    if parcel_id:
        try:
            parcel = get_parcel(parcel_id)
            if not parcel:
                raise ValueError(f"Parcel {parcel_id} not found")

            # Check specific parcel topics:
            # A. Ownership history / timeline
            if any(w in norm_q for w in ["মালিকানা", "ইতিহাস", "আগের মালিক", "ownership", "timeline"]):
                detected_topic = "ownership"
                chain = get_ownership_chain(parcel_id)
                txs = chain.get("transactions_timeline", [])
                answer_type = "PARCEL_EVIDENCE"
                if txs:
                    lines = [f"{i+1}. তারিখ: {t.get('transaction_date')} · ধরন: {t.get('transaction_type')} · দাতা: {t.get('seller_name')} ➔ গ্রহীতা: {t.get('buyer_name')}" for i, t in enumerate(txs)]
                    answer_text = (
                        f"**পার্সেল {parcel_id}-এর ২৫ বছরের মালিকানার ইতিহাস (Chain of Title):**\n\n"
                        + "\n".join(lines)
                        + f"\n\n**বর্তমান সক্রিয় মালিক:** {parcel.get('owner_name')}\n"
                        + "সবগুলো বায়া দলিল ও মূল দলিলের তথ্য ডাটাবেজের `transactions` টেবিলে সংরক্ষিত রয়েছে।"
                    )
                    evidence_rows = [{"source_table": "transactions", "source_record_id": t.get("transaction_id"), "data": t} for t in txs]
                else:
                    answer_text = f"পার্সেল {parcel_id}-এর জন্য কোনো লেনদেন রেকর্ড পাওয়া যায়নি।"

            # B. Mutation / Namjari
            elif any(w in norm_q for w in ["নামজারি", "মিউটেশন", "mutation", "namjari"]):
                detected_topic = "mutation"
                answer_type = "PARCEL_EVIDENCE"
                with sqlite3.connect(DB_PATH.resolve().as_uri() + "?mode=ro", uri=True) as conn:
                    conn.row_factory = sqlite3.Row
                    mut_rows = conn.execute("SELECT * FROM mutations WHERE parcel_id = ?", (parcel_id,)).fetchall()
                if mut_rows:
                    m = mut_rows[0]
                    answer_text = (
                        f"**পার্সেল {parcel_id}-এর নামজারি অবস্থা:**\n\n"
                        f"• **স্ট্যাটাস:** {m['mutation_status']}\n"
                        f"• **মিউটেশন আইডি:** {m['mutation_id']}\n"
                        f"• **তারিখ:** {m['mutation_date']}\n"
                        f"• **পর্যালোচনা পর্যবেক্ষণ:** {m['review_reason'] or 'কোনো আপত্তি নেই'}\n"
                        f"• **সুপারিশ:** {m['recommended_action'] or 'রেকর্ড হালনাগাদ রয়েছে'}"
                    )
                    evidence_rows = [{"source_table": "mutations", "source_record_id": m["mutation_id"], "data": dict(m)}]
                else:
                    answer_text = f"পার্সেল {parcel_id}-এর জন্য কোনো নামজারি রেকর্ড ডাটাবেজে নেই।"

            # C. Tax / Khajna
            elif any(w in norm_q for w in ["খাজনা", "ভূমি কর", "tax", "khajna"]):
                detected_topic = "tax"
                answer_type = "PARCEL_EVIDENCE"
                tax_data = get_tax_verification(parcel_id)
                if tax_data.get("records"):
                    r = tax_data["records"][0]
                    answer_text = (
                        f"**পার্সেল {parcel_id}-এর ভূমি উন্নয়ন কর (খাজনা) তথ্য:**\n\n"
                        f"• **দাখিলা স্ট্যাটাস:** পরিশোধিত\n"
                        f"• **অর্থবছর:** {r.get('fiscal_year', 'হাল সন')}\n"
                        f"• **রশিদ নম্বর:** {r.get('receipt_no', 'N/A')}\n"
                        f"• **পরিশোধের তারিখ:** {r.get('payment_date', 'N/A')}"
                    )
                    evidence_rows = [{"source_table": "tax_evidence", "source_record_id": r.get("tax_id", "1"), "data": r}]
                else:
                    answer_text = (
                        f"**পার্সেল {parcel_id}-এর ভূমি উন্নয়ন কর তথ্য:**\n\n"
                        f"{tax_data.get('message_bn')}\n"
                        f"অনলাইনে দাখিলা পরীক্ষার জন্য ldtax.gov.bd পোর্টাল ব্যবহার করুন।"
                    )

            # D. Comprehensive summary / All info
            elif any(w in norm_q for w in ["সব তথ্য", "বিস্তারিত", "all info", "overview", "সম্পর্কে"]):
                detected_topic = "parcel_overview"
                answer_type = "PARCEL_EVIDENCE"
                ml_res = predict_parcel_review(parcel_id)
                tax_res = get_tax_verification(parcel_id)
                answer_text = (
                    f"**পার্সেল {parcel_id}-এর সমন্বিত যাচাই সারসংক্ষেপ:**\n\n"
                    f"• **মালিকের নাম:** {parcel.get('owner_name')}\n"
                    f"• **মৌজা ও জেলা:** {parcel.get('mouza_name_bn')} ({parcel.get('mouza_code')}), {parcel.get('district_code')}\n"
                    f"• **রেফারেন্স আয়তন:** {parcel.get('reference_area_decimal')} শতাংশ ({parcel.get('land_classification_bn')})\n"
                    f"• **এমএল ঝুঁকি স্তর:** {ml_res.get('risk_level')} (পর্যালোচনা সম্ভাবনা: {((ml_res.get('review_probability') or 0.0) * 100):.1f}%)\n"
                    f"• **ঝুঁকি সংকেত:** {', '.join(ml_res.get('key_risk_signals', [])) or 'কোনো গুরুতর অসঙ্গতি নেই'}\n"
                    f"• **খাজনা অবস্থা:** {'দাখিলা পাওয়া গেছে' if tax_res.get('records') else 'সরেজমিন/ldtax.gov.bd যাচাই আবশ্যক'}"
                )
                evidence_rows = [
                    {"source_table": "parcels", "source_record_id": parcel_id, "data": parcel},
                    {"source_table": "ml_risk_evaluation", "source_record_id": "v2", "data": ml_res}
                ]

        except Exception as exc:
            answer_text = f"পার্সেল {parcel_id} সংক্রান্ত তথ্য অনুসন্ধানে সমস্যা হয়েছে: {str(exc)}"

    # If general knowledge question matched and no parcel answer created yet
    if not answer_text and matched_kb_key:
        kb_entry = GENERAL_KNOWLEDGE_BASE[matched_kb_key]
        answer_text = kb_entry["answer_bn"] if language == "bn" else kb_entry["answer_en"]
        answer_type = "GENERAL_EDUCATIONAL"
        grounded_context = answer_text

    # Default fallback answer if still empty
    if not answer_text:
        if not parcel_id:
            answer_text = (
                "**ল্যান্ডসিওর এআই সহকারী:**\n\n"
                "আমি বাংলাদেশ ভূমি আইন, দলিল যাচাই, নামজারি, খতিয়ান (CS/SA/RS/BS), এবং রেজিস্ট্রেশন সম্পর্কিত প্রশ্নের উত্তর দিতে পারি।\n\n"
                "• কোনো নির্দিষ্ট জমির রেকর্ড পরীক্ষা করতে অনুগ্রহ করে **Parcel ID** (যেমন: `LS-PARCEL-000001`) প্রদান করুন।\n"
                "• অথবা জিজ্ঞাসা করুন: *'CS আর RS খতিয়ানের পার্থক্য কী?'*, *'জমি কেনার আগে কী কী যাচাই করব?'*, *'দলিলের দাগ আর খতিয়ানের দাগ না মিললে কী করব?'* ইত্যাদি।"
            )
            answer_type = "GENERAL_EDUCATIONAL"
        else:
            answer_text = (
                f"পার্সেল {parcel_id} সম্পর্কে আপনার নির্দিষ্ট বিষয়টি বিস্তারিত লিখুন। "
                f"যেমন: নামজারি অবস্থা, মালিকানার ইতিহাস, বা খাজনা পরিশোধের তথ্য।"
            )
            answer_type = "PARCEL_EVIDENCE"

    # 4. Layer D: Optional Gemini Integration
    gemini_used = False
    system_instruction = (
        "You are LandSure AI's official land intelligence assistant for Bangladesh. "
        "Ground your answer strictly on Bangladesh land law and the provided factual context. "
        "Do NOT invent government certifications, clearance certificates, or dispute-free claims. "
        "Always maintain that records are synthetic demo data and formal legal matters require consulting a registered Advocate."
    )

    gemini_prompt = (
        f"User Query: {clean_q}\n"
        f"Language: {language}\n"
        f"Parcel ID: {parcel_id or 'None'}\n"
        f"Grounded Context / Factual Answer:\n{answer_text}\n\n"
        f"Please provide a natural, highly helpful, polite response in {'Bangla' if language == 'bn' else 'English'} "
        f"conveying all the facts accurately."
    )

    gemini_refined = query_gemini_api(gemini_prompt, system_instruction)
    if gemini_refined:
        answer_text = gemini_refined
        gemini_used = True

    return {
        "status": "EVIDENCE_FOUND" if evidence_rows else "EDUCATIONAL_ANSWER",
        "topic": detected_topic or matched_kb_key or ("parcel_inquiry" if parcel_id else "general_land"),
        "feature_id": feature_id,
        "gate_label": gate_label,
        "parcel_id": parcel_id,
        "answer": answer_text,
        "answer_type": answer_type,
        "evidence": evidence_rows,
        "grounded_sources": [matched_kb_key] if matched_kb_key else (["synthetic_database"] if evidence_rows else []),
        "gemini_used": gemini_used,
        "verified": False,
        "data_type": "synthetic",
        "legal_conclusion": False,
        "disclaimer_bn": DISCLAIMER_BN,
        "disclaimer_en": DISCLAIMER_EN,
    }
