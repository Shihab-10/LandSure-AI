"""
LandSure AI — Database-Backed Legal Expert Service
Queries synthetic lawyer profiles, availability, and specializations directly from SQLite.
"""

from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from typing import Optional, List, Dict, Any
import uuid
from app.services.database import connect_db, DB_PATH

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


# ---------------------------------------------------------
# Phase 4E: Synthetic Demonstration Consultation Booking Service
# ---------------------------------------------------------

class BookingError(Exception):
    """Base error for booking operations."""
    pass

class ResourceNotFound(BookingError):
    """Requested resource (lawyer, slot, booking) was not found."""
    pass

class SlotUnavailable(BookingError):
    """Slot is already booked or inactive."""
    pass

class InvalidBooking(BookingError):
    """Booking payload validation failed."""
    pass

class AccessDenied(BookingError):
    """Requester does not have permission to access or cancel this booking."""
    pass


def get_available_slots(db_path: Optional[Path] = None, lawyer_id: str = "") -> Dict[str, Any]:
    """Retrieve available consultation time slots for a given lawyer."""
    active_path = Path(db_path or DB_PATH).resolve()

    with sqlite3.connect(active_path) as conn:
        conn.row_factory = sqlite3.Row
        lawyer = conn.execute(
            "SELECT lawyer_id, display_name FROM lawyer_profiles WHERE lawyer_id = ?",
            (lawyer_id,)
        ).fetchone()

        if not lawyer:
            raise ResourceNotFound(f"Lawyer profile '{lawyer_id}' not found.")

        rows = conn.execute("""
            SELECT availability_id, lawyer_id, start_time, end_time, availability_status
            FROM lawyer_availability
            WHERE lawyer_id = ?
            ORDER BY start_time ASC
        """, (lawyer_id,)).fetchall()

    return {
        "lawyer_id": lawyer_id,
        "lawyer_name": lawyer["display_name"],
        "synthetic_demo": True,
        "slots": [dict(r) for r in rows],
        "available_count": sum(1 for r in rows if r["availability_status"] == "AVAILABLE"),
    }


def create_booking(
    db_path: Optional[Path] = None,
    lawyer_id: str = "",
    availability_id: str = "",
    requester: str = "",
    consultation_mode: str = "CHAT",
    parcel_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create an atomic demonstration consultation booking in SQLite."""
    active_path = Path(db_path or DB_PATH).resolve()

    clean_requester = (requester or "").strip()
    if not clean_requester:
        raise InvalidBooking("A valid requester identity is required.")

    clean_lawyer_id = (lawyer_id or "").strip()
    if not clean_lawyer_id:
        raise InvalidBooking("A valid lawyer identity is required.")

    clean_availability_id = (availability_id or "").strip()
    if not clean_availability_id:
        raise InvalidBooking("A valid availability slot identity is required.")

    valid_modes = {"CHAT", "DEMO_CALL"}
    if consultation_mode not in valid_modes:
        raise InvalidBooking(f"Invalid consultation mode '{consultation_mode}'. Must be one of {valid_modes}.")

    with sqlite3.connect(active_path) as conn:
        conn.row_factory = sqlite3.Row

        # Check lawyer
        lawyer = conn.execute(
            "SELECT lawyer_id, display_name, location_label FROM lawyer_profiles WHERE lawyer_id = ?",
            (clean_lawyer_id,)
        ).fetchone()
        if not lawyer:
            raise ResourceNotFound(f"Lawyer '{lawyer_id}' does not exist.")

        # Check slot
        slot = conn.execute(
            "SELECT availability_id, lawyer_id, start_time, end_time, availability_status FROM lawyer_availability WHERE availability_id = ?",
            (availability_id,)
        ).fetchone()
        if not slot:
            raise ResourceNotFound(f"Availability slot '{availability_id}' does not exist.")
        if slot["lawyer_id"] != lawyer_id:
            raise InvalidBooking(f"Slot '{availability_id}' does not belong to lawyer '{lawyer_id}'.")
        if slot["availability_status"] != "AVAILABLE":
            raise SlotUnavailable(f"Slot '{availability_id}' is no longer available (status: {slot['availability_status']}).")

        # Check parcel if provided
        if parcel_id:
            p_check = conn.execute("SELECT parcel_id FROM parcels WHERE parcel_id = ?", (parcel_id,)).fetchone()
            if not p_check:
                raise ResourceNotFound(f"Parcel '{parcel_id}' not found.")

        # Create booking atomically
        request_id = f"LS-REQ-{uuid.uuid4().hex[:8].upper()}"
        reservation_id = f"LS-RES-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        conn.execute("""
            INSERT INTO consultation_requests (
                request_id, lawyer_id, demo_user_reference, parcel_id,
                consultation_mode, request_status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'CONFIRMED_DEMO', ?)
        """, (request_id, clean_lawyer_id, clean_requester, parcel_id, consultation_mode, now_iso))

        conn.execute("""
            INSERT INTO consultation_slot_reservations (
                reservation_id, request_id, availability_id, lawyer_id,
                demo_user_reference, reservation_status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
        """, (reservation_id, request_id, clean_availability_id, clean_lawyer_id, clean_requester, now_iso))

        conn.execute("""
            UPDATE lawyer_availability
            SET availability_status = 'BOOKED'
            WHERE availability_id = ?
        """, (clean_availability_id,))

        conn.commit()

    return {
        "status": "CONFIRMED_DEMO",
        "request_id": request_id,
        "reservation_id": reservation_id,
        "lawyer_id": lawyer_id,
        "lawyer_name": lawyer["display_name"],
        "location": lawyer["location_label"],
        "requester": requester,
        "consultation_mode": consultation_mode,
        "parcel_id": parcel_id,
        "slot": {
            "availability_id": slot["availability_id"],
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
        },
        "created_at": now_iso,
        "synthetic_demo": True,
        "officially_verified": False,
        "disclaimer_bn": "এটি একটি সিন্থেটিক সিমুলেশন ডেমো বুকিং। কোনো বাস্তব আর্থিক লেনদেন বা উকিল-মক্কেল আইনি চুক্তি গঠিত হয়নি।",
        "disclaimer_en": "This is a demonstration booking simulation. No real fee is charged and no attorney-client relationship is created."
    }


def get_booking(
    db_path: Optional[Path] = None,
    request_id: str = "",
    requester: str = ""
) -> Dict[str, Any]:
    """Retrieve details of a single consultation request."""
    active_path = Path(db_path or DB_PATH).resolve()

    with sqlite3.connect(active_path) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("""
            SELECT 
                r.request_id, r.lawyer_id, r.demo_user_reference, r.parcel_id,
                r.consultation_mode, r.request_status, r.created_at,
                l.display_name AS lawyer_name, l.location_label,
                s.availability_id, s.reservation_status,
                a.start_time, a.end_time
            FROM consultation_requests r
            JOIN lawyer_profiles l ON r.lawyer_id = l.lawyer_id
            LEFT JOIN consultation_slot_reservations s ON r.request_id = s.request_id
            LEFT JOIN lawyer_availability a ON s.availability_id = a.availability_id
            WHERE r.request_id = ?
        """, (request_id,)).fetchone()

    if not row:
        raise ResourceNotFound(f"Booking '{request_id}' not found.")

    if requester != "admin" and row["demo_user_reference"] != requester:
        raise AccessDenied("You do not have access to this consultation record.")

    return {
        "request_id": row["request_id"],
        "lawyer_id": row["lawyer_id"],
        "lawyer_name": row["lawyer_name"],
        "location": row["location_label"],
        "requester": row["demo_user_reference"],
        "parcel_id": row["parcel_id"],
        "consultation_mode": row["consultation_mode"],
        "status": row["request_status"],
        "reservation_status": row["reservation_status"],
        "slot": {
            "availability_id": row["availability_id"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
        } if row["availability_id"] else None,
        "created_at": row["created_at"],
        "synthetic_demo": True,
    }


def get_user_bookings(
    db_path: Optional[Path] = None,
    requester: str = ""
) -> List[Dict[str, Any]]:
    """Retrieve all bookings for a user session."""
    active_path = Path(db_path or DB_PATH).resolve()

    with sqlite3.connect(active_path) as conn:
        conn.row_factory = sqlite3.Row
        if requester == "admin":
            query = """
                SELECT 
                    r.request_id, r.lawyer_id, r.demo_user_reference, r.parcel_id,
                    r.consultation_mode, r.request_status, r.created_at,
                    l.display_name AS lawyer_name, l.location_label,
                    s.availability_id, s.reservation_status,
                    a.start_time, a.end_time
                FROM consultation_requests r
                JOIN lawyer_profiles l ON r.lawyer_id = l.lawyer_id
                LEFT JOIN consultation_slot_reservations s ON r.request_id = s.request_id
                LEFT JOIN lawyer_availability a ON s.availability_id = a.availability_id
                ORDER BY r.created_at DESC
            """
            params = ()
        else:
            query = """
                SELECT 
                    r.request_id, r.lawyer_id, r.demo_user_reference, r.parcel_id,
                    r.consultation_mode, r.request_status, r.created_at,
                    l.display_name AS lawyer_name, l.location_label,
                    s.availability_id, s.reservation_status,
                    a.start_time, a.end_time
                FROM consultation_requests r
                JOIN lawyer_profiles l ON r.lawyer_id = l.lawyer_id
                LEFT JOIN consultation_slot_reservations s ON r.request_id = s.request_id
                LEFT JOIN lawyer_availability a ON s.availability_id = a.availability_id
                WHERE r.demo_user_reference = ?
                ORDER BY r.created_at DESC
            """
            params = (requester,)

        rows = conn.execute(query, params).fetchall()

    return [
        {
            "request_id": row["request_id"],
            "lawyer_id": row["lawyer_id"],
            "lawyer_name": row["lawyer_name"],
            "location": row["location_label"],
            "requester": row["demo_user_reference"],
            "parcel_id": row["parcel_id"],
            "consultation_mode": row["consultation_mode"],
            "status": row["request_status"],
            "reservation_status": row["reservation_status"],
            "slot": {
                "availability_id": row["availability_id"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
            } if row["availability_id"] else None,
            "created_at": row["created_at"],
            "synthetic_demo": True,
        }
        for row in rows
    ]


def cancel_booking(
    db_path: Optional[Path] = None,
    request_id: str = "",
    requester: str = ""
) -> Dict[str, Any]:
    """Cancel an active consultation booking and release the slot."""
    active_path = Path(db_path or DB_PATH).resolve()

    with sqlite3.connect(active_path) as conn:
        conn.row_factory = sqlite3.Row

        row = conn.execute("""
            SELECT r.request_id, r.demo_user_reference, r.request_status, s.availability_id
            FROM consultation_requests r
            LEFT JOIN consultation_slot_reservations s ON r.request_id = s.request_id
            WHERE r.request_id = ?
        """, (request_id,)).fetchone()

        if not row:
            raise ResourceNotFound(f"Booking '{request_id}' not found.")

        if requester != "admin" and row["demo_user_reference"] != requester:
            raise AccessDenied("You do not have permission to cancel this booking.")

        if row["request_status"] == "CANCELLED":
            return {
                "request_id": request_id,
                "status": "ALREADY_CANCELLED",
                "message": "This booking has already been cancelled."
            }

        conn.execute("""
            UPDATE consultation_requests
            SET request_status = 'CANCELLED'
            WHERE request_id = ?
        """, (request_id,))

        conn.execute("""
            UPDATE consultation_slot_reservations
            SET reservation_status = 'CANCELLED'
            WHERE request_id = ?
        """, (request_id,))

        if row["availability_id"]:
            conn.execute("""
                UPDATE lawyer_availability
                SET availability_status = 'AVAILABLE'
                WHERE availability_id = ?
            """, (row["availability_id"],))

        conn.commit()

    return {
        "request_id": request_id,
        "status": "CANCELLED",
        "message": "Demonstration booking has been successfully cancelled and the slot has been freed.",
        "synthetic_demo": True,
    }

