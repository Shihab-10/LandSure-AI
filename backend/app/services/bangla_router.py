
import re

RISK_WORDS = (
    "ঝুঁকি",
    "জালিয়াতি",
    "জালিয়াতি",
    "প্রতারণা",
)

SURVEY_WORDS = (
    "জরিপ",
    "সার্ভে",
)

COMPARE_WORDS = (
    "তুলনা",
    "পার্থক্য",
    "মিলিয়ে",
    "মিলিয়ে",
)

OWNERSHIP_WORDS = (
    "মালিকানা",
    "মালিক",
)

def detect_explicit_bangla_intent(question):
    text = str(question or "").strip()

    # Only apply to queries containing Bengali script.
    if not re.search(r"[\u0980-\u09FF]", text):
        return None

    has_risk = any(word in text for word in RISK_WORDS)
    has_survey = any(word in text for word in SURVEY_WORDS)
    has_compare = any(word in text for word in COMPARE_WORDS)
    has_owner = any(word in text for word in OWNERSHIP_WORDS)

    matches = []

    if has_risk:
        matches.append("FRAUD_RISK")

    if has_survey and has_compare:
        matches.append("SURVEY_COMPARISON")

    if has_owner:
        matches.append("OWNERSHIP_CHECK")

    # Avoid overriding mixed or ambiguous questions.
    if len(matches) == 1:
        return matches[0]

    return None
