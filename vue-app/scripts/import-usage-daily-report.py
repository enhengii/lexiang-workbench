#!/usr/bin/env python3
"""Import only the three required daily-report sheets; leave the XLSX unchanged."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import posixpath
import xml.etree.ElementTree as ET
import zipfile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
SHEETS = ("核心数据概览", "skill数据明细", "指标定义")
OVERVIEW_FIELDS = ("loginDau", "loginWau", "loginMau", "aiDau", "aiWau", "aiMau", "totalUsers", "loginWauRate", "aiWauRate", "queries", "tasks", "taskSuccess", "taskFailed", "totalSkills", "newSkills", "calledSkills", "calls", "success", "failed", "firstTokenSeconds")


def read_sheets(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        relationships = {node.attrib["Id"]: node.attrib["Target"] for node in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        result = {}
        for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            if name not in SHEETS:
                continue
            target = relationships[sheet.attrib[f"{{{REL}}}id"]]
            filename = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            rows = []
            for row in ET.fromstring(archive.read(filename)).findall("m:sheetData/m:row", NS):
                cells = {}
                for cell in row.findall("m:c", NS):
                    column = "".join(c for c in cell.attrib["r"] if c.isalpha())
                    value = cell.find("m:v", NS)
                    if cell.attrib.get("t") == "inlineStr":
                        value = "".join(cell.find("m:is", NS).itertext())
                    elif value is not None:
                        value = shared[int(value.text)] if cell.attrib.get("t") == "s" else value.text
                    else:
                        value = ""
                    if value != "":
                        cells[column] = value
                if cells:
                    rows.append(cells)
            result[name] = rows
    if set(result) != set(SHEETS):
        raise ValueError("Required daily-report sheets are missing")
    return result


def number(value):
    if value is None or value == "":
        return None
    numeric = float(value)
    return int(numeric) if numeric.is_integer() else numeric


def date(value):
    return (datetime.date(1899, 12, 30) + datetime.timedelta(days=float(value))).isoformat()


def normalize(source, filename, sha256):
    overview = []
    for index, row in enumerate(source[SHEETS[0]][1:], 2):
        overview.append({"date": date(row["A"]), **{field: number(row.get(chr(ord("B") + i))) for i, field in enumerate(OVERVIEW_FIELDS)}, "sourceRow": index})
    details = []
    for index, row in enumerate(source[SHEETS[1]][1:], 2):
        skill_id = row["B"].strip()
        creator = row.get("N", "").strip()
        module = row.get("D", "").strip()
        name = row.get("C", "").strip()
        details.append({
            "date": date(row["A"]), "skillId": skill_id, "name": name or skill_id,
            "module": module or "未标注", "creatorId": creator or "unattributed", "creator": creator or "未标注",
            "nameKnown": bool(name and name != skill_id), "creatorKnown": bool(creator), "moduleKnown": bool(module),
            **{field: number(row.get(column)) for column, field in zip("EFGHIJKLM", ("users", "calls", "success", "failed", "feedbackCount", "likes", "dislikes", "likeRate", "dislikeRate"))},
            "sourceRow": index,
        })
    overview.sort(key=lambda row: row["date"])
    details.sort(key=lambda row: (row["date"], row["sourceRow"]))
    definitions = [{"sheet": row.get("A", ""), "metric": row.get("B", ""), "definition": row.get("C", "")} for row in source[SHEETS[2]][1:]]
    return {
        "source": {"filename": filename, "sha256": sha256, "sheets": list(SHEETS),
                   "overviewRange": {"startDate": overview[0]["date"], "endDate": overview[-1]["date"]},
                   "detailRange": {"startDate": details[0]["date"], "endDate": details[-1]["date"]},
                   "counts": {"overviewRows": len(overview), "detailRows": len(details), "skills": len({row["skillId"] for row in details}), "creators": len({row["creatorId"] for row in details if row["creatorKnown"]}), "unknownCreatorRows": sum(not row["creatorKnown"] for row in details), "missingModuleRows": sum(not row["moduleKnown"] for row in details)}},
        "sourceHeaders": {name: source[name][0] for name in SHEETS},
        "metricDefinitions": definitions, "overviewRows": overview, "detailRows": details,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "src/domain/usageDailyReportData.json")
    args = parser.parse_args()
    result = normalize(read_sheets(args.xlsx), args.xlsx.name, hashlib.sha256(args.xlsx.read_bytes()).hexdigest())
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["source"], ensure_ascii=False))


if __name__ == "__main__":
    main()
