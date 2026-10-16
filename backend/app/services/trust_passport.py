
from io import BytesIO
from html import escape
from datetime import datetime, timezone

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4

from app.services.database import get_parcel, get_related
from app.services.evidence import get_verification, get_advice

DISCLAIMER = (
    "SYNTHETIC DEMONSTRATION ONLY. This report is not an "
    "official land record, ownership certificate, title opinion, "
    "fraud determination, or approval to purchase property. "
    "Independent review of authentic records by appropriate "
    "authorities and qualified professionals is required."
)

SURVEY_ORDER = {
    "CS": 1,
    "SA": 2,
    "RS": 3,
    "BS_BDS": 4,
}

def clean(value):
    if value is None:
        return "-"
    # Default PDF uses English-safe text.
    return escape(str(value).encode(
        "ascii", errors="replace"
    ).decode("ascii"))

def section_table(rows, widths=None):
    data = [
        [
            Paragraph(clean(k), CELL_STYLE),
            Paragraph(clean(v), CELL_STYLE),
        ]
        for k, v in rows
    ]

    table = Table(
        data,
        colWidths=widths or [155, 335],
        hAlign="LEFT",
        repeatRows=0,
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E2EC")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    return table

styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    "LandSureTitle",
    parent=styles["Title"],
    fontSize=20,
    leading=25,
    textColor=colors.HexColor("#153B56"),
    spaceAfter=9,
)

SUBTITLE_STYLE = ParagraphStyle(
    "LandSureSubtitle",
    parent=styles["Normal"],
    alignment=TA_CENTER,
    fontSize=10,
    textColor=colors.HexColor("#526579"),
    spaceAfter=15,
)

SECTION_STYLE = ParagraphStyle(
    "LandSureSection",
    parent=styles["Heading2"],
    fontSize=12,
    leading=16,
    textColor=colors.HexColor("#153B56"),
    spaceBefore=14,
    spaceAfter=8,
)

BODY_STYLE = ParagraphStyle(
    "LandSureBody",
    parent=styles["BodyText"],
    fontSize=9,
    leading=13,
    spaceAfter=5,
    wordWrap="CJK",
)

CELL_STYLE = ParagraphStyle(
    "LandSureCell",
    parent=BODY_STYLE,
    fontSize=8,
    leading=11,
    spaceAfter=0,
)

def heading(story, title):
    story.append(Paragraph(clean(title), SECTION_STYLE))

def paragraph(story, value):
    story.append(Paragraph(clean(value), BODY_STYLE))

def record_block(story, record, label=None):
    if label:
        paragraph(story, label)
    if isinstance(record, dict):
        rows = [
            (str(key).replace("_", " ").title(), value)
            for key, value in record.items()
        ]
        if rows:
            story.append(section_table(rows))
    else:
        paragraph(story, record)
    story.append(Spacer(1, 7))

def flatten_findings(verification):
    if not isinstance(verification, dict):
        return []

    for key in ("findings", "rule_findings", "flags", "issues"):
        value = verification.get(key)
        if isinstance(value, list):
            return value

    return []

def add_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#526579"))
    canvas.drawString(
        42, 25,
        "LandSure AI | Synthetic demo | Not official verification"
    )
    canvas.drawRightString(
        width - 42, 25,
        f"Page {doc.page}"
    )
    canvas.restoreState()

def generate_trust_passport(parcel_id):
    parcel = get_parcel(parcel_id)

    if parcel is None:
        raise ValueError("Parcel not found")

    surveys = get_related("survey_records", parcel_id)
    surveys.sort(
        key=lambda r: SURVEY_ORDER.get(
            r.get("survey_type"), 99
        )
    )

    claims = get_related("ownership_claims", parcel_id)
    transactions = get_related("transactions", parcel_id)
    documents = get_related("documents", parcel_id)
    mutations = get_related("mutations", parcel_id)
    evidence = get_related("evidence_sources", parcel_id)

    verification = get_verification(parcel_id)
    advisor = get_advice(parcel_id, "en")

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=44,
        bottomMargin=45,
        title=f"LandSure AI Trust Passport - {parcel_id}",
        author="LandSure AI Synthetic Demo",
    )

    story = []

    story.append(Paragraph(
        "LandSure AI - Trust Passport",
        TITLE_STYLE
    ))

    story.append(Paragraph(
        "Evidence-Based Synthetic Land Review Report",
        SUBTITLE_STYLE
    ))

    paragraph(story, DISCLAIMER)

    heading(story, "1. Report Information")

    story.append(section_table([
        ("Parcel ID", parcel_id),
        ("Generated UTC", datetime.now(timezone.utc).isoformat()),
        ("Data Classification", "SYNTHETIC"),
        ("Official Verification", "NO"),
        ("Report Type", "Evidence review snapshot"),
    ]))

    heading(story, "2. Parcel Overview")
    record_block(story, parcel)

    heading(story, "3. Survey History")
    paragraph(
        story,
        f"Survey records found: {len(surveys)}"
    )

    if surveys:
        for index, survey in enumerate(surveys, 1):
            record_block(
                story,
                survey,
                f"Survey record {index}"
            )
    else:
        paragraph(story, "No survey records available.")

    heading(story, "4. Ownership Claims")
    paragraph(story, f"Claims found: {len(claims)}")
    for index, claim in enumerate(claims, 1):
        record_block(story, claim, f"Claim {index}")

    heading(story, "5. Transactions")
    paragraph(story, f"Transactions found: {len(transactions)}")
    for index, transaction in enumerate(transactions, 1):
        record_block(story, transaction, f"Transaction {index}")

    heading(story, "6. Documents")
    paragraph(story, f"Document records found: {len(documents)}")
    paragraph(
        story,
        "Stored hash values are not proof of authentic "
        "document bytes or issuing authority."
    )
    for index, item in enumerate(documents, 1):
        record_block(story, item, f"Document {index}")

    heading(story, "7. Mutation Records")
    paragraph(story, f"Mutations found: {len(mutations)}")
    for index, item in enumerate(mutations, 1):
        record_block(story, item, f"Mutation {index}")

    heading(story, "8. Verification Findings")

    if isinstance(verification, dict):
        status = verification.get(
            "status",
            verification.get("verification_status", "UNKNOWN")
        )
        paragraph(story, f"Review status: {status}")

        findings = flatten_findings(verification)

        if findings:
            for index, finding in enumerate(findings, 1):
                record_block(
                    story,
                    finding,
                    f"Finding {index}"
                )
        else:
            paragraph(
                story,
                "No structured findings were found under "
                "the supported findings fields."
            )
            record_block(story, verification)
    else:
        paragraph(story, "Verification snapshot unavailable.")

    heading(story, "9. Evidence References")
    paragraph(story, f"Evidence records found: {len(evidence)}")

    for index, item in enumerate(evidence, 1):
        record_block(story, item, f"Evidence {index}")

    heading(story, "10. Review Advisor")

    if advisor is not None:
        record_block(story, advisor)
    else:
        paragraph(story, "English advisor snapshot unavailable.")

    heading(story, "11. Limitations and Disclaimer")
    paragraph(story, DISCLAIMER)
    paragraph(
        story,
        "This report is generated from a local synthetic "
        "database and stored analysis snapshots. It does "
        "not perform live government registry checks."
    )

    document.build(
        story,
        onFirstPage=add_footer,
        onLaterPages=add_footer,
    )

    return buffer.getvalue()
