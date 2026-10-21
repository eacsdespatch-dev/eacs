/* ═══════════════════════════════════════════════════════════
 * PDF HELPERS
 * Crew Card + General Declaration (EACS-Libya Format)
 * ═══════════════════════════════════════════════════════════ */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

/* ⭐ PDF Safe — تنظيف النص */
export const pdfSafe = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/×/g, "x")
    .replace(/✓/g, "OK")
    .replace(/☒/g, "[X]")
    .replace(/☐/g, "[ ]")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/═/g, "=")
    .replace(/─/g, "-")
    .replace(/│/g, "|")
    .replace(/·/g, ".")
    .replace(/[^\x00-\xFF]/g, "?");
};

/* ⭐ Map crew role → PLACE code */
const roleToPlace = (role) => {
  const map = {
    captain: "PIC",
    firstOfficer: "CPT",
    observer: "ACM",
    flightAttendant: "FA",
    fa1: "FA",
    fa2: "CC",
    engineer: "A/S",
    security: "SEC",
    loadmaster: "LMC",
  };
  return map[role] || "/////";
};

/* ═══════════════════════════════════════════════════════════
 * CREW CARD
 * ═══════════════════════════════════════════════════════════ */
export async function generateCrewCardPDF(crewMember, companyName) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([340, 540]);
  const { width, height } = page.getSize();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  /* ⭐ خلفية */
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawRectangle({
    x: 0,
    y: height - 90,
    width,
    height: 90,
    color: rgb(0.02, 0.55, 0.85),
  });
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 90,
    color: rgb(0.02, 0.35, 0.55),
  });

  page.drawText(pdfSafe(companyName || "AeroOps"), {
    x: 20,
    y: height - 40,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("CREW IDENTIFICATION CARD", {
    x: 20,
    y: height - 65,
    size: 9,
    font,
    color: rgb(0.85, 0.92, 1),
  });

  page.drawText(pdfSafe(crewMember.fullName || ""), {
    x: 20,
    y: height - 290,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(pdfSafe((crewMember.role || "").toUpperCase()), {
    x: 20,
    y: height - 312,
    size: 11,
    font: fontBold,
    color: rgb(0.55, 0.8, 1),
  });
  page.drawText(pdfSafe(`Emp No: ${crewMember.empNo || "-"}`), {
    x: 20,
    y: height - 330,
    size: 9,
    font,
    color: rgb(0.85, 0.9, 1),
  });
  page.drawText(pdfSafe(`Base: ${crewMember.base || "-"}`), {
    x: 20,
    y: height - 344,
    size: 9,
    font,
    color: rgb(0.85, 0.9, 1),
  });
  page.drawText(pdfSafe(`License: ${crewMember.licenseNo || "-"}`), {
    x: 20,
    y: height - 370,
    size: 9,
    font,
    color: rgb(0.85, 0.9, 1),
  });

  const payload = JSON.stringify({
    id: crewMember.id,
    name: crewMember.fullName,
  });
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 200, margin: 1 });
  const qrB64 = qrDataUrl.split(",")[1];
  const qrBin = atob(qrB64);
  const qrBytes = new Uint8Array(qrBin.length);
  for (let i = 0; i < qrBin.length; i++) qrBytes[i] = qrBin.charCodeAt(i);
  const qrImg = await pdf.embedPng(qrBytes);
  page.drawImage(qrImg, { x: width - 120, y: 20, width: 100, height: 100 });

  return await pdf.save();
}

/* ═══════════════════════════════════════════════════════════
 * GENERAL DECLARATION — EACS-Libya Format (A4 Landscape-ish)
 * ═══════════════════════════════════════════════════════════ */
export async function generateGenDecPDF(flight, crew, opts = {}) {
  const pdf = await PDFDocument.create();

  /* ⭐ A4 Portrait (595 x 842) */
  const pageW = 595;
  const pageH = 842;
  const page = pdf.addPage([pageW, pageH]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  /* ⭐ Colors */
  const BLUE = rgb(0.12, 0.28, 0.49);
  const LIGHT_GRAY = rgb(0.94, 0.94, 0.94);
  const WHITE = rgb(1, 1, 1);
  const BLACK = rgb(0, 0, 0);

  /* ⭐ Helpers */
  const drawRect = (x, y, w, h, fill = WHITE, border = BLACK, borderW = 0.5) => {
    if (fill) page.drawRectangle({ x, y, width: w, height: h, color: fill });
    if (border) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: border,
        borderWidth: borderW,
        color: undefined,
      });
    }
  };

  const txt = (text, x, y, size = 8, isBold = false, color = BLACK, maxWidth = 0) => {
    const safe = pdfSafe(text);
    if (!safe) return;
    if (maxWidth > 0) {
      /* ⭐ اختصار النص إن تجاوز العرض */
      let display = safe;
      const fontRef = isBold ? fontBold : font;
      let tw = fontRef.widthOfTextAtSize(display, size);
      while (tw > maxWidth && display.length > 3) {
        display = display.slice(0, -2);
        tw = fontRef.widthOfTextAtSize(display + "…", size);
      }
      if (display !== safe) display = display + "…";
      page.drawText(display, {
        x,
        y,
        size,
        font: isBold ? fontBold : font,
        color,
      });
    } else {
      page.drawText(safe, {
        x,
        y,
        size,
        font: isBold ? fontBold : font,
        color,
      });
    }
  };

  /* ⭐ Layout constants */
  const M = 20; // margin
  const W = pageW - M * 2; // content width = 555
  let y = pageH - M;

  /* ═══════════════════════════════════════════════════════════
   * 1. HEADER — Authority + Logo
   * ═══════════════════════════════════════════════════════════ */
  txt("Executive Authority for Special Flights", M, y - 10, 10, true, BLUE);
  txt("EACS-Libya", pageW - M - 60, y - 10, 10, true, BLUE);
  y -= 22;

  /* ⭐ شعار دائري مبسط */
  const cx = pageW / 2;
  const cy = y + 5;
  page.drawCircle({ x: cx, y: cy, size: 18, color: BLUE, opacity: 1 });
  txt("EACS", cx - 12, cy - 3, 10, true, WHITE);
  y -= 10;

  /* ═══════════════════════════════════════════════════════════
   * 2. TITLE ROW
   * ═══════════════════════════════════════════════════════════ */
  const titleH = 22;
  drawRect(M, y - titleH, W / 2, titleH, LIGHT_GRAY);
  drawRect(M + W / 2, y - titleH, W / 2, titleH, LIGHT_GRAY);
  txt("GENERAL DECLARATION", M + 6, y - 10, 10, true);
  txt("(Outward/Inward)", M + 6, y - 18, 8, false);
  txt("تصريح عام", M + W / 2 + 6, y - 10, 9, true);
  txt("(ذهاب/إياب)", M + W / 2 + 6, y - 18, 8, false);
  y -= titleH;

  /* ═══════════════════════════════════════════════════════════
   * 3. OPERATOR ROW
   * ═══════════════════════════════════════════════════════════ */
  const rowOpH = 26;
  drawRect(M, y - rowOpH, 90, rowOpH, WHITE);
  txt("Operator", M + 4, y - 10, 8, false);
  txt("المشغل", M + 4, y - 20, 7, false);

  drawRect(M + 90, y - rowOpH, W - 90, rowOpH, WHITE);
  txt(
    "EXECUTIVE AUTHORITY FOR SPECIAL FLIGHT",
    M + 96,
    y - 12,
    11,
    true,
    BLUE
  );
  txt("EACS-Libya", M + 96, y - 22, 10, true, BLUE);
  y -= rowOpH;

  /* ═══════════════════════════════════════════════════════════
   * 4. REGISTRATION / FLIGHT / DATE
   * ═══════════════════════════════════════════════════════════ */
  const regH = 24;
  const col1 = W * 0.35;
  const col2 = W * 0.35;
  const col3 = W * 0.30;

  /* Header row */
  drawRect(M, y - regH, col1, regH, LIGHT_GRAY);
  drawRect(M + col1, y - regH, col2, regH, LIGHT_GRAY);
  drawRect(M + col1 + col2, y - regH, col3, regH, LIGHT_GRAY);
  txt("Marks of Nationality & Registration", M + 4, y - 8, 7, true);
  txt("Flight No / رقم الرحلة", M + col1 + 4, y - 8, 7, true);
  txt("Date / التاريخ", M + col1 + col2 + 4, y - 8, 7, true);
  y -= regH;

  /* Values row */
  const valH = 24;
  drawRect(M, y - valH, col1, valH, WHITE);
  drawRect(M + col1, y - valH, col2, valH, WHITE);
  drawRect(M + col1 + col2, y - valH, col3, valH, WHITE);

  txt(flight.acft || "—", M + 6, y - 15, 14, true);
  txt(flight.flightNo || "—", M + col1 + 6, y - 15, 14, true);

  /* ⭐ Date */
  const flightDate = flight.std ? new Date(flight.std) : new Date();
  const d = String(flightDate.getUTCDate()).padStart(2, "0");
  const m = String(flightDate.getUTCMonth() + 1).padStart(2, "0");
  const yr = flightDate.getUTCFullYear();
  txt(`${d} / ${m} / ${yr}`, M + col1 + col2 + 6, y - 15, 13, true);
  y -= valH;

  /* ═══════════════════════════════════════════════════════════
   * 5. DEPARTURE / ARRIVAL
   * ═══════════════════════════════════════════════════════════ */
  const arrH = 24;
  drawRect(M, y - arrH, W / 2, arrH, LIGHT_GRAY);
  drawRect(M + W / 2, y - arrH, W / 2, arrH, LIGHT_GRAY);
  txt("Departure from / الذهاب من", M + 4, y - 8, 7, true);
  txt("Arrival at / الوصول إلى", M + W / 2 + 4, y - 8, 7, true);
  y -= arrH;

  const arrValH = 26;
  drawRect(M, y - arrValH, W / 2, arrValH, WHITE);
  drawRect(M + W / 2, y - arrValH, W / 2, arrValH, WHITE);

  const depFull = flight.depName
    ? `${flight.dep} / ${flight.depName}`
    : flight.dep || "—";
  const arrFull = flight.arrName
    ? `${flight.arr} / ${flight.arrName}`
    : flight.arr || "—";

  txt(depFull, M + 6, y - 17, 13, true, BLACK, W / 2 - 12);
  txt(arrFull, M + W / 2 + 6, y - 17, 13, true, BLACK, W / 2 - 12);
  y -= arrValH;

  /* ═══════════════════════════════════════════════════════════
   * 6. FLIGHT ROUTING
   * ═══════════════════════════════════════════════════════════ */
  const routH = 26;
  drawRect(M, y - routH, W, routH, LIGHT_GRAY);
  txt("FLIGHT ROUTING / خط سير الرحلة", M + 4, y - 10, 9, true);
  txt(
    "(Column always to list origin, every en-route stop and destination)",
    M + 4,
    y - 20,
    7,
    false
  );
  y -= routH;

  const routValH = 22;
  drawRect(M, y - routValH, W, routValH, WHITE);
  const routeText =
    flight.routing ||
    `${flight.dep || "—"} -> ${flight.arr || "—"}`;
  txt(routeText, M + 6, y - 14, 10, false);
  y -= routValH;

  /* ═══════════════════════════════════════════════════════════
   * 7. CREW TABLE
   * ═══════════════════════════════════════════════════════════ */
  const crewHeaderH = 28;
  const colNo = 22;
  const colPlace = 40;
  const colName = 175;
  const colPass = 90;
  const colE = 85;
  const colPax = W - colNo - colPlace - colName - colPass - colE; // ~143

  /* ⭐ Header row */
  drawRect(M, y - crewHeaderH, colNo, crewHeaderH, LIGHT_GRAY);
  drawRect(M + colNo, y - crewHeaderH, colPlace, crewHeaderH, LIGHT_GRAY);
  drawRect(M + colNo + colPlace, y - crewHeaderH, colName, crewHeaderH, LIGHT_GRAY);
  drawRect(M + colNo + colPlace + colName, y - crewHeaderH, colPass, crewHeaderH, LIGHT_GRAY);
  drawRect(M + colNo + colPlace + colName + colPass, y - crewHeaderH, colE, crewHeaderH, LIGHT_GRAY);
  drawRect(M + colNo + colPlace + colName + colPass + colE, y - crewHeaderH, colPax, crewHeaderH, LIGHT_GRAY);

  txt("No.", M + 4, y - 12, 7, true);
  txt("PLACE", M + colNo + 4, y - 12, 7, true);
  txt("TOTAL NUMBER OF CREW", M + colNo + colPlace + 4, y - 10, 7, true);
  txt("أعضاء الطاقم الجوي", M + colNo + colPlace + 4, y - 20, 6, false);
  txt("Passport no", M + colNo + colPlace + colName + 4, y - 10, 7, true);
  txt("رقم جواز السفر", M + colNo + colPlace + colName + 4, y - 20, 6, false);
  txt("E-NUMBER", M + colNo + colPlace + colName + colPass + 4, y - 10, 7, true);
  txt("الرقم الآلي", M + colNo + colPlace + colName + colPass + 4, y - 20, 6, false);
  txt("NUMBER OF PASSENGERS", M + colNo + colPlace + colName + colPass + colE + 4, y - 10, 6.5, true);
  txt("عدد الركاب على هذا القطاع", M + colNo + colPlace + colName + colPass + colE + 4, y - 20, 6, false);
  y -= crewHeaderH;

  /* ⭐ Crew rows */
  const roster = (flight.crewSlots || [])
    .map((s) => ({
      slot: s,
      member: crew.find((c) => c.id === s.crewId),
    }))
    .filter((x) => x.member)
    .slice(0, 8);

  while (roster.length < 8) {
    roster.push({ slot: { position: "" }, member: null });
  }

  const crewRowH = 26;

  /* ⭐ Right-side cells (Departure/Embarking/etc) */
  const rightCells = [
    { label: "Departure Place", label2: "مكان المغادرة", value: flight.dep || "—" },
    { label: "Embarking", label2: "", value: "" },
    { label: "", label2: "", value: "" },
    { label: "Through on same flight", label2: "", value: "" },
    { label: "", label2: "", value: "" },
    { label: "Arrival Place", label2: "مكان الوصول", value: flight.arr || "—" },
    { label: "Disembarking", label2: "", value: "" },
    { label: "Through on same flight", label2: "", value: "" },
  ];

  for (let i = 0; i < 8; i++) {
    const r = roster[i];
    const member = r.member;
    const place = member ? roleToPlace(member.role) : i === 0 ? "" : "/////";

    /* ⭐ Row cells */
    drawRect(M, y - crewRowH, colNo, crewRowH, WHITE);
    drawRect(M + colNo, y - crewRowH, colPlace, crewRowH, WHITE);
    drawRect(M + colNo + colPlace, y - crewRowH, colName, crewRowH, WHITE);
    drawRect(M + colNo + colPlace + colName, y - crewRowH, colPass, crewRowH, WHITE);
    drawRect(M + colNo + colPlace + colName + colPass, y - crewRowH, colE, crewRowH, WHITE);
    drawRect(M + colNo + colPlace + colName + colPass + colE, y - crewRowH, colPax, crewRowH, WHITE);

    /* ⭐ Text */
    const no = String(i + 1).padStart(2, "0");
    txt(no, M + 6, y - 16, 8, false);
    txt(place, M + colNo + 6, y - 16, 8, true);

    if (member) {
      txt(member.fullName || "", M + colNo + colPlace + 6, y - 16, 9, true, BLACK, colName - 12);
      txt(member.passportNo || "/////////", M + colNo + colPlace + colName + 6, y - 16, 8, false, BLACK, colPass - 12);
      txt(member.eNumber || "////////////", M + colNo + colPlace + colName + colPass + 6, y - 16, 8, false, BLACK, colE - 12);
    } else {
      txt("///////////////", M + colNo + colPlace + 6, y - 16, 8, false, BLACK, colName - 12);
      txt("/////////", M + colNo + colPlace + colName + 6, y - 16, 8, false, BLACK, colPass - 12);
      txt("////////////", M + colNo + colPlace + colName + colPass + 6, y - 16, 8, false, BLACK, colE - 12);
    }

    /* ⭐ Right cell content */
    const rc = rightCells[i];
    if (rc.label) {
      txt(rc.label, M + colNo + colPlace + colName + colPass + colE + 4, y - 12, 7, true, BLACK, colPax - 8);
      if (rc.label2) {
        txt(rc.label2, M + colNo + colPlace + colName + colPass + colE + 4, y - 20, 6, false, BLACK, colPax - 8);
      }
      if (rc.value) {
        txt(rc.value, M + colNo + colPlace + colName + colPass + colE + 4, y - 20, 10, true, BLUE, colPax - 8);
      }
    }

    y -= crewRowH;
  }

  /* ═══════════════════════════════════════════════════════════
   * 8. HEALTH DECLARATION + OFFICIAL
   * ═══════════════════════════════════════════════════════════ */
  const healthH = 145;
  const healthW = W - colPax;

  /* ⭐ Left — Health */
  drawRect(M, y - healthH, healthW, healthH, WHITE);

  const hx = M + 6;
  let hy = y - 12;

  txt("Declaration of Health* / التصريح الصحي", hx, hy, 8, true);
  hy -= 12;
  txt(
    "Persons on board with illnesses other than airsickness or the effects of accidents",
    hx, hy, 6.5, false
  );
  hy -= 9;
  txt(
    "(including persons with symptoms or signs of illness such as rash, fever, chills, diarrhea)",
    hx, hy, 6.5, false
  );
  hy -= 9;
  txt(
    "as well as those cases of illness disembarked during the flight ...................",
    hx, hy, 6.5, false
  );
  hy -= 11;
  txt("[X] None   /   [ ] Yes (Number...........)", hx, hy, 7, false);
  hy -= 12;
  txt(
    "Any other conditions on board which may lead to the spread of disease",
    hx, hy, 6.5, false
  );
  hy -= 9;
  txt(".................................................................", hx, hy, 6.5, false);
  hy -= 11;
  txt("[X] None   /   [ ] Yes (Number...........)", hx, hy, 7, false);
  hy -= 12;
  txt(
    "Details of each disinfecting or sanitary treatment (place, date, time, method)",
    hx, hy, 6.5, false
  );
  hy -= 9;
  txt(
    "during the flight. If no disinfecting has been carried out during the flight,",
    hx, hy, 6.5, false
  );
  hy -= 9;
  txt("give details of most recent disinfecting ......", hx, hy, 6.5, false);
  hy -= 11;
  txt("[X] None   /   [ ] Yes (Place....... Date.../.../20.. method ........)", hx, hy, 7, false);
  hy -= 12;
  txt("Signed, if required  ___________________________", hx, hy, 7, false);
  hy -= 10;
  txt("Crew member concerned / عضو الطاقم الجوي المكول", hx, hy, 6.5, false);

  /* ⭐ Right — For official use */
  drawRect(M + healthW, y - healthH, colPax, healthH, WHITE);

  const ox = M + healthW + 6;
  let oy = y - 12;
  txt("Through on same flight", ox, oy, 6.5, false, BLACK, colPax - 12);
  oy -= 18;
  txt("For official use only", ox, oy, 7, true, BLACK, colPax - 12);
  oy -= 9;
  txt("للاستخدام الرسمي فقط", ox, oy, 6, false, BLACK, colPax - 12);

  /* ⭐ الختم */
  const sealCx = M + healthW + colPax / 2;
  const sealCy = y - 100;
  page.drawCircle({ x: sealCx, y: sealCy, size: 32, borderColor: BLUE, borderWidth: 1.5 });
  page.drawCircle({ x: sealCx, y: sealCy, size: 26, borderColor: BLUE, borderWidth: 0.7 });
  txt("EACS", sealCx - 14, sealCy + 2, 11, true, BLUE);
  txt("EXECUTIVE", sealCx - 22, sealCy - 12, 5.5, true, BLUE);
  txt("AUTHORITY", sealCx - 22, sealCy - 19, 5.5, true, BLUE);

  /* ═══════════════════════════════════════════════════════════
   * 9. BOTTOM MARGIN — Signature space
   * ═══════════════════════════════════════════════════════════ */
  y -= healthH;
  y -= 20;
  txt(
    "Signature of aircraft commander or authorized agent:",
    M,
    y,
    8,
    false
  );
  y -= 24;
  page.drawLine({
    start: { x: M, y },
    end: { x: M + 200, y },
    thickness: 0.5,
    color: BLACK,
  });

  txt(
    `Generated: ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`,
    M,
    M,
    6,
    false,
    rgb(0.5, 0.5, 0.5)
  );
  txt(
    `Flight: ${flight.flightNo || "—"} · ${flight.dep || "—"} → ${flight.arr || "—"}`,
    pageW - M - 180,
    M,
    6,
    false,
    rgb(0.5, 0.5, 0.5)
  );

  return await pdf.save();
}

/* ⭐ تنزيل PDF */
export function downloadPDF(bytes, fileName) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/* ⭐ فتح PDF */
export function openPDF(bytes) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

/* ⭐ توليد وثيقة الدليل التشغيلي Manual PDF */
export async function generateManualPDF(manual, companyName) {
  const pdf = await PDFDocument.create();
  const pageW = 595;
  const pageH = 842;
  const page = pdf.addPage([pageW, pageH]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const primaryBlue = rgb(0.08, 0.35, 0.65);
  const darkSlate = rgb(0.1, 0.15, 0.22);
  const lightBg = rgb(0.95, 0.96, 0.98);
  const borderGray = rgb(0.8, 0.83, 0.88);
  const white = rgb(1, 1, 1);

  // Top header banner
  page.drawRectangle({
    x: 0,
    y: pageH - 110,
    width: pageW,
    height: 110,
    color: primaryBlue,
  });

  page.drawText(pdfSafe(companyName || "AeroOps Flight Operations"), {
    x: 40,
    y: pageH - 45,
    size: 20,
    font: fontBold,
    color: white,
  });

  page.drawText("OPERATIONAL DOCUMENTATION & COMPLIANCE MANUAL", {
    x: 40,
    y: pageH - 70,
    size: 10,
    font,
    color: rgb(0.8, 0.9, 1),
  });

  page.drawText(pdfSafe(manual.code || "OM"), {
    x: pageW - 130,
    y: pageH - 65,
    size: 24,
    font: fontBold,
    color: white,
  });

  // Main Details Card
  let y = pageH - 140;
  page.drawRectangle({
    x: 40,
    y: y - 110,
    width: pageW - 80,
    height: 110,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText(pdfSafe(manual.title_en || "Operations Manual"), {
    x: 55,
    y: y - 28,
    size: 16,
    font: fontBold,
    color: darkSlate,
  });

  if (manual.category) {
    page.drawText(`Category: ${pdfSafe(manual.category)}`, {
      x: 55,
      y: y - 50,
      size: 11,
      font,
      color: darkSlate,
    });
  }

  page.drawText(`Revision: ${pdfSafe(manual.rev || "Rev 1.0")}`, {
    x: 55,
    y: y - 72,
    size: 10,
    font,
    color: darkSlate,
  });

  page.drawText(`Effective Date: ${pdfSafe(manual.effectiveDate || "-")}`, {
    x: 240,
    y: y - 72,
    size: 10,
    font,
    color: darkSlate,
  });

  page.drawText(`Approval: ${pdfSafe(manual.approval || "CAA Approved")}`, {
    x: 55,
    y: y - 94,
    size: 10,
    font,
    color: darkSlate,
  });

  page.drawText(`Status: ${pdfSafe((manual.status || "active").toUpperCase())}`, {
    x: 240,
    y: y - 94,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.6, 0.3),
  });

  y -= 135;

  // Executive Summary
  page.drawText("EXECUTIVE SUMMARY", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: primaryBlue,
  });
  y -= 8;
  page.drawLine({
    start: { x: 40, y },
    end: { x: pageW - 40, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 20;

  const summaryText = pdfSafe(
    manual.summary ||
      "This document outlines standard operating procedures, regulations, and operational directives in accordance with civil aviation authority requirements."
  );
  // Word wrap summary
  const words = summaryText.split(" ");
  let line = "";
  for (const w of words) {
    if ((line + " " + w).length > 85) {
      page.drawText(line, { x: 40, y, size: 10, font, color: darkSlate });
      y -= 15;
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) {
    page.drawText(line, { x: 40, y, size: 10, font, color: darkSlate });
    y -= 25;
  } else {
    y -= 15;
  }

  // Chapters & Table of Contents
  page.drawText("TABLE OF CONTENTS / CHAPTERS", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: primaryBlue,
  });
  y -= 8;
  page.drawLine({
    start: { x: 40, y },
    end: { x: pageW - 40, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 20;

  // Table header
  page.drawRectangle({
    x: 40,
    y: y - 18,
    width: pageW - 80,
    height: 22,
    color: lightBg,
  });
  page.drawText("CH #", { x: 50, y: y - 12, size: 9, font: fontBold, color: darkSlate });
  page.drawText("CHAPTER TITLE", { x: 110, y: y - 12, size: 9, font: fontBold, color: darkSlate });
  page.drawText("PAGES", { x: pageW - 120, y: y - 12, size: 9, font: fontBold, color: darkSlate });
  y -= 24;

  const chapters = Array.isArray(manual.chapters) && manual.chapters.length > 0
    ? manual.chapters
    : [
        { num: "01", title: "General Overview & Policy", pages: "1-30" },
        { num: "02", title: "Standard Procedures & Normal Operations", pages: "31-90" },
        { num: "03", title: "Abnormal & Emergency Procedures", pages: "91-140" },
      ];

  for (const ch of chapters) {
    page.drawText(pdfSafe(ch.num || "-"), { x: 50, y, size: 9, font, color: darkSlate });
    page.drawText(pdfSafe(ch.title || "Section"), { x: 110, y, size: 9, font, color: darkSlate });
    page.drawText(pdfSafe(ch.pages || "-"), { x: pageW - 120, y, size: 9, font, color: darkSlate });
    y -= 18;
    page.drawLine({
      start: { x: 40, y: y + 8 },
      end: { x: pageW - 40, y: y + 8 },
      thickness: 0.5,
      color: borderGray,
    });
  }

  // Footer
  page.drawRectangle({
    x: 40,
    y: 35,
    width: pageW - 80,
    height: 1,
    color: borderGray,
  });
  page.drawText(`Controlled Flight Operations Document · ${pdfSafe(manual.code)} ${pdfSafe(manual.rev)}`, {
    x: 40,
    y: 20,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Generated on ${new Date().toISOString().slice(0, 10)} UTC`, {
    x: pageW - 180,
    y: 20,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdf.save();
}