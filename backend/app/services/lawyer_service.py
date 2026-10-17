"""
LandSure AI — Database-Backed Legal Expert Service
Queries synthetic lawyer profiles, availability, and specializations directly from SQLite.
"""

from pathlib import Path
import sqlite3
from typing import Optional, List, Dict, Any
from app.services.database import connect_db

RULE_SPECIALIZATION_MAP = {
    "MUTATION": "Mutation / Namjari",
    "NAMJARI": "Mutation / Namjari",
    "SURVEY": "Boundary & Property Disputes",
    "BOUNDARY": "Boundary & Property Disputes",
    "DEED": "Deed Verification & Registration",
    "REGISTRATION": "Deed Verification & Registration",
    "OWNERSHIP": "Land Ownership & Title Verification",
    "INHERITANCE": "Inheritance & Succession",
    "SUCCESSION": "Inheritance & Succession",
    "TAX": "Land Development Tax Verification",
}

def get_lawyers(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Retrieve all verified synthetic lawyers with their specializations."""
    with connect_db() as conn:
        lawyer_rows = conn.execute("""
            SELECT lawyer_id, display_name, location_label, experience_years, languages, verification_status
            FROM lawyer_profiles
            WHERE is_synthetic = 1
            ORDER BY lawyer_id
        """).fetchall()

        spec_rows = conn.execute("""
            SELECT lawyer_id, specialization_name
            FROM lawyer_specializations
        """).fetchall()

    specs_by_lawyer: Dict[str, List[str]] = {}
    for row in spec_rows:
        specs_by_lawyer.setdefault(row["lawyer_id"], []).append(row["specialization_name"])

    lawyers = []
    for row in lawyer_rows:
        lid = row["lawyer_id"]
        lawyers.append({
            "lawyer_id": lid,
            "display_name": row["display_name"],
            "location": row["location_label"],
            "experience_years": row["experience_years"],
            "languages": row["languages"],
            "specializations": specs_by_lawyer.get(lid, []),
            "verification_status": row["verification_status"],
            "synthetic_demo": True,
            "officially_verified": False,
        })

    return lawyers


def recommend_lawyers(
    db_path: Optional[Path] = None,
    verification_rules: Optional[List[str]] = None,
    preferred_location: Optional[str] = None,
    preferred_language: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """Rank lawyers by relevance to parcel verification findings and user preferences."""
    lawyers = get_lawyers(db_path)
    rules = verification_rules or []

    # Map verification rules to relevant specialization keywords
    target_specs = set()
    for rule in rules:
        r_upper = rule.upper()
        for kw, spec in RULE_SPECIALIZATION_MAP.items():
            if kw in r_upper:
                target_specs.add(spec.lower())

    scored_lawyers = []
    for lawyer in lawyers:
        score = 0
        matches = []

        # Location preference (30 points)
        if preferred_location:
            if preferred_location.casefold() in lawyer["location"].casefold():
                score += 30
                matches.append(f"Location match: {lawyer['location']}")

        # Language preference (15 points)
        if preferred_language:
            if preferred_language.casefold() in lawyer["languages"].casefold():
                score += 15
                matches.append(f"Language: {preferred_language}")

        # Specialization matching (20 points per match)
        lawyer_specs_lower = [s.lower() for s in lawyer["specializations"]]
        for target in target_specs:
            if any(target in s for s in lawyer_specs_lower):
                score += 20
                matches.append(f"Specialization: {target.title()}")

        # Experience factor (up to 10 points)
        exp = lawyer.get("experience_years", 0) or 0
        score += min(exp, 10)

        lawyer_copy = dict(lawyer)
        lawyer_copy["match_score"] = score
        lawyer_copy["match_reasons"] = matches
        scored_lawyers.append(lawyer_copy)

    # Sort descending by match score, then experience
    scored_lawyers.sort(key=lambda x: (x["match_score"], x["experience_years"]), reverse=True)

    return {
        "synthetic_demo": True,
        "officially_verified": False,
        "total_matches": len(scored_lawyers),
        "recommended_lawyers": scored_lawyers[:limit],
    }
