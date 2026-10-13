import csv
import io
from typing import List, Dict, Any

class CSVReportGenerator:
    """Generates standard CSV exports for telemetry readings, test histories, and inventories."""

    @classmethod
    def generate_readings_csv(cls, readings: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["reading_index", "timestamp_offset_ms", "pack_voltage_v", "current_amps", "temperature_c", "phase"])
        for r in readings:
            writer.writerow([
                r.get("reading_index", 0),
                r.get("timestamp_offset_ms", 0),
                r.get("pack_voltage", 0.0),
                r.get("current_amps", 0.0),
                r.get("temperature_c", 0.0),
                r.get("phase", "")
            ])
        return output.getvalue()

    @classmethod
    def generate_sessions_csv(cls, sessions: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["test_id", "battery_id", "mode", "screening_category", "duration_sec", "sag_percent", "temp_change_c", "date"])
        for s in sessions:
            writer.writerow([
                s.get("test_id", ""),
                s.get("battery_code", ""),
                s.get("mode", ""),
                s.get("screening_category", ""),
                s.get("duration_sec", 0.0),
                s.get("voltage_sag_percent", 0.0),
                s.get("temp_change_c", 0.0),
                s.get("start_time", "")
            ])
        return output.getvalue()

    @classmethod
    def generate_batteries_csv(cls, batteries: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["battery_id", "manufacturer", "model", "chemistry", "nominal_voltage", "capacity_ah", "status", "test_count"])
        for b in batteries:
            writer.writerow([
                b.get("battery_id", ""),
                b.get("manufacturer", ""),
                b.get("model", ""),
                b.get("chemistry", ""),
                b.get("nominal_voltage", ""),
                b.get("capacity_ah", ""),
                b.get("status", ""),
                b.get("test_count", 0)
            ])
        return output.getvalue()
