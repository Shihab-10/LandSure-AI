
from typing import Any

DISCLAIMER = (
    "Synthetic demonstration only. "
    "Not official land verification, proof of ownership, "
    "a fraud determination, or purchase clearance."
)

LANGUAGE_MESSAGES = {
    "en": {
        "review": "This synthetic parcel has findings requiring further record review.",
        "no_flags": "No flags were found by the checked synthetic rules. This does not establish that the land is safe to purchase.",
        "unavailable": "A verified review summary is unavailable for this synthetic parcel.",
    },
    "bn": {
        "review": "এই কৃত্রিম জমির রেকর্ডে কিছু বিষয় পাওয়া গেছে, যেগুলো আরও যাচাই করা প্রয়োজন।",
        "no_flags": "পরীক্ষা করা কৃত্রিম নিয়মে কোনো সতর্কতা পাওয়া যায়নি। এর অর্থ জমি কেনা নিরাপদ, এমন নয়।",
        "unavailable": "এই কৃত্রিম জমির জন্য যাচাইয়ের সারসংক্ষেপ পাওয়া যায়নি।",
    },
    "banglish": {
        "review": "Ei synthetic jomir record-e kichu bishoy ache, jegulo aro review kora proyojon.",
        "no_flags": "Checked synthetic rules-e kono flag paoa jayni. Er mane jomi kena safe, emon noy.",
        "unavailable": "Ei synthetic parcel-er review summary paoa jayni.",
    },
}


def normalize_language(language: str) -> str:
    value = str(language or "en").lower().strip()

    aliases = {
        "bangla": "bn",
        "bengali": "bn",
        "english": "en",
        "bn-bd": "bn",
    }

    value = aliases.get(value, value)

    return value if value in LANGUAGE_MESSAGES else "en"


def build_ai_answer(
    parcel_id: str,
    intent: str,
    language: str,
    verification: Any,
    advisor: Any,
) -> dict:
    language = normalize_language(language)
    messages = LANGUAGE_MESSAGES[language]

    verification = (
        verification if isinstance(verification, dict) else {}
    )
    advisor = advisor if isinstance(advisor, dict) else {}

    findings = verification.get("findings", [])
    if not isinstance(findings, list):
        findings = []

    review_status = verification.get("status", "UNKNOWN")

    if not verification:
        answer = messages["unavailable"]
        response_status = "EVIDENCE_UNAVAILABLE"

    elif review_status == "REVIEW_REQUIRED":
        answer = messages["review"]
        response_status = "SUCCESS"

    elif review_status == "NO_FLAG_IN_CHECKED_RULES":
        answer = messages["no_flags"]
        response_status = "SUCCESS"

    else:
        answer = messages["unavailable"]
        response_status = "REVIEW_STATUS_UNKNOWN"

    evidence_references = []
    recommended_actions = []
    structured_findings = []

    for finding in findings:
        if not isinstance(finding, dict):
            continue

        refs = finding.get("evidence_refs") or []
        if not isinstance(refs, list):
            refs = []

        action = finding.get("recommended_action")

        structured_findings.append({
            "rule_id": finding.get("rule_id"),
            "category": finding.get("category"),
            "severity": finding.get("severity"),
            "message": finding.get("message"),
            "evidence_refs": refs,
            "recommended_action": action,
        })

        for ref in refs:
            if isinstance(ref, str) and ref not in evidence_references:
                evidence_references.append(ref)

        if isinstance(action, str) and action not in recommended_actions:
            recommended_actions.append(action)

    explanations = advisor.get("explanations", [])
    if not isinstance(explanations, list):
        explanations = []

    for explanation in explanations:
        if not isinstance(explanation, dict):
            continue

        action = explanation.get("recommended_action")

        if isinstance(action, str) and action not in recommended_actions:
            recommended_actions.append(action)

    advisor_summary = advisor.get("summary")

    if not isinstance(advisor_summary, str):
        advisor_summary = None

    return {
        "status": response_status,
        "parcel_id": parcel_id,
        "intent": intent,
        "language": language,
        "answer": answer,
        "advisor_summary": advisor_summary,
        "review_status": review_status,
        "total_findings": len(structured_findings),
        "findings": structured_findings,
        "evidence_references": evidence_references,
        "recommended_actions": recommended_actions,
        "review_checklist": advisor.get("review_checklist", []),
        "synthetic": True,
        "officially_verified": False,
        "purchase_clearance": False,
        "disclaimer": DISCLAIMER,
    }
