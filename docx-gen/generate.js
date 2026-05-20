const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak, LevelFormat, Header, Footer,
  TabStopType, TableOfContents
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── COLOUR PALETTE ───────────────────────────────────────────
const C = {
  navy:     "0D1B2A",
  accent:   "1A6B8A",
  gold:     "B8860B",
  red:      "C0392B",
  green:    "1E6B3C",
  lightGreen:"E8F5ED",
  light:    "EAF4FB",
  mid:      "D5E8F0",
  dark:     "1C2E3E",
  white:    "FFFFFF",
  gray:     "F7F7F7",
  border:   "AACCDD",
  textDark: "1A1A2E",
  amber:    "F39C12",
  amberLight:"FEF9E7",
  redLight: "FDEDEC",
  navyLight:"EAF0F6",
};

// ─── BORDERS & HELPERS ────────────────────────────────────────
const bdr  = (color=C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const bdrThick = (color) => ({ style: BorderStyle.SINGLE, size: 4, color });
const bdrs = (color=C.border) => ({ top: bdr(color), bottom: bdr(color), left: bdr(color), right: bdr(color) });
const noBdr = () => ({ style: BorderStyle.NONE, size: 0, color: "FFFFFF" });
const noBdrs = () => ({ top: noBdr(), bottom: noBdr(), left: noBdr(), right: noBdr() });
const cm  = { top: 100, bottom: 100, left: 150, right: 150 };
const cmLg = { top: 140, bottom: 140, left: 180, right: 180 };

// ─── TEXT HELPERS ─────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 440, after: 220 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: C.accent, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: C.navy })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: C.accent })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: C.dark })]
  });
}

function body(text, opts={}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: "Arial", size: 20, color: C.textDark, ...opts })]
  });
}

function bodyMixed(runs) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
    children: runs
  });
}

function run(text, opts={}) {
  return new TextRun({ text, font: "Arial", size: 20, color: C.textDark, ...opts });
}

function bullet(text, bold_prefix="") {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [
      ...(bold_prefix ? [new TextRun({ text: bold_prefix + "  ", font: "Arial", size: 20, bold: true, color: C.navy })] : []),
      new TextRun({ text, font: "Arial", size: 20, color: C.textDark })
    ]
  });
}

function spacer(n=1) {
  return new Paragraph({ spacing: { before: 100*n, after: 0 }, children: [new TextRun("")] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── SECTION BANNER ──────────────────────────────────────────
function sectionBanner(text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: bdrs(C.navy),
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 130, bottom: 130, left: 220, right: 220 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: C.white })]
      })]
    })]})],
  });
}

// ─── CALLOUT BOX (label | text) ───────────────────────────────
function callout(label, text, color=C.accent, bgColor=C.light) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [500, 8860],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: bdrs(color),
        width: { size: 500, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: cm,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, font: "Arial", size: 16, bold: true, color: C.white })] })]
      }),
      new TableCell({
        borders: bdrs(color),
        width: { size: 8860, type: WidthType.DXA },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: cmLg,
        children: [new Paragraph({
          children: [new TextRun({ text, font: "Arial", size: 20, color: C.textDark })]
        })]
      })
    ]})]
  });
}

// ─── METRIC CARD ROW ─────────────────────────────────────────
// Creates a row of 3 KPI "cards" side by side
function metricCards(cards) {
  // cards = [{value, label, color}]
  const w = 3120;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: cards.map(() => w),
    rows: [new TableRow({ children: cards.map(c => new TableCell({
      borders: bdrs(c.color || C.accent),
      width: { size: w, type: WidthType.DXA },
      shading: { fill: c.color || C.accent, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 80, left: 160, right: 160 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: c.value, font: "Arial", size: 36, bold: true, color: C.white })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: c.label, font: "Arial", size: 16, color: "DDEEEE" })] })
      ]
    }))})],
  });
}

// ─── GENERIC TABLE ────────────────────────────────────────────
function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: bdrs(C.accent),
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: cm,
      children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, font: "Arial", size: 18, bold: true, color: C.white })] })]
    }))
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const isLast = ci === row.length - 1;
      return new TableCell({
        borders: bdrs(C.border),
        width: { size: colWidths[ci], type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? C.gray : C.white, type: ShadingType.CLEAR },
        margins: cm,
        children: [new Paragraph({
          children: [new TextRun({ text: cell, font: "Arial", size: 18, color: C.textDark,
            bold: (cell.startsWith("TOTAL") || cell.startsWith("5-Year Cumulative") || cell.startsWith("Year 5")) })]
        })]
      });
    })
  }));
  return new Table({
    width: { size: colWidths.reduce((a,b)=>a+b,0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ─── TWO-COLUMN INFO ROW ──────────────────────────────────────
function infoRow(label, value, isEven) {
  return new TableRow({ children: [
    new TableCell({
      borders: bdrs(C.border),
      width: { size: 3000, type: WidthType.DXA },
      shading: { fill: C.navyLight, type: ShadingType.CLEAR },
      margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: label, font:"Arial", size:18, bold:true, color:C.navy })] })]
    }),
    new TableCell({
      borders: bdrs(C.border),
      width: { size: 6360, type: WidthType.DXA },
      shading: { fill: isEven ? C.gray : C.white, type: ShadingType.CLEAR },
      margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: value, font:"Arial", size:18, color:C.textDark })] })]
    })
  ]});
}

// ─── DOCUMENT ─────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level:0, format:LevelFormat.BULLET, text:"\u2022", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
      { reference: "numbers",
        levels: [{ level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font:"Arial", size:20 } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:32, bold:true, font:"Arial", color:C.navy },
        paragraph:{ spacing:{ before:440, after:220 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:26, bold:true, font:"Arial", color:C.accent },
        paragraph:{ spacing:{ before:360, after:160 }, outlineLevel:1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width:12240, height:15840 },
        margin: { top:1440, right:1440, bottom:1440, left:1440 }
      }
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style:BorderStyle.SINGLE, size:6, color:C.accent, space:4 } },
          tabStops: [{ type:TabStopType.RIGHT, position:9360 }],
          children: [
            new TextRun({ text:"OCTARYN SYSTEMS \u2014 INFINITY OS", font:"Arial", size:16, bold:true, color:C.navy }),
            new TextRun({ text:"\tCONFIDENTIAL \u2014 FOR INVESTOR & PARTNER USE ONLY", font:"Arial", size:16, color:C.red })
          ]
        })
      ]})
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          border: { top: { style:BorderStyle.SINGLE, size:6, color:C.accent, space:4 } },
          tabStops: [{ type:TabStopType.RIGHT, position:9360 }],
          children: [
            new TextRun({ text:"Octaryn Systems Pvt. Ltd. \u2014 Infinity OS Strategic Business Plan 2026", font:"Arial", size:16, color:C.accent }),
            new TextRun({ text:"\tPage ", font:"Arial", size:16, color:C.navy }),
            new TextRun({ children:[PageNumber.CURRENT], font:"Arial", size:16, color:C.navy })
          ]
        })
      ]})
    },

    children: [

      // ══════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════
      spacer(3),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"OCTARYN SYSTEMS", font:"Arial", size:60, bold:true, color:C.navy })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom:{ style:BorderStyle.SINGLE, size:16, color:C.gold, space:6 } },
        spacing: { after:160 },
        children: [new TextRun({ text:"INFINITY OS", font:"Arial", size:80, bold:true, color:C.accent })]
      }),
      spacer(1),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"Strategic Business Plan & Investment Proposal", font:"Arial", size:32, bold:true, color:C.dark })]
      }),
      spacer(1),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"TALON Counter-UAS Platform \u2014 India Defence Market Entry", font:"Arial", size:26, color:C.accent, italics:true })]
      }),
      spacer(2),

      // KPI highlight bar on cover
      metricCards([
        { value:"\u20B915,000 Cr+", label:"Addressable Market (5Y)", color:C.navy },
        { value:"\u20B92\u20135", label:"Cost Per Intercept", color:C.accent },
        { value:"37x", label:"Cheaper than Indrajaal", color:C.green },
      ]),
      spacer(1),
      metricCards([
        { value:"1,350+", label:"Prison Facilities in India", color:C.dark },
        { value:"17,000", label:"Drone Images Trained On", color:C.accent },
        { value:"\u20B9306 Cr+", label:"5-Year Revenue Projection", color:C.navy },
      ]),

      spacer(2),

      // Cover info table — centered
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        columnWidths: [3000, 3000],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.navy,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Prepared by",font:"Arial",size:18,color:C.mid})]})] }),
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.navy,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Aakash Priyadarshi, CEO",font:"Arial",size:18,bold:true,color:C.white})]})] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.light,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Document Class",font:"Arial",size:18,color:C.navy})]})] }),
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.light,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"CONFIDENTIAL",font:"Arial",size:18,bold:true,color:C.red})]})] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.gray,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Version",font:"Arial",size:18,color:C.navy})]})] }),
            new TableCell({ borders:bdrs(C.accent), width:{size:3000,type:WidthType.DXA},
              shading:{fill:C.gray,type:ShadingType.CLEAR}, margins:cm,
              children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"v2.1 \u2014 May 2026",font:"Arial",size:18,color:C.dark})]})] }),
          ]}),
        ]
      }),
      spacer(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"M.Sc. Computer Science \u2014 University of Liverpool  |  Former AI Engineer, Merur (OpenAI & Anthropic Projects)",
          font:"Arial", size:18, color:C.accent, italics:true })]
      }),

      pageBreak(),

      // ══════════════════════════════════════════════
      // TABLE OF CONTENTS
      // ══════════════════════════════════════════════
      sectionBanner("TABLE OF CONTENTS"),
      spacer(1),
      new TableOfContents("Contents", {
        hyperlink: true,
        headingStyleRange: "1-2",
        stylesWithLevels: [
          { styleName: "Heading 1", level: 1 },
          { styleName: "Heading 2", level: 2 },
        ]
      }),
      spacer(1),
      callout("NOTE", "This document contains 12 sections covering the full commercial, technical, and regulatory investment thesis for Infinity OS and the TALON counter-UAS platform. Investors may navigate directly to Section 5 (Financials), Section 7 (Competitive Moat), or Section 12 (Investment Ask) for priority reading.", C.navy, C.navyLight),

      pageBreak(),

      // ══════════════════════════════════════════════
      // SECTION 1 — EXECUTIVE SUMMARY
      // ══════════════════════════════════════════════
      sectionBanner("SECTION 1: EXECUTIVE SUMMARY"),
      spacer(1),
      h1("1. Executive Summary"),
      body("Octaryn Systems is an Indian defence AI company building Infinity OS — the world's first autonomous counter-drone operating system engineered specifically for the zero-collateral, forensic-evidence-preserving requirements of correctional facilities, critical national infrastructure, and military perimeter defence."),
      spacer(1),
      body("The Indian counter-UAS market is experiencing the most rapid capital deployment in its history. Operation Sindoor (2025) required the Indian Armed Forces to neutralize nearly 400 hostile drones in a single operational window. The BSF reported 791 drone intrusions along the Punjab border in 2025 alone. India's 1,350+ prisons face nightly aerial contraband drops that existing RF jammers and kinetic systems cannot address without catastrophic collateral damage."),
      spacer(1),
      callout("THE CORE DIFFERENTIATOR", "Every current Indian counter-drone solution destroys the drone. Infinity OS captures it — preserving the payload, the flight data, the operator's coordinates, and the prosecution evidence. This single architectural decision opens a market segment entirely uncontested by DRDO, Zen Technologies, Grene Robotics, or any foreign vendor.", C.green, C.lightGreen),
      spacer(1),
      makeTable(
        ["Metric", "Value"],
        [
          ["Target Market (India)",           "1,350+ prisons, 503 airports, 200+ power plants, military bases"],
          ["Addressable Market Value",         "\u20B915,000+ crore over 5 years (conservative)"],
          ["Cost Per Intercept (Infinity OS)", "\u20B92\u20135 (electricity only)"],
          ["Cost Per Intercept (Competitor)",  "\u20B950,000 \u2013 \u20B94,00,00,000"],
          ["5-Year TCO vs. Nearest Competitor","5x cheaper than D4 System; 37x cheaper than Indrajaal"],
          ["Prototype Status",                 "Working dual-turret system — hardware ordered, assembly in progress"],
          ["AI Model",                         "Custom YOLO — trained on 17,000 drone images, validated in lab"],
          ["Funding Sought",                   "Seed / Strategic Partner Investment (\u20B913.5 lakh)"],
          ["iDEX Grant Eligibility",           "Up to \u20B910 crore (ADITI / iDEX Prime track)"],
          ["Customer Payback Period",          "Under 12 months at a single Tihar-scale prison"],
          ["5-Year Revenue Projection",        "\u20B9306 crore+ (domestic civilian only; no export or MoD contracts assumed)"],
        ],
        [3200, 6160]
      ),
      spacer(2),

      // ══════════════════════════════════════════════
      // SECTION 2 — THE PROBLEM
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 2: THE PROBLEM — WHY THIS MARKET, WHY NOW"),
      spacer(1),
      h1("2. The Problem We Are Solving"),
      h2("2.1 India Is at the Epicentre of the Drone Threat"),
      body("The tactical and strategic threat from unmanned aerial systems has moved from theoretical vulnerability to daily operational crisis across three distinct Indian security contexts:"),
      spacer(1),
      callout("BORDER", "Operation Sindoor (2025): Indian forces neutralized ~400 Pakistani drones in a single operational window. The BSF recorded 791 intrusions and seized 367 kg of heroin via drone drops on the Punjab border in 2025 alone. GPS-waypoint autonomous drones operate in complete RF silence — making all existing jammers effectively blind.", C.red, C.redLight),
      spacer(1),
      callout("PRISON", "Kapurthala Central Jail (2025): Drones successfully bypassed perimeter walls to deliver contraband directly to inmates. Tihar Jail reported 105+ drone incidents in 2023. India's 1,350+ prisons have zero effective aerial defence. Each successful delivery costs the system \u20B92\u201310 lakh in investigation, legal proceedings, and security review.", C.gold, C.amberLight),
      spacer(1),
      callout("INFRA", "Critical infrastructure — nuclear plants, airports, power stations — faces drone harassment daily. The Noida International Airport reported sustained night-time drone disruption. There is no affordable, zero-collateral solution available at any of these sites today.", C.accent, C.light),
      spacer(1),

      h2("2.2 Why All Current Solutions Fail"),
      body("The Indian counter-UAS market is dominated by two approaches — RF jamming and kinetic destruction — both fundamentally incompatible with civilian-adjacent environments:"),
      spacer(1),
      makeTable(
        ["Problem", "RF Jamming", "Laser / Kinetic", "Infinity OS TALON"],
        [
          ["Collateral EMI damage",    "Disrupts hospital comms, ATC, mobile networks", "None", "\u2713 Zero — no RF broadcast"],
          ["Debris / fallout risk",    "Drone crashes uncontrolled", "Flaming debris, detonating payloads", "\u2713 Zero — drone captured intact"],
          ["Forensic evidence",        "Completely destroyed", "Completely destroyed", "\u2713 100% preserved — payload, SD card, GPS logs"],
          ["GPS-silent drones",        "Completely blind", "Requires visual lock", "\u2713 Acoustic + radar + visual fusion"],
          ["Legal authorization",      "Restricted near airports, cities", "MoD clearance required", "\u2713 Net capture permissible in civilian contexts"],
          ["Cost per intercept",       "\u20B92\u20135 but restricted use", "\u20B91\u20133 but MoD clearance", "\u2713 \u20B92\u20135 unrestricted civilian use"],
        ],
        [2500, 1900, 1900, 3060]
      ),
      spacer(1),
      body("The result is a massive, uncontested blue-ocean opportunity: a system built specifically for the strict legal, forensic, and physical safety requirements of prisons, airports, and critical infrastructure — where every existing Indian system cannot legally be deployed."),

      // ══════════════════════════════════════════════
      // SECTION 3 — THE SOLUTION
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 3: OUR SOLUTION — INFINITY OS & TALON"),
      spacer(1),
      h1("3. Infinity OS and TALON — The Architecture"),
      h2("3.1 What Infinity OS Is"),
      body("Infinity OS is not a drone detector. It is the cognitive operating system for autonomous physical systems — the Android of Autonomy. Just as Android abstracts hardware for mobile software, Infinity OS abstracts the physical world for AI. It perceives through any sensor, reasons through AI, decides through deterministic policy, and acts through any actuator."),
      spacer(1),
      body("TALON (Threat Assessment and Low-Collateral Operational Neutralisation) is the first product running on Infinity OS — engineered specifically for airspace defence with a strict zero-collateral mandate."),
      spacer(1),

      h2("3.2 The Dual-Path Architecture — The Core Innovation"),
      body("The single most critical and defensible architectural innovation in Infinity OS is the Dual-Path cognitive design. This separates Octaryn from every competitor in India and globally:"),
      spacer(1),
      makeTable(
        ["", "Path A — Deterministic Pipeline", "Path B — Cognitive Layer"],
        [
          ["Role",          "The trigger finger", "The explainability engine"],
          ["Technology",    "YOLOv8 + Rules engine on NVIDIA Jetson Orin", "48B parameter LLM (air-gapped, locally hosted)"],
          ["Latency",       "Under 200ms detect-to-action", "3\u201330 seconds for briefing"],
          ["Output",        "Hard command: LAUNCH / NO LAUNCH", "Explainable briefing card for operator"],
          ["LLM involved?", "Zero — purely deterministic", "Yes — fine-tuned on defence terminology"],
          ["Why it matters","Meets MoD requirement for deterministic weapons systems", "Solves the black-box AI trust problem in defence procurement"],
        ],
        [2200, 3580, 3580]
      ),
      spacer(1),
      body("This architecture directly addresses the Indian MoD's two most cited barriers to AI adoption in weapons systems: (1) unpredictable LLM behaviour on the critical path, and (2) inability to explain autonomous decisions to commanders and legal authorities. Infinity OS solves both simultaneously."),
      spacer(1),

      h2("3.3 Multi-Sensor Fusion — No Single Point of Failure"),
      body("Unlike competitors that rely exclusively on RF detection — and are therefore blind to GPS-waypoint autonomous drones — TALON fuses four independent sensor modalities:"),
      spacer(1),
      bullet("RF Scanner (NRF24L01+PA+LNA) — detects 2.4GHz/5.8GHz drone hopping patterns. Distinguishes drone RF signatures from WiFi and phone noise by frequency-hopping analysis.", "RF:"),
      bullet("Electro-Optical Camera (3MP ESP32-CAM + primary laptop camera) — YOLO computer vision trained on 17,000 drone images for visual classification at up to 800m.", "EO:"),
      bullet("LiDAR Distance Sensor (DFRobot I2C, 2\u2013400cm prototype / long-range production) — confirms exact target range for precision countermeasure deployment.", "LiDAR:"),
      bullet("Acoustic Array (production version) — detects rotor noise signatures. Effective for GPS-waypoint silent drones that evade RF detection entirely.", "Acoustic:"),
      spacer(1),
      callout("CRITICAL CAPABILITY", "If a smuggling drone maintains complete RF silence to evade jammers, the acoustic and visual layers still trigger detection and defeat. No single failure mode defeats the system — and no competitor offers this multi-modal redundancy in a zero-collateral architecture.", C.green, C.lightGreen),
      spacer(1),

      h2("3.4 Zero-Collateral Defeat — The Forensic Advantage"),
      body("TALON's primary defeat mechanism is net capture — the interceptor drone deploys a physical net, entangles the hostile drone's rotors, and lowers it intact to a designated recovery zone. This achieves what no competitor in India can claim:"),
      spacer(1),
      bullet("Zero electromagnetic interference with hospital communications, ATC systems, or cellular networks"),
      bullet("Zero debris — no flaming wreckage falling into prison courtyards or populated areas"),
      bullet("100% forensic evidence preserved — contraband payload, SD card with flight logs, GPS waypoints, and drone serial number all recoverable for NIA prosecution"),
      bullet("Legally deployable in civilian contexts where RF jamming and lasers are restricted or prohibited"),
      spacer(1),
      callout("KEY INSIGHT", "Every successful prosecution of a drone smuggling network requires the drone intact. RF jammers and lasers guarantee zero prosecutions. TALON guarantees every intercept is also a prosecution-ready evidence package — making us irreplaceable to the Ministry of Home Affairs.", C.navy, C.navyLight),

      // ══════════════════════════════════════════════
      // SECTION 4 — MARKET OPPORTUNITY
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 4: MARKET OPPORTUNITY"),
      spacer(1),
      h1("4. Market Opportunity"),
      h2("4.1 The Indian Defence Budget Context"),
      body("India's defence capital acquisition budget reached \u20B91.92 lakh crore (approximately $24 billion) for FY2025-26. Counter-UAS is one of the fastest-growing segments within this budget, directly accelerated by Operation Sindoor and the BSF's documented border drone crisis."),
      spacer(1),
      body("Market validation is not theoretical — it is already demonstrated by competitor contract values:"),
      spacer(1),
      makeTable(
        ["Company", "Contract", "Value"],
        [
          ["Zen Technologies",          "Anti-drone systems supply",              "\u20B9404 crore"],
          ["Zen Technologies",          "Post-Sindoor emergency upgrade",         "\u20B9289 crore"],
          ["Zen Technologies",          "Hard-kill capability addition",          "\u20B937 crore"],
          ["Zen Technologies",          "Annual Maintenance Contract",            "\u20B946 crore/year"],
          ["Grene Robotics",            "Naval/Army Indrajaal deployment",        "\u20B9100 crore"],
          ["DRDO + BEL",               "IDD&IS Laser system (23 units)",         "\u20B9400 crore"],
          ["TOTAL (sample, 2024-25)",   "Above contracts only",                   "\u20B91,276 crore+"],
        ],
        [2800, 4360, 2200]
      ),
      spacer(1),
      body("This is not a market we are trying to create. This is a market already spending over \u20B91,000 crore per year — and we offer a solution that is fundamentally superior for the largest, most underserved segment of that market."),
      spacer(1),

      h2("4.2 Our Target Segment — The Blue Ocean"),
      body("While Zen, Grene, and DRDO compete for the same military battlefield contracts, there is an entirely uncontested segment that none of them can serve with their current technology:"),
      spacer(1),
      makeTable(
        ["Segment", "Facilities", "Annual Budget / Facility", "5-Year Market Size"],
        [
          ["Central & District Prisons",  "1,350+",          "\u20B96\u201310 lakh/year (software)",   "\u20B9810 \u2013 \u20B91,350 crore"],
          ["Domestic Airports",           "503 (UDAN target)","\\u20B915\u201325 lakh/year",             "\u20B9754 \u2013 \u20B91,257 crore"],
          ["Nuclear & Power Plants",      "200+",             "\u20B920\u201335 lakh/year",             "\u20B9400 \u2013 \u20B9700 crore"],
          ["Military Forward Bases",      "500+",             "\u20B940\u201380 lakh/year",             "\u20B92,000 \u2013 \u20B94,000 crore"],
          ["State Police & Events",       "Recurring",        "\u20B92\u20135 lakh/deployment",         "\u20B9500 crore+"],
          ["TOTAL 5-YEAR ADDRESSABLE",    "",                 "",                              "\u20B915,000 \u2013 \u20B925,000 crore"],
        ],
        [2500, 1800, 2500, 2560]
      ),
      spacer(1),

      h2("4.3 Why Competitors Cannot Enter Our Segment"),
      body("This is not merely a positioning choice — it is an architectural reality. Zen Technologies' ZADS jams entire frequency bands and integrates with Bofors L70 anti-aircraft artillery. These systems physically cannot be deployed at a prison, hospital, or airport without regulatory prohibition. The Ministry of Civil Aviation has explicitly restricted electromagnetic disruption techniques in the National Airspace System."),
      spacer(1),
      body("Our competitors would need to rebuild their core architecture from scratch to enter our segment. We are built for this segment from the ground up. This moat is technical and regulatory — not just strategic."),

      // ══════════════════════════════════════════════
      // SECTION 5 — FINANCIALS
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 5: FINANCIAL PROJECTIONS & UNIT ECONOMICS"),
      spacer(1),
      h1("5. Financial Model"),
      h2("5.1 Revenue Streams"),
      body("Infinity OS operates on a three-stream revenue model modelled on the most defensible and high-margin structures in enterprise software and defence procurement:"),
      spacer(1),
      makeTable(
        ["Stream", "Mechanism", "Margin", "Scalability"],
        [
          ["1. System Integration Fee",   "One-time per deployment: \u20B98\u201340 lakh depending on scope",                              "60\u201370%",  "Grows with deployments"],
          ["2. Annual Software License",  "Per-facility: \u20B96\u201380 lakh/year by facility type",                                     "85\u201390%",  "Scales to 1,350+ prisons"],
          ["3. AMC (Maintenance)",        "18\u201325% of system value annually — standard Indian defence AMC structure",             "70\u201380%",  "Pure recurring, zero marginal cost"],
          ["4. Per-Unit Royalty (OEM)",   "Fixed royalty on every Infinity OS-powered unit manufactured by partner",             "95\u201398%",  "Scales with OEM production volume"],
          ["5. Data Flywheel (Year 3+)",  "Monetize proprietary Indian threat dataset for model fine-tuning services",           "95%+",    "Compounding — unique global asset"],
        ],
        [2400, 3200, 1200, 2560]
      ),
      spacer(1),

      h2("5.2 Unit Economics — Single Prison Deployment"),
      makeTable(
        ["Item", "Value"],
        [
          ["Hardware (4-turret professional system)",       "\u20B91,71,00,000"],
          ["Integration fee (one-time)",                   "\u20B930,00,000"],
          ["Software license Year 1",                      "\u20B910,00,000"],
          ["Total Year 0 Revenue",                         "\u20B92,11,00,000"],
          ["Cost of goods (hardware at 20% margin)",       "\u20B91,42,50,000"],
          ["Year 0 Gross Profit",                          "\u20B968,50,000  (32% gross margin)"],
          ["Annual recurring (license + AMC at 18%)",      "\u20B940,80,000/year"],
          ["Annual recurring gross margin",                "~75%  (\u20B930,60,000/year)"],
          ["5-Year Total Revenue (single prison)",         "\u20B93,74,20,000  (~\u20B93.74 crore)"],
          ["5-Year Total Gross Profit",                    "\u20B91,91,10,000  (~\u20B91.91 crore)"],
        ],
        [5000, 4360]
      ),
      spacer(1),

      h2("5.3 Scale Scenario — 5-Year Projection"),
      body("Conservative deployment targets based on iDEX pilot pathway and direct MHA/MoD sales:"),
      spacer(1),
      makeTable(
        ["Year", "New Deployments", "Total Active Sites", "Annual Revenue", "Annual Recurring"],
        [
          ["Year 1 (2026)", "1 pilot prison + 1 airport",                  "2",   "\u20B94.22 crore",   "\u20B981.6 lakh"],
          ["Year 2 (2027)", "5 prisons + 2 airports",                      "9",   "\u20B914.7 crore",   "\u20B93.67 crore"],
          ["Year 3 (2028)", "15 prisons + 5 airports + 2 power plants",    "31",  "\u20B942.3 crore",   "\u20B912.6 crore"],
          ["Year 4 (2029)", "30 sites + OEM licensing begins",             "61",  "\u20B989.1 crore",   "\u20B926.7 crore"],
          ["Year 5 (2030)", "50 sites + OEM royalty at scale",             "111", "\u20B9156 crore",    "\u20B948.9 crore"],
          ["5-Year Cumulative", "", "", "\u20B9306 crore+", ""],
        ],
        [1440, 2800, 1600, 2000, 1520]
      ),
      spacer(1),
      callout("INVESTOR NOTE", "These projections assume zero export revenue, zero military contract wins, and zero iDEX grant funding. They represent domestic civilian security sales only. Even on this conservative basis, Year 5 revenue exceeds \u20B9150 crore. A single MoD contract of the scale Zen Technologies regularly wins (\u20B9289\u2013404 crore) would be transformative.", C.green, C.lightGreen),
      spacer(1),

      h2("5.4 Cost Per Intercept — The Killer Metric"),
      makeTable(
        ["System", "Cost Per Intercept", "Evidence Preserved", "Civilian Legal?"],
        [
          ["VSHORAD Missile",           "\u20B94,00,00,000 (4 crore)", "Zero",                   "Never"],
          ["Bhargavastra Micro-Missile","\u20B950,000 \u2013 \u20B92,00,000",   "Zero",                   "Never"],
          ["D4 Interceptor Drone",      "\u20B930,000 \u2013 \u20B91,00,000",   "Partial",                "Restricted"],
          ["Zen ZADS (RF + Artillery)", "\u20B910,000 \u2013 \u20B950,000",     "Zero",                   "Prohibited near cities"],
          ["IDD&IS Laser (DRDO)",       "\u20B950\u2013200",               "Zero — drone destroyed", "MoD clearance required"],
          ["Infinity OS TALON",         "\u20B92\u20135 (electricity only)","100% intact",            "Yes — all civilian contexts"],
        ],
        [2800, 2400, 2160, 2000]
      ),
      spacer(1),
      body("At Tihar Jail's reported 105 incidents per year, the annual intercept cost difference between the nearest competitor and Infinity OS is approximately \u20B952 lakh — more than enough to pay for the entire software license and AMC within the first year."),

      h2("5.5 Break-Even Analysis"),
      body("At a blended integration + license model, Octaryn reaches operational break-even at 4\u20136 active deployments. This corresponds to approximately mid-Year 2 in the conservative projection. After break-even, each new deployment adds ~\u20B940 lakh/year in high-margin recurring revenue with near-zero marginal cost, driving rapid EBITDA expansion from Year 3 onward."),

      // ══════════════════════════════════════════════
      // SECTION 6 — GO-TO-MARKET
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 6: GO-TO-MARKET & REGULATORY STRATEGY"),
      spacer(1),
      h1("6. Go-To-Market Strategy"),
      h2("6.1 The OEM Licensing Model — Android of Autonomy"),
      body("Octaryn does not need to manufacture drones. The core strategic positioning is as the intelligence layer that empowers Indian hardware manufacturers to deliver next-generation autonomous systems. This mirrors the most profitable IP licensing models in technology history — ARM, Qualcomm, and Google Android."),
      spacer(1),
      bullet("Indian OEM partner manufactures the physical interceptor drone, turret hardware, and enclosures", "Partner:"),
      bullet("Octaryn licenses Infinity OS Edge AI Engine, Deterministic Policy Engine, and Cognitive LLM Layer", "Octaryn:"),
      bullet("OEM bids for MoD contracts with Infinity OS as the AI brain — qualifying for IDDM status under DAP 2026", "Contract:"),
      bullet("Octaryn collects per-unit royalty on every system manufactured — scaling revenue without scaling headcount", "Revenue:"),
      spacer(1),
      body("Target OEM partners: Garuda Aerospace (recently partnered with Tata Elxsi and HAL), ideaForge (Indian Army standard surveillance drone), L&T Defence, Bharat Forge. These companies have the manufacturing infrastructure, DGCA certifications, and MoD relationships. Octaryn provides the intelligence they cannot build in-house."),
      spacer(1),

      h2("6.2 The iDEX Pathway — Funded Entry"),
      body("The most strategically efficient entry point into Indian defence procurement is the iDEX (Innovations for Defence Excellence) ecosystem — the government-mandated procurement pathway for defence startups under DAP 2020."),
      spacer(1),
      makeTable(
        ["Program", "Grant Amount", "Our Eligibility", "Timeline"],
        [
          ["iDEX DISC 14 (open now)", "Up to \u20B91.5 crore", "Counter-drone problem statements — direct match", "Apply immediately"],
          ["ADITI Challenge",         "Up to \u20B910 crore",  "AI + autonomous systems + counter-drone = exact fit", "Apply immediately"],
          ["iDEX Prime",              "Up to \u20B910 crore",  "TRL 4+ required — our working prototype qualifies", "After DISC win"],
          ["TDF Scheme (DRDO)",       "Up to \u20B950 crore",  "Technology Development Fund for MSMEs", "Year 2"],
        ],
        [2500, 2000, 3260, 1600]
      ),
      spacer(1),
      callout("STRATEGIC NOTE", "iDEX winners receive an Acceptance of Necessity (AoN) from the Armed Forces — the official signal that the technology is wanted. Once AoN is issued, BEL, HAL, and other DPSUs approach the startup for manufacturing partnerships. This is how DRDO outsources to us, not the other way around.", C.navy, C.navyLight),
      spacer(1),

      h2("6.3 DAP 2026 Compliance Strategy"),
      body("The upcoming DAP 2026 shifts Indian defence procurement from 'Make in India' (manufacturing) to 'Owned by India' (IP ownership). This regulation works entirely in our favour — and against foreign competitors like Dedrone and DroneShield."),
      spacer(1),
      makeTable(
        ["DAP 2026 Requirement", "Foreign Competitor Status", "Infinity OS Status"],
        [
          ["Source code ownership by Indian entity",    "Cannot comply — foreign IP",         "\u2713 100% Indian owned — full IDDM"],
          ["Design IPR held by Indian company",         "Cannot comply",                      "\u2713 Full ownership — registered IP"],
          ["No external permissions to modify system",  "Cannot comply — vendor lock-in",     "\u2713 Air-gapped, fully sovereign"],
          ["Indigenous Content >50%",                   "Fails on AI/software layer",         "\u2713 Exceeds requirement"],
          ["Buy (Indian-IDDM) category eligibility",    "Disqualified",                       "\u2713 Top priority category"],
        ],
        [3000, 3000, 3360]
      ),
      spacer(1),
      body("Under DAP 2026, Dedrone ($8\u201315 crore per site) and DroneShield simply cannot qualify for top-tier procurement. We can. The field narrows to Indian companies only — and we are the only Indian company with a zero-collateral net-capture AI architecture."),
      spacer(1),

      h2("6.4 Sales Channels & Customer Acquisition"),
      makeTable(
        ["Channel", "Target Customer", "Timeline", "Contract Value"],
        [
          ["iDEX / ADITI challenge",     "Indian Army, BSF, Navy directly",          "0\u201312 months",   "\u20B91.5\u201310 crore grant + AoN"],
          ["MHA direct pitch",           "Prison system (1,350+ facilities)",         "6\u201318 months",   "\u20B96\u201310 lakh/year per facility"],
          ["Ministry of Civil Aviation", "Airport perimeter (503 airports)",          "12\u201324 months",  "\u20B915\u201325 lakh/year per airport"],
          ["NTPC / Nuclear Power Corp",  "Power plant perimeter security",            "18\u201336 months",  "\u20B920\u201335 lakh/year"],
          ["OEM licensing (BEL/HAL)",    "MoD large-scale contracts",                 "24\u201348 months",  "Royalty on \u20B9100\u2013500 crore contracts"],
          ["State police & event security","IPL, G20-type events, VIP security",      "Ongoing",       "\u20B92\u20135 lakh/deployment"],
        ],
        [2200, 2500, 1700, 2960]
      ),

      // ══════════════════════════════════════════════
      // SECTION 7 — COMPETITIVE MOAT
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 7: COMPETITIVE MOAT & TECHNOLOGY LEADERSHIP"),
      spacer(1),
      h1("7. Why We Win — Sustainable Competitive Advantages"),
      h2("7.1 The Data Flywheel — The Ultimate Long-Term Moat"),
      body("Every deployment of TALON generates proprietary operational data that no competitor can replicate: specific RF signatures of Indian border smuggling drones, flight patterns of prison contraband drones, acoustic profiles of low-cost FPV drones modified for kamikaze attacks, and the unique RF congestion profiles of Indian urban environments."),
      spacer(1),
      body("This data does not exist in any public dataset. Within six months of deployment across multiple live sites, the Infinity OS Forensic Vault accumulates an unreplicable Indian threat intelligence dataset. Using Direct Preference Optimization (DPO) and human-in-the-loop feedback, models are continuously retrained offline."),
      spacer(1),
      body("By Year 2, Infinity OS will detect Indian-specific drone threats faster and more accurately than any system not trained on Indian operational data. By Year 3, this capability is licensed back to DRDO, the BSF, and foreign intelligence partners. The data flywheel accelerates as deployments scale — and competitors cannot catch up regardless of budget."),
      spacer(1),

      h2("7.2 The Six Moats"),
      makeTable(
        ["Moat", "Description", "Time to Replicate"],
        [
          ["Dual-Path Architecture IP",       "Provisional patent filed. Separation of deterministic trigger from LLM explainability layer is novel and defensible.", "3\u20135 years"],
          ["Proprietary AI Model",            "17,000-image training dataset. Fine-tuned for Indian threat matrix. Growing with every deployment.", "Cannot replicate without Indian deployment data"],
          ["Zero-Collateral Positioning",     "Architectural — competitors must rebuild from scratch. Regulatory — RF/laser competitors are prohibited in our target segment.", "Architectural rebuild required"],
          ["DAP 2026 IDDM Status",            "Full Indian IP ownership qualifies for top procurement priority. Foreign competitors structurally disqualified.", "Foreign competitors permanently excluded"],
          ["iDEX Validation",                 "Government endorsement creates trusted procurement pathway. Creates AoN signal that draws DPSU partnerships.", "Cannot be purchased — must be earned"],
          ["Operational Data Flywheel",       "Proprietary Indian threat intelligence dataset compounds with each deployment.", "Requires years of live Indian deployments"],
        ],
        [2400, 4760, 2200]
      ),
      spacer(1),

      h2("7.3 Competitive Landscape Summary"),
      makeTable(
        ["System", "Detection", "Defeat", "Zero-Collateral", "Evidence", "Civilian Legal", "IDDM"],
        [
          ["DRDO D-4/BEL",       "Radar+RF+EO",         "Laser+Jamming",      "No",              "No",  "No",              "Yes (competitor)"],
          ["Zen ZADS",           "RF+Radar+Video",       "Jammer+L70 gun",     "No",              "No",  "No",              "Yes (competitor)"],
          ["Grene Indrajaal",    "Wide-area network",    "System agnostic",    "Partial",         "No",  "Partial",         "Yes (competitor)"],
          ["Dedrone (USA)",      "RF+Radar",             "RF Jamming only",    "No",              "No",  "No",              "No — excluded DAP"],
          ["DroneShield (AUS)", "RF+Acoustic",           "RF Jamming gun",     "No",              "No",  "No",              "No — excluded DAP"],
          ["INFINITY OS TALON", "RF+EO+Acoustic+LiDAR", "Net Capture (intact)","Yes — unique",   "Yes — unique","Yes — unique","Yes — top priority"],
        ],
        [1700, 1800, 1700, 1600, 1300, 1400, 1860]
      ),

      // ══════════════════════════════════════════════
      // SECTION 8 — PARTNERSHIP PROPOSITION
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 8: PARTNERSHIP PROPOSITION"),
      spacer(1),
      h1("8. Why Partnering With Infinity OS is the Highest-Return Defence Investment Available in India Today"),
      body("This section addresses manufacturing partners, OEM collaborators, and channel partners directly. The question is not whether counter-UAS is a growth market — the \u20B91,000+ crore in annual contracts awarded in 2024-25 makes that self-evident. The question is which position in that market generates the highest margin with the lowest regulatory risk."),
      spacer(1),

      h2("8.1 For Manufacturing / OEM Partners"),
      callout("OPPORTUNITY", "You manufacture drones, turrets, and sensor hardware. We provide the AI brain. Together we qualify for IDDM status — the highest procurement priority under DAP 2026 — and bid for contracts that foreign competitors are structurally disqualified from. No other Indian AI company offers this architecture.", C.navy, C.navyLight),
      spacer(1),
      bullet("Immediate IDDM qualification: Full Indian IP ownership means your products achieve top procurement priority — critical as DAP 2026 tightens Indigenous Design requirements"),
      bullet("Differentiation from BEL/DRDO systems: Adding Infinity OS dual-path AI makes your hardware categorically superior to the D-4 or Saksham in the zero-collateral segment"),
      bullet("Access to a proven AI model: 17,000-image trained YOLO model, dual-path architecture, and 48B parameter supervisor agent — years of development delivered under OEM license"),
      bullet("Revenue sharing: Per-unit royalty model means Octaryn's revenue scales with your manufacturing success — perfectly aligned incentives"),
      bullet("Data advantage: Operational data from your deployments feeds model improvement — your hardware gets smarter with every installation"),
      spacer(1),

      h2("8.2 For Investment Partners"),
      callout("RETURN PROFILE", "Defence software companies in India trade at 8\u201315x revenue multiples (Zen Technologies trades at ~12x). At Year 5 projected revenue of \u20B9156 crore, a 10x multiple implies a \u20B91,560 crore valuation. Early-stage investment today captures the maximum equity at minimum valuation.", C.gold, C.amberLight),
      spacer(1),
      makeTable(
        ["Investment Thesis Factor", "Assessment"],
        [
          ["Market timing",       "Optimal — Operation Sindoor created permanent budget urgency; DAP 2026 creates structural moat"],
          ["Team",                "MSc CS (University of Liverpool), prior AI engineering on OpenAI and Anthropic projects at Merur"],
          ["Technology readiness","Working prototype (TRL 4-5), custom-trained AI model, complete software architecture documented"],
          ["Regulatory tailwind", "DAP 2026 eliminates foreign competition; iDEX provides non-dilutive grant funding up to \u20B910 crore"],
          ["Revenue model",       "Three streams — integration fee, annual license, AMC — highest-margin SaaS structure in defence"],
          ["Downside protection", "iDEX grant (non-dilutive) funds prototype completion; civilian sales to prisons/airports is a profitable standalone business"],
          ["Exit options",        "Strategic acquisition by BEL, HAL, Tata Defence, or L&T; or independent IPO following Zen Technologies model"],
        ],
        [3000, 6360]
      ),
      spacer(1),

      h2("8.3 For Channel / Distribution Partners (Anchor Defense Model)"),
      body("For established defence distribution companies with existing MoD relationships, supply-chain certifications, and connections to service branch procurement officers — Infinity OS offers a rare opportunity: a genuinely differentiated Indian AI product with no credible domestic competition in the zero-collateral segment, available for channel representation before the first major tender is announced."),
      spacer(1),
      bullet("Exclusive territory rights for channel partners who commit to minimum annual sales targets"),
      bullet("Full technical training provided — your sales team presents the dual-path architecture to procurement officers"),
      bullet("Octaryn handles all software installation, integration, and AMC — your role is relationship and deal origination"),
      bullet("Channel margin: 12\u201318% on system value per closed deal"),
      bullet("First-mover advantage: Prison and airport segments have not yet been targeted with a zero-collateral solution — the first channel partner to bring this to MHA procurement wins the reference customers"),

      // ══════════════════════════════════════════════
      // SECTION 9 — RISK & MITIGATION
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 9: RISK ANALYSIS & MITIGATION"),
      spacer(1),
      h1("9. Risk Analysis & Mitigation"),
      body("All early-stage defence ventures carry risk. The following table documents key risks, their assessed likelihood and impact, and the specific mitigations already in place or planned."),
      spacer(1),
      makeTable(
        ["Risk", "Likelihood", "Impact", "Mitigation"],
        [
          ["Government procurement delay (long sales cycles)", "High", "Medium", "iDEX pathway bypasses standard tender process; civilian prison/airport sales do not require MoD clearance"],
          ["Competitor launches net-capture product", "Low", "High", "Dual-path architecture patent filed; data flywheel creates widening accuracy gap; DAP 2026 IDDM status excludes foreign entrants"],
          ["Regulatory restriction on interceptor drone operations", "Medium", "Medium", "DGCA airspace approval pursued Year 1 with OEM partner; system sold as AI engine — OEM holds drone certification"],
          ["Prototype fails to demonstrate required detection range", "Medium", "High", "Modular sensor architecture allows upgrade; NVIDIA Jetson Orin extends range; iDEX demo threshold is 50m, not 4km"],
          ["DRDO absorbs concept without IP protection", "Medium", "High", "Source code never shared; compiled binaries only; NDA before every technical discussion; IP registered before first government engagement"],
          ["Key person risk (single founder)", "High", "High", "Seed funding used to hire one senior AI/defence hire; iDEX grant includes team scale requirement; network built through Anchor Defense contacts"],
          ["iDEX application rejected", "Low-Medium", "Medium", "Counter-drone is priority problem statement; dual applications to DISC 14 and ADITI reduce dependency; direct civilian sales pathway independent of iDEX"],
          ["Hardware cost overruns in prototype phase", "Low", "Low", "Prototype budget \u20B97,702 already spent; production prototype at \u20B91.5 lakh — small relative to total seed ask"],
        ],
        [2800, 1200, 1100, 4260]
      ),
      spacer(1),
      callout("RISK SUMMARY", "The most material risks — procurement delay and key person concentration — are both addressable with seed funding deployment. The lowest-risk entry point remains the civilian prison and airport market, which requires no MoD clearance, no DRDO partnership, and no regulatory approval beyond standard MSME and GeM registration.", C.accent, C.light),

      // ══════════════════════════════════════════════
      // SECTION 10 — MEETING OUTCOMES & FAQ
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 10: INVESTOR MEETING OUTCOMES & KEY QUESTIONS ADDRESSED"),
      spacer(1),
      h1("10. Meeting Outcomes & Frequently Asked Questions"),
      body("The following section documents key questions raised during the May 17, 2026 industry meeting with Anchor Defense Integrated Private Limited, and provides comprehensive answers for investor due diligence."),
      spacer(1),

      h2("10.1 Meeting Outcome Summary (May 17, 2026)"),
      makeTable(
        ["Attendee", "Organisation", "Outcome"],
        [
          ["Aakash Priyadarshi", "Octaryn Systems (Infinity OS)",       "Presented full system architecture, prototype status, and business model"],
          ["Abhishek Rajput",    "Anchor Defense Integrated Pvt. Ltd.", "Reviewed system. Offered to circulate credentials to industry contacts. Will not lead R&D (outside their manufacturing/OEM scope)."],
          ["Decision",           "Anchor Defense",                      "Will connect Octaryn to relevant Indian defence industry contacts and potential military clients"],
          ["Next Steps",         "Aakash Priyadarshi",                  "Share project presentation and professional credentials with Anchor Defense's industry network"],
        ],
        [2200, 2800, 4360]
      ),
      spacer(1),
      body("Anchor Defense's response — circulating to contacts rather than investing directly — is entirely consistent with their OEM/manufacturing business model. Their willingness to circulate credentials into a network that includes Indian Navy suppliers and international OEM partners (including the Kalashnikov group) represents a meaningful warm introduction pathway."),
      spacer(1),

      h2("10.2 Key Technical Questions & Answers"),
      h3("Q: Which tier of drone threat does this system address?"),
      body("Abhishek Rajput correctly identified three market tiers: (1) VTOL cargo drones — slow, easiest to intercept; (2) Shahed-class drones — significantly harder; (3) high-speed jet-powered swarm drones — no proven cost-effective solution exists. Infinity OS TALON is optimised for Tier 1 and lower-end Tier 2 — specifically commercial and modified COTS drones used for prison contraband, border smuggling, and critical infrastructure harassment. This is the largest volume segment by far, and the segment with zero adequate current solutions in civilian contexts."),
      spacer(1),
      h3("Q: What are the system's speed and detection range performance metrics?"),
      body("Prototype (current): Detection range 50\u2013200m (camera limited). Production specification: RF detection 1\u20133km; radar 200m\u20134km; acoustic array 100\u2013500m; EO camera 50\u2013800m. Detect-to-defeat latency: under 2 seconds (Path A under 200ms; net intercept dispatch within 2 seconds of confirmed threat). For the prison and perimeter defence use case, 200\u2013500m detection range is operationally sufficient."),
      spacer(1),
      h3("Q: Why build a custom 48B parameter model rather than use an existing LLM?"),
      body("Three reasons. First, Indian MoD cybersecurity requirements mandate air-gapped infrastructure — cloud-based LLMs (GPT-4, Gemini) are structurally prohibited in defence deployments. Second, existing models have not been fine-tuned on Indian Rules of Engagement, the Prison Act 1952, Indian drone threat taxonomy, or BSF operational standing orders. Third, a locally hosted 48B parameter model on NVIDIA Jetson AGX Orin delivers the explainability briefing in 3\u20138 seconds — operationally fast, without hallucination risks on the weapons authorization critical path."),
      spacer(1),
      h3("Q: How does the system handle GPS-waypoint autonomous drones with no RF emissions?"),
      body("This is the most critical gap in all current Indian counter-drone systems. Purely RF-based detectors — including Zen ZADS, DRDO D-4, and BSF field jammers — are entirely blind to autonomous drones operating without a live controller link. Infinity OS multi-sensor fusion addresses this specifically: acoustic sensors detect rotor noise at 100\u2013500m regardless of RF silence; micro-Doppler radar detects physical movement; and the EO camera's YOLO model classifies the visual signature. RF scanning adds confirmation when emissions are present, but is never the sole detection modality."),
      spacer(1),
      h3("Q: Does deployment of Class 4 lasers require DRDO authorization?"),
      body("Yes. This is why TALON's primary defeat mechanism is net capture, not laser burn. The laser module in the prototype demonstrates targeting precision as a proof-of-concept for hard-kill capability. In production deployment, we lead with net capture (legally permissible in all civilian contexts, preserves evidence) and offer laser hard-kill as a separately licensed module for military installations that have obtained MoD clearance. This staged approach maximises our addressable market — prisons, airports, and power plants representing 90% of our TAM do not require laser authorization."),
      spacer(1),
      h3("Q: What is the training data strategy for the custom AI model?"),
      body("Multi-source approach: (1) Existing 17,000-image proprietary dataset for commercial drone visual classification; (2) Public datasets (OpenImages, COCO, custom scraping) for augmentation; (3) RF signature cloning from known drone models operating in India; (4) Synthetic data generation for rare threat scenarios (swarms, night approaches, monsoon conditions); (5) Operational data flywheel — every live deployment generates labelled real-world data feeding continuous model improvement via DPO fine-tuning. The system cross-references ADS-B transponder data to exclude civilian aircraft and minimise false positives."),
      spacer(1),

      h2("10.3 Business Model Questions"),
      h3("Q: How is this business primarily software or hardware?"),
      body("Primarily software — and this is the highest-margin positioning available in the defence sector. Octaryn develops, licenses, and maintains Infinity OS. Hardware is manufactured by Indian OEM partners or sourced as commercial components. Our gross margin on software licensing is 85\u201390%. This mirrors the Qualcomm/ARM model: the IP licensor captures higher margins than the manufacturer, scales without capital expenditure, and builds compounding royalty streams."),
      spacer(1),
      h3("Q: What is the path to a large MoD contract without prior government sales reference?"),
      body("iDEX is specifically designed to solve this problem. Under DAP 2020, iDEX-validated startups can be procured by the Armed Forces without the prior-experience requirement that blocks most small companies from government tenders. The DISC/ADITI challenge win provides: (1) up to \u20B910 crore non-dilutive grant funding; (2) Acceptance of Necessity from a service branch; (3) the government reference that qualifies us for subsequent larger tenders; and (4) the credibility signal that draws DPSU manufacturing partners. The first iDEX win is the master key to the entire procurement ecosystem."),

      // ══════════════════════════════════════════════
      // SECTION 11 — REGULATORY & IP
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 11: REGULATORY COMPLIANCE & IP PROTECTION"),
      spacer(1),
      h1("11. Regulatory Compliance & Intellectual Property"),
      h2("11.1 IP Protection — Action Plan"),
      makeTable(
        ["Protection", "What It Covers", "Where", "Cost", "Status / Timeline"],
        [
          ["Copyright Registration",   "Infinity OS source code, TALON architecture",                  "copyright.gov.in",         "\u20B9500\u20132,000",    "File before first demo"],
          ["Provisional Patent",       "Dual-path AI decision architecture (core innovation)",         "ipindia.gov.in",           "\u20B91,500\u20134,000",  "File immediately — 12 months protection"],
          ["Trademark",                "'Infinity OS', 'TALON', Octaryn Systems logo",                 "ipindia.gov.in",           "\u20B94,500/mark",   "File immediately"],
          ["DPIIT Startup Recognition","iDEX eligibility, tax exemption 3 years, tender relaxations",  "startupindia.gov.in",      "\u20B90",            "Apply immediately"],
          ["Company Registration",     "Pvt. Ltd. — required for all government contracts",            "mca.gov.in",               "\u20B910,000\u201315,000","First priority"],
          ["GeM Registration",         "Mandatory for all government procurement above \u20B925,000",       "gem.gov.in",               "\u20B90",            "Before first pitch meeting"],
          ["MSME Udyam",               "Priority procurement, tender relaxations, subsidized loans",   "udyamregistration.gov.in", "\u20B90",            "Same-day registration"],
          ["NDA Template",             "Before every demo and technical discussion",                   "IP lawyer",                "\u20B95,000 one-time","Before Anchor Defense follow-up"],
        ],
        [2200, 2600, 1600, 1200, 1760]
      ),
      spacer(1),
      callout("CRITICAL WARNING", "Never share source code with any government body, DRDO, or potential partner without a signed NDA and technology licensing framework in place. Share compiled binaries for evaluation only. DRDO has a well-documented history of absorbing startup concepts into their own research programs when IP protections are not in place before engagement.", C.red, C.redLight),
      spacer(1),

      h2("11.2 Licenses Required for Production Deployment"),
      makeTable(
        ["License", "Required For", "Issuing Authority", "Timeline"],
        [
          ["Defence Industrial License (DIL)", "Manufacturing laser countermeasure or RF jammer hardware",   "DPIIT",      "Apply on confirmed order — 3\u20136 months"],
          ["RF Authorization",                 "Operating RF scanner / jammer commercially",                 "DoT / WPC",  "Apply in Year 1"],
          ["DGCA Clearance",                   "Interceptor drone operations (net-capture drone)",           "DGCA",       "Apply in Year 1 with OEM partner"],
          ["NTRO Security Clearance",          "Deploying at sensitive installations",                       "NTRO",       "Applied per deployment"],
          ["MoD Equipment Approval",           "Class 4 laser hard-kill module",                            "Ministry of Defence", "Phase 2 only — not required for net capture"],
        ],
        [2600, 2800, 2000, 1960]
      ),
      spacer(1),
      body("Net capture — our primary defeat mechanism — does not require the same level of regulatory authorization as laser weapons or wide-band jammers. This is a deliberate architectural choice that maximises addressable market while minimising regulatory barriers to entry."),

      // ══════════════════════════════════════════════
      // SECTION 12 — TEAM & TECHNOLOGY READINESS
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 12: TEAM, TECHNOLOGY READINESS & DEVELOPMENT ROADMAP"),
      spacer(1),
      h1("12. Team & Technology Readiness"),
      h2("12.1 Founder Profile"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          infoRow("Name",             "Aakash Priyadarshi", true),
          infoRow("Education",        "Master of Science, Computer Science — University of Liverpool", false),
          infoRow("AI/LLM Experience","Former AI Engineer at Merur — worked on projects involving OpenAI and Anthropic systems", true),
          infoRow("Expertise",        "Full-stack systems engineering, AI/ML development, large language model deployment, real-time embedded systems", false),
          infoRow("Prototype Status", "Working dual-turret counter-drone system — hardware procured, assembly in progress (delivery May 28, 2026)", true),
          infoRow("AI Model",         "Custom YOLO model trained on 17,000 drone images — operational and validated in lab conditions", false),
          infoRow("Architecture",     "Complete Infinity OS dual-path architecture designed and documented", true),
          infoRow("Industry Contact", "Initial meeting completed with Anchor Defense Integrated Pvt. Ltd. (Indian Navy supplier, Kalashnikov OEM partner)", false),
        ]
      }),
      spacer(1),

      h2("12.2 Technology Readiness Level (TRL) Assessment"),
      makeTable(
        ["Component", "Current TRL", "Target TRL (12 months)", "Key Milestone"],
        [
          ["YOLO drone detection model",       "TRL 5 — validated in lab",     "TRL 7 — field validated",    "50m+ detection in outdoor conditions"],
          ["Dual-path architecture (software)", "TRL 4 — prototype working",    "TRL 6 — system demonstrated","iDEX demo to Armed Forces"],
          ["Pan-tilt turret hardware",          "TRL 4 — components ordered",   "TRL 6 — integrated demo unit","Hardware assembly May\u2013June 2026"],
          ["RF drone detection",               "TRL 4 — prototype",            "TRL 6 — validated",           "Drone vs WiFi discrimination tested"],
          ["Net capture mechanism",            "TRL 2 — concept",              "TRL 5 — prototype",           "Interceptor drone integration"],
          ["48B LLM supervisor agent",         "TRL 3 — architecture designed","TRL 5 — fine-tuned model",    "RAG on Indian legal/ROE corpus"],
          ["Full TALON system integration",    "TRL 3",                        "TRL 6",                       "Complete demo for iDEX submission"],
        ],
        [2800, 1600, 2400, 2560]
      ),
      spacer(1),

      h2("12.3 Development Roadmap"),
      makeTable(
        ["Phase", "Timeline", "Milestones", "Funding Required"],
        [
          ["Phase 0 — Prototype Complete",   "May\u2013July 2026",      "Dual-turret hardware assembled. RF detection validated. YOLO tracking live. First demo video recorded.",        "Self-funded (\u20B97,702 hardware)"],
          ["Phase 1 — iDEX Application",     "June\u2013August 2026",   "DISC 14 / ADITI application submitted. IP registered. Company incorporated. GeM registered.",                  "Self-funded + \u20B915,000 IP costs"],
          ["Phase 2 — Production Prototype", "Aug\u2013December 2026",  "NVIDIA Jetson integration. 48B LLM fine-tuning begins. Net capture prototype. iDEX demo delivered.",           "\u20B925\u201350 lakh (seed or iDEX grant)"],
          ["Phase 3 — Pilot Deployment",     "January\u2013June 2027",  "First prison or airport pilot. Operational data collection begins. OEM partner engaged.",                      "\u20B91\u20132 crore (iDEX Prime or Series A)"],
          ["Phase 4 — Scale",               "2027\u20132028",          "5\u201310 active deployments. OEM licensing agreement signed. MoD AoN received.",                                   "\u20B95\u201315 crore (Series A)"],
          ["Phase 5 — Market Leadership",    "2029\u20132030",          "100+ sites. OEM royalty at scale. Data flywheel operational. Export markets.",                                  "Revenue-funded or Series B"],
        ],
        [1800, 1600, 3700, 2260]
      ),

      // ══════════════════════════════════════════════
      // SECTION 13 — INVESTMENT ASK
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("SECTION 13: INVESTMENT ASK & USE OF FUNDS"),
      spacer(1),
      h1("13. Investment Ask"),
      h2("13.1 Funding Requirement"),
      body("Octaryn Systems is seeking seed investment to complete the production prototype, file all IP protections, submit iDEX applications, and deliver the first government demonstration. This represents the minimum viable investment to unlock the iDEX grant pathway — which provides up to \u20B910 crore in non-dilutive follow-on funding."),
      spacer(1),
      makeTable(
        ["Use of Funds", "Amount", "Outcome"],
        [
          ["NVIDIA Jetson AGX Orin (production hardware)",           "\u20B92,08,000", "Production-grade AI inference capability"],
          ["48B LLM fine-tuning compute (cloud, 3 months)",          "\u20B980,000",   "Path B supervisor agent trained on Indian legal corpus"],
          ["IP protection (patent + trademark + copyright)",         "\u20B915,000",   "Full IP registered before any government engagement"],
          ["Company registration + CA fees (12 months)",             "\u20B91,30,000", "Legal entity established for government contracting"],
          ["iDEX application preparation + legal review",            "\u20B950,000",   "Professional submission to DISC 14 / ADITI"],
          ["Production prototype hardware (2 full turrets)",         "\u20B91,50,000", "Demo-ready units for government evaluation"],
          ["DefExpo / Aero India booth (if applicable)",             "\u20B92,00,000", "Direct access to procurement officers"],
          ["Operating capital (12 months)",                          "\u20B95,00,000", "Salaries, travel, office, communications"],
          ["TOTAL SEED ASK",                                         "\u20B913,33,000  (~\u20B913.5 lakh)", ""],
        ],
        [3800, 2400, 3160]
      ),
      spacer(1),
      callout("NOTE FOR INVESTORS", "This seed ask is exceptionally small relative to the market opportunity — specifically because iDEX provides up to \u20B910 crore in non-dilutive grant funding to qualified startups. The seed investment is designed to reach the iDEX application threshold, after which government grants fund the majority of development cost. Investor equity is preserved; risk is minimised by the grant backstop.", C.green, C.lightGreen),
      spacer(1),

      h2("13.2 What We Offer Investors"),
      makeTable(
        ["Term", "Details"],
        [
          ["Instrument",        "Equity (SAFE note or priced round — negotiable)"],
          ["Valuation basis",   "Pre-revenue deep tech — to be discussed based on IP value and market opportunity"],
          ["Board seat",        "Available for lead investor above \u20B950 lakh commitment"],
          ["Information rights","Monthly reporting, quarterly board updates, annual audit"],
          ["Exit pathways",     "Strategic acquisition (BEL, HAL, Tata Defence, L&T); independent IPO; secondary sale"],
          ["Comparable exits",  "Zen Technologies (listed, ~12x revenue multiple); ideaForge (listed, \u20B91,200+ crore market cap)"],
        ],
        [2800, 6560]
      ),
      spacer(2),

      // ══════════════════════════════════════════════
      // CLOSING
      // ══════════════════════════════════════════════
      pageBreak(),
      sectionBanner("CLOSING STATEMENT"),
      spacer(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before:200, after:200 },
        children: [new TextRun({ text:"The Opportunity in One Paragraph", font:"Arial", size:30, bold:true, color:C.navy })]
      }),
      spacer(1),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before:100, after:100 },
        children: [new TextRun({
          text:"India spends \u20B94 crore to shoot down a \u20B950,000 drone with a missile. It spends \u20B950,000 with a micro-missile. It spends nothing — because it has no solution — in every prison, airport, and power plant where RF jammers are prohibited and kinetic systems are illegal. Infinity OS spends \u20B93 of electricity, captures the drone intact, preserves the evidence, and identifies the operator. This is not a marginal improvement. It is a fundamentally different class of solution — the only one of its kind in India, protected by Indian IP, eligible for the highest procurement priority under DAP 2026, and positioned to generate \u20B9300+ crore in revenue over five years before a single export contract is signed.",
          font:"Arial", size:22, color:C.dark, italics:true
        })]
      }),
      spacer(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"Contact", font:"Arial", size:24, bold:true, color:C.navy })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"Aakash Priyadarshi — Founder & CEO, Octaryn Systems", font:"Arial", size:22, color:C.accent })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text:"Infinity OS \u2014 TALON Counter-UAS Platform", font:"Arial", size:20, color:C.dark, italics:true })]
      }),
      spacer(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top:{ style:BorderStyle.SINGLE, size:4, color:C.accent, space:8 } },
        children: [new TextRun({ text:"CONFIDENTIAL \u2014 This document contains proprietary business information. Do not distribute without authorisation from Octaryn Systems.",
          font:"Arial", size:16, color:C.red, italics:true })]
      }),
    ]
  }]
});

const outPath = path.join(__dirname, '..', 'Octaryn_Systems_Infinity_OS_Business_Strategy_2026.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log('Document written to: ' + outPath);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
