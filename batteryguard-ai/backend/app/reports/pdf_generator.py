import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.diagnostics.engine import DiagnosticEngine


class PDFReportGenerator:
    """
    Generates professional, publication-quality EV Battery Diagnostic & Screening PDF reports.
    """

    @classmethod
    def generate_report(
        cls,
        session_data: dict,
        battery_data: dict,
        result_data: dict,
        profile_data: dict,
        readings_summary: dict
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Color definitions conforming to design system
        NAVY_DARK = colors.HexColor("#0F172A")
        NAVY_LIGHT = colors.HexColor("#1E293B")
        TEAL = colors.HexColor("#0EA5E9")
        MUTED_TEXT = colors.HexColor("#64748B")
        BORDER_GRAY = colors.HexColor("#E2E8F0")
        BG_LIGHT = colors.HexColor("#F8FAFC")
        
        # Category colors
        category = result_data.get("screening_category", "REVIEW").upper()
        if category == "GOOD":
            cat_color = colors.HexColor("#10B981")
            cat_bg = colors.HexColor("#ECFDF5")
        elif category == "REVIEW":
            cat_color = colors.HexColor("#F59E0B")
            cat_bg = colors.HexColor("#FFFBEB")
        elif category == "DEGRADED":
            cat_color = colors.HexColor("#F97316")
            cat_bg = colors.HexColor("#FFF7ED")
        else: # CRITICAL
            cat_color = colors.HexColor("#EF4444")
            cat_bg = colors.HexColor("#FEF2F2")

        # Custom typography styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=NAVY_DARK
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MUTED_TEXT
        )
        section_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=NAVY_DARK,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=NAVY_DARK
        )
        body_bold = ParagraphStyle(
            "BodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=NAVY_DARK
        )
        badge_style = ParagraphStyle(
            "BadgeStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=cat_color,
            alignment=1  # Centered
        )
        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#475569")
        )

        elements = []

        # 1. Header Banner
        header_table = Table(
            [
                [
                    Paragraph("<b>BATTERYGUARD AI</b><br/><font size=7 color='#64748B'>Smart EV Battery Diagnostic & Screening System</font>", title_style),
                    Paragraph(f"<b>REPORT ID:</b> REP-{session_data.get('test_id', 'TEST')}<br/>"
                              f"<b>DATE:</b> {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}<br/>"
                              f"<b>VERSION:</b> v1.0 Standard", ParagraphStyle("HdrRight", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=11, alignment=2, textColor=NAVY_DARK))
                ]
            ],
            colWidths=[3.8 * inch, 3.8 * inch]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=TEAL, spaceBefore=0, spaceAfter=12))

        # 2. Executive Screening Result Badge Box
        category_box = Table(
            [
                [
                    Paragraph(f"DIAGNOSTIC SCREENING RESULT: <b>{category}</b>", badge_style)
                ],
                [
                    Paragraph(result_data.get("recommendations", "Review operational metrics before vehicle recommissioning."), 
                              ParagraphStyle("RecStyle", parent=body_style, alignment=1, fontSize=8.5, leading=12))
                ]
            ],
            colWidths=[7.6 * inch]
        )
        category_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), cat_bg),
            ('BOX', (0, 0), (-1, -1), 1.5, cat_color),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(category_box)
        elements.append(Spacer(1, 14))

        # 3. Two-Column Metadata: Test Details & Battery Details
        meta_data = [
            [
                Paragraph("<b>TEST SESSION DETAILS</b>", section_style),
                Paragraph("<b>BATTERY SPECIFICATIONS</b>", section_style)
            ],
            [
                Paragraph(f"<b>Test ID:</b> {session_data.get('test_id')}<br/>"
                          f"<b>Profile:</b> {profile_data.get('name', 'Standard 1C Screening')}<br/>"
                          f"<b>Execution Mode:</b> {session_data.get('mode', 'simulation').upper()}<br/>"
                          f"<b>Duration:</b> {session_data.get('duration_sec', 0.0):.1f} s<br/>"
                          f"<b>Technician:</b> {session_data.get('technician_name', 'Automated Lab Tech')}", body_style),
                Paragraph(f"<b>Battery ID:</b> {battery_data.get('battery_id')}<br/>"
                          f"<b>Manufacturer:</b> {battery_data.get('manufacturer')} {battery_data.get('model')}<br/>"
                          f"<b>Chemistry:</b> {battery_data.get('chemistry')}<br/>"
                          f"<b>Nominal Voltage:</b> {battery_data.get('nominal_voltage')} V<br/>"
                          f"<b>Capacity:</b> {battery_data.get('capacity_ah', 'N/A')} Ah", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[3.75 * inch, 3.75 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_GRAY),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # 4. Diagnostic Metrics Table
        elements.append(Paragraph("<b>KEY DIAGNOSTIC METRICS & CALCULATIONS</b>", section_style))
        
        sag_val = result_data.get('voltage_sag_percent', 0.0)
        temp_delta = result_data.get('temp_change_c', 0.0)
        ir_val = result_data.get('internal_resistance_m_ohm', 0.0)
        v_std = result_data.get('voltage_stability_std', 0.0)

        metrics_rows = [
            [
                Paragraph("<b>Metric</b>", body_bold),
                Paragraph("<b>Measured Value</b>", body_bold),
                Paragraph("<b>Nominal Profile Target</b>", body_bold),
                Paragraph("<b>Status / Evaluation</b>", body_bold)
            ],
            [
                Paragraph("Resting Pack Voltage (OCV)", body_style),
                Paragraph(f"{result_data.get('resting_voltage', 0.0):.2f} V", body_style),
                Paragraph(f"≥ {battery_data.get('nominal_voltage', 48.0):.1f} V", body_style),
                Paragraph("Normal", body_style)
            ],
            [
                Paragraph("Loaded Voltage (under load)", body_style),
                Paragraph(f"{result_data.get('loaded_voltage', 0.0):.2f} V", body_style),
                Paragraph(f"Cutoff: {profile_data.get('voltage_cutoff_v', 36.0):.1f} V", body_style),
                Paragraph("Pass" if result_data.get('loaded_voltage', 0.0) >= profile_data.get('voltage_cutoff_v', 36.0) else "CUTOFF BREACH", body_style)
            ],
            [
                Paragraph("Voltage Sag (%)", body_style),
                Paragraph(f"<b>{sag_val:.1f}%</b>", body_style),
                Paragraph(f"< {profile_data.get('max_sag_percent_limit', 10.0):.1f}%", body_style),
                Paragraph("Within Tolerance" if sag_val <= profile_data.get('max_sag_percent_limit', 10.0) else "ELEVATED SAG", body_style)
            ],
            [
                Paragraph("Temperature Rise (ΔT)", body_style),
                Paragraph(f"<b>+{temp_delta:.1f} °C</b> (Peak: {result_data.get('final_temp_c', 25.0):.1f}°C)", body_style),
                Paragraph(f"< +{profile_data.get('max_temp_rise_limit_c', 8.0):.1f} °C", body_style),
                Paragraph("Normal" if temp_delta <= profile_data.get('max_temp_rise_limit_c', 8.0) else "HIGH THERMAL RISE", body_style)
            ],
            [
                Paragraph("Estimated DC Internal Resistance", body_style),
                Paragraph(f"<b>{ir_val:.1f} mΩ</b>", body_style),
                Paragraph("< 120.0 mΩ", body_style),
                Paragraph("Healthy" if ir_val < 100 else "High Impedance", body_style)
            ],
            [
                Paragraph("Voltage Stability StdDev", body_style),
                Paragraph(f"{v_std:.3f} V", body_style),
                Paragraph("< 0.400 V", body_style),
                Paragraph("Stable" if v_std < 0.40 else "Fluctuations Detected", body_style)
            ],
        ]

        metrics_table = Table(metrics_rows, colWidths=[2.5 * inch, 1.8 * inch, 1.6 * inch, 1.7 * inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 14))

        # 5. Rule-Based Explanations & Detected Anomalies
        elements.append(Paragraph("<b>RULE-BASED SCREENING AUDIT & ANOMALIES</b>", section_style))
        triggered_rules = result_data.get("triggered_rules", [])
        anomalies = result_data.get("anomalies", [])

        if not triggered_rules and not anomalies:
            rule_text = "<b>No safety anomalies or rule violations detected during this test.</b> All sensor telemetry remained strictly within profile boundaries."
            elements.append(Paragraph(rule_text, body_style))
        else:
            rule_items = []
            for r in triggered_rules:
                sev = r.get("severity", "REVIEW")
                rule_items.append([
                    Paragraph(f"<b>[{sev}] {r.get('rule_id')}: {r.get('name')}</b><br/>"
                              f"<font color='#475569'>{r.get('description')}</font>", body_style)
                ])
            rule_table = Table(rule_items, colWidths=[7.6 * inch])
            rule_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
                ('BOX', (0, 0), (-1, -1), 1, BORDER_GRAY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(rule_table)

        elements.append(Spacer(1, 14))

        # 6. Mandatory Regulatory & Safety Disclaimer (Strict requirement)
        disclaimer_box = Table(
            [
                [
                    Paragraph(f"<b>MANDATORY SCREENING DISCLAIMER:</b> {result_data.get('disclaimer', DiagnosticEngine.MANDATORY_DISCLAIMER)}", disclaimer_style)
                ]
            ],
            colWidths=[7.6 * inch]
        )
        disclaimer_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(disclaimer_box)

        # Build document
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
