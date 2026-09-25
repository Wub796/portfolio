/* ============================================================
   BENJAMIN WU SYSTEM — shared UI for every page.
   One page per planet. Clicking any [data-warp] link records
   the current planet in sessionStorage, then hands the browser
   a cross-document View Transition (CSS @view-transition) so
   the old page morphs into the new one with no flash; older
   browsers get a themed warp overlay instead. The new page's
   3D scene then flies the camera from the previous planet.
   ============================================================ */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var currentPlanet = document.body.dataset.planet || "sol";

  function accentCSS() {
    /* read from a body descendant so the body[data-planet] override wins */
    var el = document.getElementById("cursorDot") || document.body;
    return (getComputedStyle(el).getPropertyValue("--accent") || "").trim() || "#a26833";
  }
  function hexRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var accentHex = accentCSS();
  var accentRgb = hexRgb(accentHex);
  /* an SPA swap changes body[data-planet] — re-read the tint the canvases use */
  function refreshAccent() {
    accentHex = accentCSS();
    accentRgb = hexRgb(accentHex);
  }

  /* ------------------------------------------------------------
     FLUID BACKGROUND — Disabled so 3D solar system is clean & clear
     ------------------------------------------------------------ */
  var fluidLayer = document.getElementById("fluidLayer");
  if (fluidLayer) fluidLayer.style.display = "none";

  /* ------------------------------------------------------------
     DEADLINES — Updated Program List & Timelines
     aerospace camps, research programs, and selective STEM competitions
     Sources: EMERGE Target College Database + uploaded program spreadsheet.
     ------------------------------------------------------------ */
  var DEADLINES = [
    {
      org: "U.S. House of Representatives",
      name: "Congressional App Challenge",
      type: "Competition",
      status: "countdown",
      primary: "2026-10-26T12:00:00-04:00",
      events: [
        ["Registration Window", "Opens annually in May"],
        ["Submission Deadline", "October 26, 2026 at 12:00 PM ET"],
        ["Judging & Announcements", "November – December"],
      ],
      note: "GridEvac AI entered — demo video + codebase submitted.",
    },
    {
      org: "NASA · Hack Club · AMD · GitHub",
      name: "Stardance Challenge",
      type: "Engineering Competition",
      status: "countdown",
      primary: "2026-09-30T23:59:00-05:00",
      events: [
        ["Challenge Window", "June 1 – September 30, 2026"],
        ["Submission Deadline", "September 30, 2026"],
        ["Rewards", "Log build hours → space tokens for Raspberry Pi, Flipper Zero, 3D printers"],
      ],
      note: "Build with real NASA mission data — log ARES-1, Flight Logger, reaction wheel & rover hours for hardware.",
    },
    {
      org: "U.S. Naval Sea Cadet Corps",
      name: "Sea Cadet National Council",
      type: "Leadership Selection",
      status: "open",
      events: [
        ["Applications Open", "September 24, 2026"],
        ["Selection", "Elite national leadership tier for advanced cadets"],
        ["Serving Year", "Council term with national program representation"],
      ],
      note: "Applications opened Sep 24, 2026 — the national leadership tier above squadron billets. Pairs with PO1 coursework and Sea Cadet squad-leader experience.",
    },
    {
      org: "Houston Volleyball Academy",
      name: "HVA Elite Academy 2026–27",
      type: "Athletics · Invitation",
      status: "open",
      events: [
        ["Invitation Received", "September 24, 2026 — time-sensitive"],
        ["Group Cap", "16 athletes per training group"],
        ["Season", "2026–27 club year"],
      ],
      note: "Invitation to apply for the selective HVA Elite Academy, on top of the 16 White-Yari national club season.",
    },
    {
      org: "NASA",
      name: "NASA HUNCH (Software · Hardware · Data Science)",
      type: "Engineering Competition",
      status: "open",
      events: [
        ["Registration / Kickoff", "August – September"],
        ["Preliminary Design Reviews (PDR)", "October – November"],
        ["Critical Design Reviews (CDR)", "February – March"],
        ["Final Review / National Showcase", "April"],
      ],
      note: "Software, Hardware & Machine Learning / Data Science tracks (NASA Human Research Program) — pairs with flight logger and payload prototyping.",
    },
    {
      org: "CEE · MIT",
      name: "Research Science Institute (RSI - CEE / MIT)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [
        ["Applications Open", "September / October"],
        ["Application Deadline", "Mid-January"],
        ["Program Dates", "Late June – early August (6-week summer program)"],
      ],
      note: "6-week MIT summer research program — apply winter of junior year.",
    },
    {
      org: "Yale University",
      name: "Yale Young Global Scholars (YYGS)",
      type: "Summer Program",
      status: "countdown",
      primary: "2026-11-15T23:59:00-05:00",
      events: [
        ["Applications Open", "September"],
        ["Early Action Deadline", "Mid-November"],
        ["Regular Decision Deadline", "Early January"],
        ["Session Dates", "Three 2-week residential sessions across June and July"],
      ],
      note: "Applied Science & Engineering track.",
    },
    {
      org: "Houston Science Fairs",
      name: "Science and Engineering Fair of Houston (SEFH)",
      type: "Competition",
      status: "countdown",
      primary: "2027-01-25T23:59:00-06:00",
      events: [
        ["Project Registration Deadline", "Late January / Early February"],
        ["Fair Competition Dates", "Mid-to-late February"],
        ["ISEF Advancement Announcement", "March"],
      ],
      note: "SEFH → Texas State Science Fair → Regeneron ISEF pipeline.",
    },
    {
      org: "MIT Lincoln Laboratory",
      name: "MIT Beaver Works Summer Institute (BWSI)",
      type: "Summer Program",
      status: "countdown",
      primary: "2027-04-15T23:59:00-04:00",
      events: [
        ["Self-Registration & Prerequisite Access", "Late January / Early February"],
        ["Summer Application Deadline", "Mid-April"],
        ["Program Dates", "July (4-week summer program)"],
      ],
      note: "Target: Autonomous Air Vehicle Racing / Unmanned Air Systems.",
    },
    {
      org: "UT Austin · NASA",
      name: "UT Austin STEM Enhancement in Earth Science (SEES)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-22T23:59:00-06:00",
      events: [
        ["Applications Open", "December / January"],
        ["Application Deadline", "February 22, 2027 (Annual)"],
        ["Distance Learning Modules", "May 15 – July 1"],
        ["On-Site Residency / Virtual Symposium", "July 5 – July 21"],
      ],
      note: "NASA / CSR research internship working directly with earth & planetary scientists.",
    },
    {
      org: "Lumos",
      name: "Lumos Fellows",
      type: "Fellowship",
      status: "rolling",
      events: [
        ["Application Window", "Rolling admissions across seasonal cohorts"],
        ["Program Duration", "6-week cohort-based accelerator"],
      ],
      note: "Startup & deep tech fellowship accelerator.",
    },
    {
      org: "Boston University",
      name: "Boston University RISE (Research in Science & Engineering)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-04T23:59:00-05:00",
      events: [
        ["Application Window", "Opens December 15"],
        ["Student Application Deadline", "February 4, 2027 at 11:59 PM EST"],
        ["Recommendation Letters Deadline", "February 11, 2027 at 11:59 PM EST"],
        ["Admissions Decisions", "6–8 weeks post-deadline (Late March / Early April)"],
        ["Program Dates", "June 28 – August 7, 2027 (6-week residential/commuter research program)"],
      ],
      note: "6-week university laboratory research under faculty mentorship.",
    },
    {
      org: "UIUC Grainger Engineering",
      name: "UIUC WYSE – Illinois Aerospace Institute (IAI) Camp",
      type: "Aerospace Camp",
      status: "countdown",
      primary: "2027-03-25T23:59:00-05:00",
      events: [
        ["Application Window", "Opens early February"],
        ["Priority Deadline", "Late March"],
        ["Decision Notifications", "Late April – early May"],
        ["Session 1 Dates", "July 12 – July 18, 2027"],
        ["Session 2 Dates", "July 26 – August 1, 2027"],
      ],
      note: "Aerodynamics, flight mechanics, propulsion & wind tunnel testing at UIUC.",
    },
    {
      org: "Texas A&M Aerospace Engineering",
      name: "Camp SOAR (Summer Opportunities in Aerospace Research)",
      type: "Aerospace Camp",
      status: "countdown",
      primary: "2027-01-01T00:00:00-06:00",
      primaryKind: "opens",
      events: [
        ["Applications Open", "January 1, 2027 (both sessions)"],
        ["Application Deadline", "Not yet posted — watch the program page"],
        ["Session A", "June 13 – 18, 2027"],
        ["Session B", "July 11 – 16, 2027"],
        ["Eligibility", "High school juniors or seniors as of Fall 2026 · any state"],
        ["Cost", "$35 nonrefundable application fee · camp fee covers room, board & activities · need-based scholarships"],
      ],
      note: "6-day residential camp at Texas A&M, College Station — aircraft, rotorcraft, space mission design & space robotics tracks, professor lectures, hypersonic wind tunnel and Vehicle Systems & Control Lab tours.",
      link: "https://engineering.tamu.edu/aerospace/prospective-students/undergraduate/camp-soar.html",
    },
    {
      org: "AIA · NAR",
      name: "American Rocketry Challenge (ARC)",
      type: "Rocketry Competition",
      status: "countdown",
      primary: "2026-12-31T23:59:00-05:00",
      events: [
        ["Registration Window", "September – December"],
        ["Qualifying Flights Due", "April"],
        ["National Finals", "May"],
      ],
      note: "2026 target: 750 ft altitude, 36–39s flight, single egg payload (formerly TARC) — registration Sep–Dec, flights due Apr, finals May.",
    },
    {
      org: "Caltech · NASA JPL",
      name: "Caltech Summer Secondary Student Science Program",
      type: "Aerospace Research",
      status: "countdown",
      primary: "2027-02-15T23:59:00-08:00",
      events: [
        ["Application Deadline", "February"],
        ["Program Dates", "Summer (6–8 weeks)"],
      ],
      note: "Space science and planetary engineering research with Caltech/JPL faculty.",
    },
    {
      org: "NASA Johnson Space Center",
      name: "NASA High School Aerospace Scholars (HAS) / TAS Launch Pad",
      type: "Aerospace Program",
      status: "countdown",
      primary: "2026-10-20T23:59:00-05:00",
      events: [
        ["Registration Window", "July 1 – October 20"],
        ["Online Coursework", "Junior Year"],
        ["JSC On-Site Residency", "June – July"],
      ],
      note: "TAS Launch Pad 2026–27 secured — offer accepted Sep 10, 2026 for the year-long online academy and Johnson Space Center residency. This countdown tracks the next application window.",
    },
    {
      org: "Columbia University",
      name: "Columbia University Pre-College Program (Engineering & Applied Science)",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-01T23:59:00-04:00",
      events: [
        ["Application Deadlines", "February – April"],
        ["Course Sessions", "June – August"],
      ],
      note: "Intensive coursework in aerospace systems, mechanical engineering, and CS.",
    },
    {
      org: "Harvard University",
      name: "Harvard Secondary School Program (SSP)",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-15T23:59:00-04:00",
      events: [
        ["Application Deadlines", "April"],
        ["Course Sessions", "June – August"],
      ],
      note: "College-credit undergraduate coursework in physics, computing, and aerospace mechanics.",
    },
    {
      org: "UPenn Engineering · Wharton",
      name: "UPenn Management & Technology Summer Institute (M&TSI)",
      type: "Summer Institute",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Deadline", "February 1"],
        ["Program Dates", "July (3 weeks)"],
      ],
      note: "Engineering prototyping and technological management with Penn Engineering and Wharton.",
    },
    {
      org: "Conrad Foundation · Space Center Houston",
      name: "The Conrad Challenge",
      type: "Innovation Competition",
      status: "countdown",
      primary: "2026-10-29T23:59:00-05:00",
      events: [
        ["Phase 1 Submission", "October 29, 2026 — investor pitch + technical design"],
        ["Phase 2 Submission", "January 7, 2027"],
        ["Innovation Summit", "Live finals at Space Center Houston"],
      ],
      note: "The Schollective team is entering — a student-faculty research mentorship platform pitched on the social innovation track.",
    },
    {
      org: "Texas College Access Network (TxCAN)",
      name: "TxCAN Pitch Competition",
      type: "Pitch Competition",
      status: "countdown",
      primary: "2027-01-08T23:59:00-06:00",
      events: [
        ["Interest Form", "Due October 15, 2026"],
        ["Application Deadline", "January 8, 2027"],
        ["Award", "$5,000 equity-free grant for Texas student access pathways"],
      ],
      note: "Funds student-built tools that widen Texas college access and transition pathways — a direct fit for Schollective's mentor matching.",
    },
    {
      org: "University of Delaware · Horn Entrepreneurship",
      name: "Diamond Challenge",
      type: "Entrepreneurship Competition",
      status: "countdown",
      primary: "2027-01-14T23:59:00-05:00",
      events: [
        ["Opens", "September 16, 2026"],
        ["Submission Deadline", "January 14, 2027"],
        ["Prize Pool", "$12,000 first prize from a $100,000 pool · three pitch rounds → Delaware summit"],
      ],
      note: "Social innovation track: pitch the venture in three elimination rounds over the winter and spring.",
      link: "https://diamondchallenge.org/",
    },
    {
      org: "SXSW EDU",
      name: "Student Impact Challenge",
      type: "Pitch Competition",
      status: "countdown",
      primary: "2027-02-02T23:59:00-06:00",
      events: [
        ["Submission Deadline", "February 2, 2027"],
        ["Live Pitch Showcase", "SXSW EDU, Austin, TX"],
        ["Focus", "Education-focused student ventures"],
      ],
      note: "Austin stage for education startups — the natural showcase for a mentor-matching platform.",
    },
    {
      org: "Blue Ocean Competition",
      name: "Blue Ocean Student Entrepreneur Competition",
      type: "Entrepreneurship Competition",
      status: "countdown",
      primary: "2027-02-21T23:59:00-05:00",
      events: [
        ["Submission Deadline", "February 21, 2027"],
        ["Format", "Virtual, four elimination rounds"],
        ["Deliverable", "Strategy canvas + pitch on an uncontested market"],
      ],
      note: "Built for the ERRC-grid value-curve framing already used in the Schollective and pitch-deck work.",
    },
    {
      org: "The Paradigm Challenge",
      name: "The Paradigm Challenge",
      type: "Innovation Competition",
      status: "countdown",
      primary: "2027-05-01T23:59:00-05:00",
      events: [
        ["Submission Deadline", "May 1, 2027"],
        ["Category", "Education / Community Impact"],
        ["Award", "Up to $100,000 in prizes"],
      ],
      note: "Global youth challenge; the education and community-impact category matches the mentorship platform.",
    },
    {
      org: "UC California campuses",
      name: "COSMOS (California State Summer School for Mathematics & Science)",
      type: "STEM Summer Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-08:00",
      events: [["Application Window", "January – February"], ["Application Deadline", "February 1, 2027 — confirm campus date"], ["Program Dates", "Four weeks in July"]],
      note: "Project-based STEM clusters in engineering, computer science, and applied science; California residency is generally required.",
      link: "https://cosmos.ucop.edu/",
    },
    {
      org: "SPARC",
      name: "SPARC Summer Program",
      type: "Math · CS · Decision Theory",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [["Application Window", "December – February"], ["Application Deadline", "February 1, 2027 — verify cycle"], ["Program Dates", "Five weeks in July – August"]],
      note: "Free, highly selective program in rationality, decision theory, mathematics, and computer-science-adjacent problem solving.",
      link: "https://sparc.camp/",
    },
    {
      org: "University of Iowa",
      name: "Iowa SSTP",
      type: "STEM Research Program",
      status: "countdown",
      primary: "2027-02-15T23:59:00-06:00",
      events: [["Application Window", "December – mid-February"], ["Application Deadline", "February 15, 2027 — verify annual date"], ["Program Dates", "Five to six weeks, June – July"]],
      note: "Faculty-mentored research across science and engineering; need-based aid is available.",
      link: "https://belinblank.education.uiowa.edu/programs/sstp",
    },
    {
      org: "Texas Tech University",
      name: "Clark Scholars Program",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-15T23:59:00-06:00",
      events: [["Application Window", "January – mid-February"], ["Application Deadline", "February 15, 2027 — verify annual date"], ["Program Dates", "Seven weeks, June – August"], ["Award", "$750 stipend + housing and meals"]],
      note: "Extremely selective, fully funded one-on-one research across STEM and other disciplines; only about a dozen scholars are selected.",
      link: "https://www.depts.ttu.edu/honors/academicsandenrichment/affiliatedandadditionalprograms/clarks/",
    },
    {
      org: "MIT",
      name: "MITES Summer",
      type: "STEM · Engineering Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [["Application Window", "November – February"], ["Application Deadline", "February 1, 2027 — verify cycle"], ["Program Dates", "Six weeks, late June – early August"]],
      note: "Free residential STEM program with rigorous coursework and engineering exposure; eligibility prioritizes students from historically underrepresented backgrounds.",
      link: "https://mites.mit.edu/",
    },
    {
      org: "Stanford University",
      name: "Stanford SHTEM",
      type: "CS · Interdisciplinary Research",
      status: "countdown",
      primary: "2027-02-15T23:59:00-08:00",
      events: [["Application Window", "December – February"], ["Application Deadline", "Mid-February 2027 — verify annual date"], ["Program Dates", "Eight weeks, June – August"]],
      note: "Free virtual research experience spanning computer science, linguistics, neuroscience, and design; open internationally.",
      link: "https://shtem.stanford.edu/",
    },
    {
      org: "Stony Brook University",
      name: "Garcia Summer Research Program",
      type: "Materials · Engineering Research",
      status: "countdown",
      primary: "2027-02-28T23:59:00-05:00",
      events: [["Application Window", "Mid-January – late February"], ["Application Deadline", "Late February 2027 — verify annual date"], ["Program Dates", "Seven weeks, June – August"]],
      note: "Materials and polymer research with a strong record of science-fair and research outcomes.",
      link: "https://www.stonybrook.edu/commcms/garcia/",
    },
    {
      org: "Michigan State University",
      name: "High School Honors Science/Engineering Program (HSHSP)",
      type: "STEM Research Program",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Application Window", "December – March 1"], ["Application Deadline", "March 1, 2027"], ["Program Dates", "Seven weeks, June – August"]],
      note: "Long-running faculty research program for rising seniors across STEM fields.",
      link: "https://hshsp.msu.edu/",
    },
    {
      org: "Boston University",
      name: "PROMYS",
      type: "Mathematics Program",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Application Window", "Early January – early March"], ["Application Deadline", "Early March 2027 — verify annual date"], ["Program Dates", "Six weeks, June – August"]],
      note: "Proof-based number theory program for students with strong mathematical problem-solving; need-based full scholarships are available.",
      link: "https://promys.org/",
    },
    {
      org: "MIT Lincoln Laboratory",
      name: "LLRISE",
      type: "Radar · Electrical Engineering",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Application Window", "Early January – early March"], ["Application Deadline", "Early March 2027 — verify annual date"], ["Program Dates", "Two weeks in July"]],
      note: "Free, residential MIT Lincoln Laboratory program where students build Doppler and range-radar systems.",
      link: "https://www.ll.mit.edu/outreach/llrise",
    },
    {
      org: "NASA Ames Research Center",
      name: "NASA GeneLab for High School (GL4HS)",
      type: "Computational Biology · Space Science",
      status: "countdown",
      primary: "2027-03-15T23:59:00-05:00",
      events: [["Application Window", "January – mid-March"], ["Application Deadline", "Mid-March 2027 — verify annual date"], ["Program Dates", "Four weeks in July"], ["Award", "Research stipend upon completion"]],
      note: "Virtual computational research using spaceflight genomics and open NASA data.",
      link: "https://www.nasa.gov/gl4hs/",
    },
    {
      org: "Ross Mathematics Program",
      name: "Ross Mathematics Program",
      type: "Mathematics Program",
      status: "countdown",
      primary: "2027-03-15T23:59:00-04:00",
      events: [["Application Window", "Early January – March"], ["Application Deadline", "March 15, 2027 — verify annual date"], ["Program Dates", "Six weeks, June – July"]],
      note: "Internationally open, proof-oriented number theory program emphasizing deep problem solving.",
      link: "https://rossprogram.org/",
    },
    {
      org: "Princeton University",
      name: "Laboratory Learning Program",
      type: "Engineering · Natural Sciences Research",
      status: "countdown",
      primary: "2027-03-15T23:59:00-04:00",
      events: [["Application Window", "Mid-January – March"], ["Application Deadline", "March 15, 2027 — verify annual date"], ["Program Dates", "Five to six weeks in summer"]],
      note: "Free, commuter-only faculty research placement in engineering and natural sciences.",
      link: "https://education.princeton.edu/programs/laboratory-learning-program/",
    },
    {
      org: "Amazon",
      name: "Amazon Future Engineer",
      type: "Computer Science · Business Internship",
      status: "countdown",
      primary: "2026-12-15T23:59:00-05:00",
      events: [["Application Window", "October – December"], ["Application Deadline", "December 15, 2026 — verify eligibility and cycle"], ["Program Dates", "12 weeks, May – August"], ["Award", "Paid internship + potential $40,000 scholarship"]],
      note: "High-value CS pathway for graduating seniors with substantial programming experience and plans to study computer science.",
      link: "https://www.amazonfutureengineer.com/",
    },
    {
      org: "Northrop Grumman",
      name: "Northrop Grumman High School Program",
      type: "Avionics · Systems Software",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [["Application Window", "October – January"], ["Application Deadline", "January 15, 2027 — verify site-specific date"], ["Program Dates", "Ten weeks, June – August"]],
      note: "Paid exposure to telemetry, structural testing, avionics, and mission-control systems for eligible students near operating sites.",
      link: "https://www.northropgrumman.com/careers/students-and-early-careers/",
    },
    {
      org: "Microsoft",
      name: "Microsoft Discovery Program",
      type: "Software Engineering",
      status: "countdown",
      primary: "2027-03-15T23:59:00-04:00",
      events: [["Application Window", "February – March"], ["Application Deadline", "March 15, 2027 — verify annual date"], ["Program Dates", "Four weeks in July"]],
      note: "Paid software-engineering exposure for graduating seniors near participating hubs; emphasize algorithmic projects and CS coursework.",
      link: "https://careers.microsoft.com/",
    },
    {
      org: "Lockheed Martin",
      name: "Lockheed Martin Space Internship",
      type: "Aerospace · Defense Systems",
      status: "countdown",
      primary: "2026-11-20T23:59:00-05:00",
      events: [["Application Window", "September – November"], ["Application Deadline", "November 20, 2026 — verify site-specific date"], ["Program Dates", "Nine weeks, June – August"]],
      note: "Paid aerospace and defense-systems experience; highlight mechanics, C++, CAD, and flight or spacecraft projects.",
      link: "https://www.lockheedmartin.com/en-us/careers/students.html",
    },
    {
      org: "Federal Reserve Banks",
      name: "Federal Reserve Bank Student Program",
      type: "Economics · Banking · Analytics",
      status: "countdown",
      primary: "2027-03-05T23:59:00-05:00",
      events: [["Application Window", "January – March"], ["Application Deadline", "March 5, 2027 — district-specific"], ["Program Dates", "Eight weeks in summer"]],
      note: "Paid economics, banking, and analytics experience; a strong business pathway when paired with data analysis and writing.",
      link: "https://www.federalreserve.gov/careers-student-opportunities.htm",
    },
    {
      org: "Boeing",
      name: "Boeing High School Internship",
      type: "Aerospace · Manufacturing · Systems",
      status: "countdown",
      primary: "2027-02-15T23:59:00-06:00",
      events: [["Application Window", "December – February"], ["Application Deadline", "February 15, 2027 — verify partner-school requirements"], ["Program Dates", "Seven weeks, June – August"]],
      note: "Paid manufacturing and systems exposure with strong relevance to robotics, CAD, aerospace, and production engineering.",
      link: "https://jobs.boeing.com/internships",
    },
    {
      org: "Sandia National Laboratories",
      name: "Sandia Student Internship Program",
      type: "National Lab · Computing · Engineering",
      status: "countdown",
      primary: "2027-04-01T23:59:00-06:00",
      events: [["Application Window", "January – April"], ["Application Deadline", "April 1, 2027 — verify laboratory posting"], ["Program Dates", "Ten weeks, June – August"]],
      note: "Paid national-lab work in computing, data structures, advanced math, and engineering; U.S. citizenship and clearance eligibility apply.",
      link: "https://www.sandia.gov/careers/students-and-recent-graduates/",
    },
    {
      org: "NASA",
      name: "NASA OSTEM High School Internships",
      type: "Aerospace · Computing Internship",
      status: "countdown",
      primary: "2027-02-26T23:59:00-05:00",
      events: [["Application Window", "September – late February"], ["Application Deadline", "February 26, 2027 — verify NASA posting"], ["Program Dates", "Ten weeks, June – August"], ["Award", "Paid stipend"]],
      note: "Prioritize Houston/JSC placements and emphasize applied physics, C++, kinematics, software, or systems projects.",
      link: "https://intern.nasa.gov/",
    },
    {
      org: "JPMorgan Chase",
      name: "High School Apprenticeship",
      type: "Business · Finance · Technology",
      status: "countdown",
      primary: "2027-04-16T23:59:00-04:00",
      events: [["Application Window", "February – April"], ["Application Deadline", "April 16, 2027 — participating hubs only"], ["Program Dates", "Eight weeks, June – August"]],
      note: "Paid corporate banking, finance, and technology apprenticeship; strong fit for business plus enterprise software interests.",
      link: "https://www.jpmorganchase.com/impact/people/youth-programs",
    },
    {
      org: "RTX · Raytheon",
      name: "RTX High School Internship",
      type: "Embedded Software · Hardware",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Application Window", "December – March"], ["Application Deadline", "March 1, 2027 — verify site-specific date"], ["Program Dates", "Nine weeks in summer"]],
      note: "Paid defense-electronics experience; highlight embedded C++, microcontrollers, electrical systems, and physics labs.",
      link: "https://careers.rtx.com/students/",
    },
    {
      org: "PNNL",
      name: "PNNL High School Intern Program",
      type: "Applied Computing · Energy",
      status: "countdown",
      primary: "2027-03-20T23:59:00-07:00",
      events: [["Application Window", "February – March"], ["Application Deadline", "March 20, 2027 — verify posting"], ["Program Dates", "Ten weeks in summer"]],
      note: "Paid national-lab experience in grid computing, data, energy systems, and applied engineering.",
      link: "https://www.pnnl.gov/internships",
    },
    {
      org: "The Aerospace Corporation",
      name: "Aerospace Corporation High School Program",
      type: "Space Systems · Mission Architecture",
      status: "countdown",
      primary: "2027-03-15T23:59:00-07:00",
      events: [["Application Window", "January – March"], ["Application Deadline", "March 15, 2027 — verify location requirements"], ["Program Dates", "Eight to ten weeks in summer"]],
      note: "Federally funded space-systems research and orbital mission architecture; excellent fit for aerospace, math, and systems engineering.",
      link: "https://www.aerospace.org/careers/students",
    },
    {
      org: "Prudential",
      name: "Prudential Emerging Visionaries",
      type: "Entrepreneurship · Social Innovation",
      status: "countdown",
      primary: "2026-11-02T23:59:00-05:00",
      events: [["Application Window", "September – November"], ["Application Deadline", "November 2, 2026 — verify cycle"], ["Award", "Up to $15,000 + summit"]],
      note: "Pitch a real community or financial innovation project; strong fit for an AI, civic-tech, or aerospace-adjacent venture with measurable impact.",
      link: "https://www.prudential.com/links/about/emerging-visionaries",
    },
    {
      org: "Hack Club",
      name: "DreamVenture",
      type: "Entrepreneurship · Startup Hackathon",
      status: "countdown",
      primary: "2027-05-10T23:59:00-04:00",
      events: [["Application Window", "Spring"], ["Registration Deadline", "May 10, 2027 — verify event cycle"], ["Event", "Entrepreneurship and startup pitch hackathon"]],
      note: "Build and pitch a product with other student founders; useful for turning GridEvac, Flight Logger, or an AI tool into a venture narrative.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · Shanghai",
      name: "MoonStone",
      type: "International Hackathon",
      status: "countdown",
      primary: "2027-09-25T23:59:00-04:00",
      events: [["Event", "International high-school hackathon in Shanghai"], ["Registration Deadline", "September 25, 2027 — next-cycle date to verify"], ["Format", "Cross-border software project building"]],
      note: "Out-of-country computing and collaboration opportunity; confirm visa, travel, and next-cycle dates before planning.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · Germany",
      name: "Horizons Europa",
      type: "International Hackathon",
      status: "countdown",
      primary: "2027-07-05T23:59:00-04:00",
      events: [["Event", "Youth hackathon in Berlin"], ["Registration Deadline", "Early July — next-cycle date to verify"], ["Format", "In-person European builder event"]],
      note: "International software, hardware, and peer-networking opportunity in Germany.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · Singapore",
      name: "Horizons Arcana",
      type: "International Hackathon",
      status: "countdown",
      primary: "2027-07-10T23:59:00-04:00",
      events: [["Event", "Youth hackathon in Singapore"], ["Registration Deadline", "Early July — next-cycle date to verify"], ["Format", "In-person Southeast Asian builder event"]],
      note: "Out-of-country AI, software, and product-building experience with a regional student developer community.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · Canada",
      name: "ONHacks",
      type: "International Hackathon",
      status: "countdown",
      primary: "2026-11-15T23:59:00-05:00",
      events: [["Event", "Ontario youth hackathon"], ["Registration Deadline", "November 15, 2026"], ["Format", "In-person Canadian coding event"]],
      note: "International student developer network and rapid software project building in Toronto-area Ontario.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · India",
      name: "SteelByte '26",
      type: "International Hackathon",
      status: "countdown",
      primary: "2026-11-01T23:59:00-05:00",
      events: [["Event", "India-focused youth technical hackathon"], ["Registration Deadline", "November 1, 2026"], ["Format", "Software and hardware building"]],
      note: "International coding and engineering collaboration opportunity hosted for the Indian student developer community.",
      link: "https://hackclub.com/",
    },
    {
      org: "Hack Club · Indonesia",
      name: "Garuda Hacks",
      type: "International Hackathon",
      status: "countdown",
      primary: "2027-06-30T23:59:00-04:00",
      events: [["Event", "Major student hackathon in Indonesia"], ["Registration Deadline", "Late June — next-cycle date to verify"], ["Format", "In-person APAC builder event"]],
      note: "Large Southeast Asian student innovation event with strong software, AI, and entrepreneurship overlap.",
      link: "https://garudahacks.or.id/",
    },
    {
      org: "Global student developer community",
      name: "MLH Season Hackathons",
      type: "International Hackathon Series",
      status: "rolling",
      events: [["Application Window", "Year-round rolling events"], ["Format", "Hybrid, in-person, and virtual global weekends"], ["Focus", "Software, AI, hardware, APIs, and entrepreneurship"]],
      note: "Use the MLH calendar to select events compatible with age, travel, and school schedule; build a public portfolio across multiple teams.",
      link: "https://mlh.io/seasons/2026/events",
    },
    {
      org: "Smart India Hackathon",
      name: "Smart India Hackathon (SIH)",
      type: "International Innovation Competition",
      status: "rolling",
      events: [["Application Window", "Typically September – December"], ["Format", "India-wide innovation hackathon"], ["Focus", "Government, business, and technical problem statements"]],
      note: "Major international innovation competition; confirm whether the current cycle accepts international high-school participants and team formats.",
      link: "https://www.sih.gov.in/",
    },
    {
      org: "Hack In The North · IIT Allahabad",
      name: "Hack In The North",
      type: "International Hackathon",
      status: "rolling",
      events: [["Application Window", "Typically February – March"], ["Event", "Spring in India"], ["Format", "In-person collegiate hackathon; verify high-school eligibility"]],
      note: "High-bar Indian Institute of Technology hackathon; pursue only after confirming eligibility, travel, and team rules.",
      link: "https://hackinthenorth.com/",
    },
    {
      org: "Carnegie Mellon University",
      name: "CMIMC (Computer Science & Mathematics Competition)",
      type: "Computer Science Competition",
      status: "countdown",
      primary: "2027-02-10T23:59:00-05:00",
      events: [["Registration Window", "December – February"], ["Registration Deadline", "February 10, 2027 — verify contest date"], ["Contest", "Late March at CMU or online"]],
      note: "CMU student-run contest with algorithmic programming and mathematics divisions.",
      link: "https://cmu-mimc.github.io/",
    },
    {
      org: "Carnegie Mellon University",
      name: "PicoCTF",
      type: "Cybersecurity Competition",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Competition", "March 2027"], ["Registration Deadline", "March 1, 2027 — verify cycle"], ["Format", "Online capture-the-flag challenges"]],
      note: "Accessible entry point to ethical hacking, Linux, networking, and secure software; created by CMU cybersecurity experts.",
      link: "https://picoctf.org/",
    },
    {
      org: "UC Berkeley",
      name: "CALICO Computer Science Competition",
      type: "Algorithmic Programming Competition",
      status: "countdown",
      primary: "2027-03-10T23:59:00-05:00",
      events: [["Competition", "March 2027"], ["Registration Deadline", "March 10, 2027 — verify cycle"], ["Format", "Online global mirror + Berkeley event"]],
      note: "Algorithmic puzzle and programming contest with novice and advanced divisions.",
      link: "https://calico.cs.berkeley.edu/",
    },
    {
      org: "Hewlett Packard Enterprise",
      name: "HP CodeWars",
      type: "Programming Competition",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [["Competition", "March 2027"], ["Registration Deadline", "March 1, 2027 — Houston site or virtual mirror"], ["Format", "Three-hour Java, C++, or Python contest"]],
      note: "Strong Houston-area coding competition with direct relevance to algorithmic thinking and software engineering.",
      link: "https://www.hpe.com/us/en/about/hpe-codewars.html",
    },
    {
      org: "USA Computing Olympiad",
      name: "USACO",
      type: "Algorithmic Programming Competition",
      status: "rolling",
      events: [["Contest Windows", "December – March, including the US Open"], ["Registration", "Rolling before each contest window"], ["Format", "Bronze through Platinum online divisions"]],
      note: "Premier U.S. high-school algorithmic programming pathway; build a C++/Python training plan around the seasonal contests.",
      link: "https://usaco.org/",
    },
    {
      org: "Stanford University",
      name: "TreeHacks",
      type: "Hackathon · Entrepreneurship",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [["Application Window", "Fall – January"], ["Application Deadline", "January 15, 2027 — verify high-school track"], ["Event", "February at Stanford + virtual tracks"]],
      note: "Highly selective Stanford hackathon; ideal for a polished AI, civic-tech, or aerospace software prototype and founder narrative.",
      link: "https://treehacks.com/",
    },
    {
      org: "Harvard · MIT students",
      name: "HMMT (Harvard-MIT Mathematics Tournament)",
      type: "Mathematics · Algorithms Competition",
      status: "countdown",
      primary: "2026-11-30T23:59:00-05:00",
      events: [["November Contest", "November 2026"], ["Registration Deadline", "November 30, 2026 — February contest has a separate window"], ["Format", "Individual, team, and guts rounds"]],
      note: "Elite math competition with combinatorics and algorithmic crossover useful for CS and engineering preparation.",
      link: "https://www.hmmt.org/",
    },
    {
      org: "Princeton University",
      name: "PUMaC (Princeton University Mathematics Competition)",
      type: "Mathematics Competition",
      status: "countdown",
      primary: "2026-10-07T23:59:00-04:00",
      events: [["Application Window", "September – October"], ["Registration Deadline", "October 7, 2026"], ["Format", "Subject tests, team rounds, and Power Round"]],
      note: "Strong mathematical problem-solving signal for future engineering and computer-science applications; online satellite option may be available.",
      link: "https://pumac.princeton.edu/",
    },
    {
      org: "USA Mathematical Talent Search",
      name: "USAMTS",
      type: "Proof-Based Mathematics Competition",
      status: "countdown",
      primary: "2026-10-13T23:59:00-05:00",
      events: [["Round 1", "October 2026"], ["Submission Deadline", "October 13, 2026"], ["Format", "Take-home proof problems over 30 days"]],
      note: "Individual proof-writing competition with a pathway toward AIME qualification; excellent quantitative preparation for engineering.",
      link: "https://usamts.org/",
    },
    {
      org: "MathWorks",
      name: "MathWorks Math Modeling Challenge (M3 Challenge)",
      type: "Applied Mathematics · Modeling",
      status: "countdown",
      primary: "2027-02-23T23:59:00-05:00",
      events: [["Registration Window", "Fall – February"], ["Competition Deadline", "February 23, 2027 — verify annual date"], ["Format", "Online team modeling challenge"]],
      note: "Team-based applied modeling with direct relevance to systems engineering, optimization, data science, and business decision-making.",
      link: "https://m3challenge.siam.org/",
    },
    {
      org: "Air & Space Forces Association",
      name: "CyberPatriot",
      type: "Cybersecurity Competition",
      status: "countdown",
      primary: "2026-10-25T23:59:00-04:00",
      events: [["Registration Window", "Summer – October"], ["Registration Deadline", "October 25, 2026"], ["Rounds", "October 2026 – March 2027"]],
      note: "Team-based defense of Windows and Linux systems; a strong practical cybersecurity activity for a Sea Cadet and CS profile.",
      link: "https://www.uscyberpatriot.org/",
    },
    {
      org: "U.S. Department of State",
      name: "National Security Language Initiative for Youth (NSLI-Y)",
      type: "International Language Exchange",
      status: "countdown",
      primary: "2026-11-14T23:59:00-05:00",
      events: [["Application Window", "Fall – mid-November"], ["Application Deadline", "Mid-November 2026 — verify cycle date"], ["Program", "Fully funded overseas language immersion"]],
      note: "Fully funded exchange in a critical language; useful for global business, technology, diplomacy, and cross-cultural communication.",
      link: "https://www.nsliny.org/",
    },
    {
      org: "U.S. Department of State",
      name: "Kennedy-Lugar Youth Exchange and Study (YES Abroad)",
      type: "International Exchange",
      status: "countdown",
      primary: "2026-12-01T23:59:00-05:00",
      events: [["Application Window", "Fall – December"], ["Application Deadline", "December 1, 2026 — country-specific"], ["Program", "Academic-year exchange with host family"]],
      note: "Fully funded academic-year exchange in participating countries; strengthens global leadership and business communication.",
      link: "https://www.yes-abroad.org/",
    },
    {
      org: "U.S. Department of State",
      name: "Congress-Bundestag Youth Exchange (CBYX)",
      type: "International Exchange",
      status: "countdown",
      primary: "2026-11-01T23:59:00-04:00",
      events: [["Application Window", "September – November"], ["Application Deadline", "November 1, 2026 — verify provider date"], ["Program", "Fully funded academic-year exchange in Germany"]],
      note: "Competitive exchange to Germany with academic study, host-family life, and German-language immersion.",
      link: "https://culturalvistas.org/programs/abroad/high-school/cbyx/",
    },
    {
      org: "U.S. Department of State · World Learning",
      name: "Kennedy-Lugar Youth Exchange and Study (YES)",
      type: "International Leadership Exchange",
      status: "countdown",
      primary: "2026-12-15T23:59:00-05:00",
      events: [["Application Window", "Fall – December"], ["Application Deadline", "December 15, 2026 — local partner deadline"], ["Program", "Academic-year exchange and civic leadership"]],
      note: "A global exchange pathway centered on leadership, community engagement, and understanding across cultures; check current U.S. eligibility and partner country list.",
      link: "https://www.yesprograms.org/",
    },
    {
      org: "AFS",
      name: "AFS Global STEM Academies",
      type: "International STEM Exchange",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [["Application Window", "Fall – January"], ["Application Deadline", "January 15, 2027 — country-specific"], ["Program", "International STEM academy + exchange experience"]],
      note: "Global STEM and sustainability program with intercultural exchange; confirm U.S. chapter eligibility, dates, and scholarship availability.",
      link: "https://www.afsusa.org/study-abroad/high-school/afs-global-stem-academies/",
    },
    {
      org: "U.S. Department of State",
      name: "Youth Ambassadors",
      type: "International Leadership Exchange",
      status: "rolling",
      events: [["Application Window", "Varies by implementing partner"], ["Program", "Short-term exchange in the Americas"], ["Focus", "Civic leadership, entrepreneurship, and community projects"]],
      note: "Look for current Texas/Latin America partner calls; particularly relevant to entrepreneurship, civic innovation, and Spanish-language development.",
      link: "https://www1.usa.gov/youth-ambassadors",
    },
    {
      org: "International Youth Math Challenge",
      name: "IYMC",
      type: "International Mathematics Competition",
      status: "countdown",
      primary: "2027-09-27T23:59:00-04:00",
      events: [["Qualification Round", "Typically September"], ["Registration Deadline", "September 27, 2027 — next-cycle date to verify"], ["Format", "Global online problem set and final round"]],
      note: "International online competition that adds a global quantitative credential without requiring travel.",
      link: "https://iymc.info/",
    },
    {
      org: "EduHeal Foundation",
      name: "National Interactive Maths Olympiad (NIMO)",
      type: "International Mathematics Competition",
      status: "countdown",
      primary: "2027-08-31T23:59:00-04:00",
      events: [["Application Window", "April – late August"], ["Registration Deadline", "Late August 2027 — verify cycle date"], ["Format", "International school/online contest"]],
      note: "Low-cost international applied-math competition; useful as a global quantitative activity if the schedule fits.",
      link: "https://www.eduhealfoundation.org/",
    },
    {
      org: "U.S. Naval Sea Cadet Corps · U.S. Navy",
      name: "Science, Engineering & Apprentice Program (SEAP)",
      type: "Research Internship",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [
        ["Application Window", "Typically opens in late fall"],
        ["Application Deadline", "January 15, 2027 — verify with the participating laboratory"],
        ["Program Dates", "8 weeks during summer"],
      ],
      note: "Paid laboratory research for high-school students at participating Navy laboratories; particularly aligned with cybersecurity, engineering, and aerospace interests.",
      link: "https://navalsteminterns.us/seap/",
    },
    {
      org: "Telluride Association",
      name: "Telluride Association Summer Seminar (TASS)",
      type: "Summer Seminar",
      status: "countdown",
      primary: "2027-01-03T23:59:00-05:00",
      events: [
        ["Application Window", "Fall – early January"],
        ["Application Deadline", "Early January 2027 — confirm the cycle date"],
        ["Program Dates", "Six-week summer seminar"],
      ],
      note: "Fully funded, discussion-based summer program; the application emphasizes intellectual curiosity, community contribution, and thoughtful writing.",
      link: "https://tellurideassociation.org/our-programs/tass/",
    },
    {
      org: "Bank of America",
      name: "Student Leaders",
      type: "Leadership Internship",
      status: "countdown",
      primary: "2027-01-31T23:59:00-05:00",
      events: [
        ["Application Window", "Typically November – January"],
        ["Application Deadline", "January 31, 2027 — verify when the next cycle opens"],
        ["Program", "Paid summer internship with a nonprofit + Student Leaders summit"],
      ],
      note: "Community leadership and paid nonprofit internship; Houston applicants should confirm local nonprofit and eligibility requirements.",
      link: "https://about.bankofamerica.com/en/people/student-leaders",
    },
    {
      org: "Stony Brook University · Simons Foundation",
      name: "Simons Summer Research Program",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Window", "December – February"],
        ["Application Deadline", "February 1, 2027 — confirm the annual deadline"],
        ["Program Dates", "July – August research placement"],
      ],
      note: "Mentored STEM research for high-school students at Stony Brook; strong fit for a research spike and technical writing portfolio.",
      link: "https://www.stonybrook.edu/commcms/simons/",
    },
    {
      org: "Carnegie Mellon University",
      name: "Summer Academy for Math and Science (SAMS)",
      type: "Pre-College STEM",
      status: "countdown",
      primary: "2027-03-01T23:59:00-05:00",
      events: [
        ["Application Window", "December – March"],
        ["Application Deadline", "March 1, 2027 — confirm the annual deadline"],
        ["Program Dates", "Six-week summer academic program"],
      ],
      note: "Tuition-free CMU program combining rigorous math/science coursework, engineering exposure, and college preparation.",
      link: "https://www.cmu.edu/pre-college/academic-programs/sams.html",
    },
    {
      org: "George Mason University",
      name: "Aspiring Scientists Summer Internship Program (ASSIP)",
      type: "Research Internship",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Window", "December – February"],
        ["Application Deadline", "February 1, 2027 — verify the next cycle"],
        ["Program Dates", "Eight-week summer research internship"],
      ],
      note: "Faculty-mentored research across science, technology, engineering, and mathematics; apply with a focused project interest and résumé.",
      link: "https://science.gmu.edu/assip/",
    },
    {
      org: "Yale University",
      name: "Yale Summer Program in Astrophysics (YSPA)",
      type: "Astrophysics Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Window", "Fall – February"],
        ["Application Deadline", "February 1, 2027 — confirm the annual deadline"],
        ["Program Dates", "Summer residential astrophysics program"],
      ],
      note: "Research-oriented astrophysics experience with lectures, problem-solving, and collaborative projects; complements the aerospace trajectory.",
      link: "https://yspa.yale.edu/",
    },
    {
      org: "Stanford University",
      name: "Stanford University Mathematics Camp (SUMaC)",
      type: "Mathematics Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Window", "Fall – February"],
        ["Application Deadline", "February 1, 2027 — confirm the annual deadline"],
        ["Program Dates", "Four-week summer program"],
      ],
      note: "Advanced proof-based mathematics and problem-solving; a strong complement to the AP math ladder and aerospace engineering goals.",
      link: "https://sumac.spcs.stanford.edu/",
    },
  ];

  /* ------------------------------------------------------------
     LENIS — smooth scrolling
     ------------------------------------------------------------ */
  var lenis = null;
  if (window.Lenis && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
    });
    /* Sync Lenis through GSAP's ticker when available for a single,
       jitter-free RAF loop shared by scroll + animations + Three.js */
    if (window.gsap) {
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
    /* Let ScrollTrigger read from Lenis */
    if (window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { offset: -72, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  /* ------------------------------------------------------------
     SCROLL TELEMETRY — progress bar + feeds the 3D scene
     ------------------------------------------------------------ */
  window.__scrollVel = 0;
  var lastY = 0, lastT = performance.now();
  function trackScroll(y) {
    var now = performance.now();
    var dt = now - lastT;
    var v = dt > 80 ? 0 : ((y - lastY) / Math.max(4, dt)) * 16.6;
    window.__scrollVel += (v - window.__scrollVel) * 0.18;
    lastY = y; lastT = now;
  }

  /* ------------------------------------------------------------
     NAVIGATION — warp between planets, no flash.
     ------------------------------------------------------------ */
  var navFade = document.getElementById("navFade");

  function closeMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (links) links.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (lenis) lenis.start();
  }

  /* ------------------------------------------------------------
     PAGE PREFETCHING & INSTANT SEAMLESS NAVIGATION
     ------------------------------------------------------------ */
  /* hover / pointerdown starts the fetch, so by the time the click lands
     the destination HTML is usually already in memory */
  var pageCache = {};
  function fetchPage(url) {
    if (!pageCache[url]) {
      pageCache[url] = fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error("fetch failed");
          return res.text();
        })
        .catch(function (err) {
          delete pageCache[url];
          throw err;
        });
    }
    return pageCache[url];
  }
  function prefetch(url) {
    if (!url || url.indexOf(".html") === -1) return;
    fetchPage(url).catch(function () {});
  }

  function handlePrefetchTrigger(e) {
    var warpLink = e.target.closest && e.target.closest("a[data-warp], .nav__links a, .rail__node, .foot__nav a, .foot__sol a, .sys__planet, .sys__dock-btn");
    if (warpLink) {
      var href = warpLink.getAttribute("href");
      if (href) prefetch(href);
    }
  }
  document.addEventListener("mouseover", handlePrefetchTrigger, { passive: true });
  document.addEventListener("pointerdown", handlePrefetchTrigger, { passive: true });

  /* ------------------------------------------------------------
     SEAMLESS SPA ROUTER & CLIENT-SIDE PAGE TRANSITION
     Continuous Three.js background flight + zero flash DOM swap
     ------------------------------------------------------------ */
  function hrefToSlug(href) {
    if (!href) return "sol";
    var clean = href.split("?")[0].split("#")[0].split("/").pop();
    if (!clean || clean === "index.html" || clean === "") return "sol";
    return clean.replace(".html", "");
  }

  var PLANET_ORDER = ["sol", "mission", "studies", "college", "applications", "extracurriculars", "schedule", "meal", "training", "deadlines"];

  function updateNavActive(slug) {
    var curIdx = PLANET_ORDER.indexOf(slug);
    if (curIdx === -1) curIdx = 0;

    var links = document.querySelectorAll(".nav__links a");
    links.forEach(function (a) {
      var aSlug = hrefToSlug(a.getAttribute("href"));
      a.classList.toggle("is-active", aSlug === slug);
    });

    var rails = document.querySelectorAll(".rail__node");
    rails.forEach(function (r) {
      var rSlug = r.dataset.planet || hrefToSlug(r.getAttribute("href"));
      var rIdx = PLANET_ORDER.indexOf(rSlug);
      var isCur = rSlug === slug;
      var isPast = rIdx !== -1 && rIdx < curIdx;
      r.classList.toggle("is-active", isCur);
      r.classList.toggle("is-cur", isCur);
      r.classList.toggle("is-past", isPast);
      r.setAttribute("aria-current", isCur ? "page" : "false");
    });
  }
  updateNavActive(currentPlanet);

  /* the router owns scroll position on back/forward */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var EXIT_MS = reducedMotion ? 0 : 300;
  var navBusy = false;
  var pendingNav = null;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function navigateSpa(href, pushState) {
    if (!href) return;
    var targetSlug = hrefToSlug(href);
    closeMenu();

    /* a click (or back/forward) mid-flight is queued, never dropped */
    if (navBusy) {
      pendingNav = [href, pushState];
      return;
    }

    if (targetSlug === currentPlanet) {
      if (lenis) lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }
    navBusy = true;

    /* 1. the camera leaves for the destination planet immediately */
    if (window.__flyToPlanet) window.__flyToPlanet(targetSlug);

    /* 2. old content lifts away while the destination HTML loads */
    var mainEl = document.getElementById("top");
    if (mainEl) {
      mainEl.classList.remove("is-arriving");
      mainEl.classList.add("is-leaving");
    }

    /* 3. swap once the exit has finished AND the HTML is in hand */
    Promise.all([fetchPage(href), wait(EXIT_MS)])
      .then(function (res) {
        var doc = new DOMParser().parseFromString(res[0], "text/html");
        var newMain = doc.getElementById("top");
        if (!newMain || !mainEl) throw new Error("no main");

        mainEl.innerHTML = newMain.innerHTML;
        document.title = doc.title;
        var themeMeta = document.querySelector('meta[name="theme-color"]');
        var nextTheme = doc.querySelector('meta[name="theme-color"]');
        if (themeMeta && nextTheme) themeMeta.setAttribute("content", nextTheme.getAttribute("content"));
        document.body.dataset.planet = targetSlug;
        currentPlanet = targetSlug;
        refreshAccent();
        if (pushState !== false) history.pushState({ slug: targetSlug }, doc.title, href);

        if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
        updateNavActive(targetSlug);
        initPageFeatures();
        onScroll();

        /* 4. park the new content just below with no transition, then release it */
        mainEl.classList.add("is-arriving");
        mainEl.classList.remove("is-leaving");
        void mainEl.offsetHeight;
        mainEl.classList.remove("is-arriving");
      })
      .catch(function () {
        window.location.href = href;
      })
      .then(function () {
        navBusy = false;
        if (pendingNav) {
          var next = pendingNav;
          pendingNav = null;
          navigateSpa(next[0], next[1]);
        }
      });
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a[data-warp], .nav__links a, .rail__node, .foot__nav a, .foot__sol a, .sys__planet, .sys__dock-btn");
    if (link) {
      var href = link.getAttribute("href");
      if (href && href !== "#" && (href.indexOf(".html") !== -1 || href === "index.html" || href === "/")) {
        e.preventDefault();
        navigateSpa(href, true);
        return;
      }
    }
    var anchor = e.target.closest ? e.target.closest('a[data-scroll]') : null;
    if (anchor) {
      var target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      scrollToY(target.getBoundingClientRect().top + (window.scrollY || 0));
      closeMenu();
    }
  });

  window.addEventListener("popstate", function (e) {
    var path = window.location.pathname.split("/").pop() || "index.html";
    navigateSpa(path, false);
  });

  /* ------------------------------------------------------------
     EXPERIMENTAL ASTRO-NAV RETICLE, GYRO GIMBAL & TELEMETRY HUD
     ------------------------------------------------------------ */
  var glow = document.getElementById("glow");
  var cometCanvas = document.getElementById("comet");
  var cctx = cometCanvas ? cometCanvas.getContext("2d") : null;

  if (finePointer && !reducedMotion && glow) {
    document.body.classList.add("has-cursor");

    /* ---- 1. PRECISION POINTER DOT ---- */
    var dotEl = document.getElementById("cursorDot");
    if (!dotEl) {
      dotEl = document.createElement("div");
      dotEl.id = "cursorDot";
      dotEl.className = "cursor--dot";
      dotEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(dotEl);
    }

    /* ---- 2. ASTRO-NAV GYRO RETICLE ---- */
    var reticle = document.getElementById("cursorReticle");
    if (!reticle) {
      reticle = document.createElement("div");
      reticle.id = "cursorReticle";
      reticle.className = "cursor-reticle";
      reticle.setAttribute("aria-hidden", "true");
      reticle.innerHTML = '<div class="cursor-reticle__ring"></div>' +
                          '<div class="cursor-reticle__cross"></div>' +
                          '<div class="cursor-reticle__brackets"></div>';
      document.body.appendChild(reticle);
    }

    /* ---- 3. LIVE TELEMETRY HUD BADGE ---- */
    var hudEl = document.getElementById("cursorHud");
    if (!hudEl) {
      hudEl = document.createElement("div");
      hudEl.id = "cursorHud";
      hudEl.className = "cursor-hud";
      hudEl.setAttribute("aria-hidden", "true");
      hudEl.innerHTML = '<b>[ORBIT]</b> 0 km/h · ' + currentPlanet.toUpperCase();
      document.body.appendChild(hudEl);
    }

    /* ---- 4. CONSTELLATION ION WAKE CANVAS ---- */
    var dpr = window.devicePixelRatio || 1;
    var cw = 0, ch = 0;
    function resizeCanvas() {
      if (!cometCanvas) return;
      cw = window.innerWidth;
      ch = window.innerHeight;
      cometCanvas.width = cw * dpr;
      cometCanvas.height = ch * dpr;
      if (cctx) cctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    var particles = [];
    var shockwaves = [];
    var MAX_PARTICLES = 40;

    /* ---- state ---- */
    var mx = -100, my = -100, dx = -100, dy = -100, rx = -100, ry = -100, gx = -100, gy = -100, hx = -100, hy = -100;
    var moved = false, followT = 0, lastSpawnT = 0, lastHudT = 0, lastTargetCheckT = 0;
    var curAng = 0, curStretch = 0;
    var currentLockLabel = null;
    var currentLockTarget = null;
    var cursorTargetSelector = "a, button, [role='tab'], .dl-card__head, .cta, .row, .uni, .kpi";

    function clearCursorTarget() {
      reticle.classList.remove("is-target");
      dotEl.classList.remove("is-target");
      hudEl.classList.remove("is-target");
      currentLockTarget = null;
      currentLockLabel = null;
    }

    function getCursorTarget(node) {
      return node && node.closest ? node.closest(cursorTargetSelector) : null;
    }

    function setCursorTarget(target) {
      if (!target || currentLockTarget === target) return;
      reticle.classList.add("is-target");
      dotEl.classList.add("is-target");
      hudEl.classList.add("is-target");
      var label = target.getAttribute("data-short") || target.getAttribute("aria-label") || target.innerText || "TARGET";
      label = label.trim().split("\n")[0].substring(0, 16).toUpperCase();
      currentLockTarget = target;
      currentLockLabel = label || "TARGET";
    }

    function updateCursorTargetAtPointer() {
      if (!moved || mx < 0 || my < 0 || mx > window.innerWidth || my > window.innerHeight) {
        if (currentLockTarget) clearCursorTarget();
        return;
      }
      var underPointer = document.elementFromPoint(mx, my);
      var target = getCursorTarget(underPointer);
      if (target) setCursorTarget(target);
      else if (currentLockTarget) clearCursorTarget();
    }

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      updateCursorTargetAtPointer();
      if (!moved) {
        moved = true;
        dx = mx; dy = my;
        rx = mx; ry = my;
        hx = mx; hy = my;
        gx = mx; gy = my;
        dotEl.style.opacity = "";
        reticle.style.opacity = "";
        hudEl.style.opacity = "";
      }
    }, { passive: true });

    window.addEventListener("scroll", updateCursorTargetAtPointer, { passive: true });

    document.addEventListener("mouseleave", function () {
      dotEl.style.opacity = "0";
      reticle.style.opacity = "0";
      hudEl.style.opacity = "0";
      clearCursorTarget();
    });

    window.addEventListener("blur", clearCursorTarget);

    document.addEventListener("mouseenter", function () {
      if (moved) {
        dotEl.style.opacity = "";
        reticle.style.opacity = "";
        hudEl.style.opacity = "";
      }
    });

    dotEl.style.opacity = "0";
    reticle.style.opacity = "0";
    hudEl.style.opacity = "0";

    /* ---- animation loop ---- */
    function follow() {
      var now = performance.now();
      var dt = Math.min(45, now - (followT || now));
      followT = now;

      /* Precision dot follows mouse with instantaneous response for clicking accuracy */
      dx = mx;
      dy = my;

      /* Reticle, HUD and Ambient Glow follow with silky staggered damping */
      if (window.anime && anime.utils && anime.utils.damp) {
        rx = anime.utils.damp(rx, mx, 24, dt); ry = anime.utils.damp(ry, my, 24, dt);
        hx = anime.utils.damp(hx, mx, 14, dt); hy = anime.utils.damp(hy, my, 14, dt);
        gx = anime.utils.damp(gx, mx, 6, dt);  gy = anime.utils.damp(gy, my, 6, dt);
      } else {
        rx += (mx - rx) * (1 - Math.exp(-dt * 0.024));
        ry += (my - ry) * (1 - Math.exp(-dt * 0.024));
        hx += (mx - hx) * (1 - Math.exp(-dt * 0.014));
        hy += (my - hy) * (1 - Math.exp(-dt * 0.014));
        gx += (mx - gx) * (1 - Math.exp(-dt * 0.006));
        gy += (my - gy) * (1 - Math.exp(-dt * 0.006));
      }

      dotEl.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0) translate(-50%,-50%)";

      /* Smooth Velocity & shortest-path Attitude Angle */
      var vx = mx - rx, vy = my - ry;
      var dist = Math.sqrt(vx * vx + vy * vy);
      var speedKmh = Math.round(dist * 24);

      if (dist > 1.8) {
        var targetAng = Math.atan2(vy, vx);
        var diffAng = (targetAng - curAng) % (Math.PI * 2);
        if (diffAng > Math.PI) diffAng -= Math.PI * 2;
        if (diffAng < -Math.PI) diffAng += Math.PI * 2;
        curAng += diffAng * (1 - Math.exp(-dt * 0.018));
      }

      /* Elastic velocity stretch */
      var targetStretch = Math.min(0.24, dist * 0.0035);
      curStretch += (targetStretch - curStretch) * (1 - Math.exp(-dt * 0.022));

      reticle.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0) translate(-50%,-50%) rotate(" + curAng.toFixed(3) + "rad) scale(" + (1 + curStretch).toFixed(3) + "," + (1 - curStretch * 0.3).toFixed(3) + ")";

      /* A stationary pointer can pass over a new target while the page
         scrolls or content is replaced, so periodically resolve the
         screen position instead of trusting stale mouseout events. */
      if (now - lastTargetCheckT > 80) {
        lastTargetCheckT = now;
        updateCursorTargetAtPointer();
      }

      /* A SPA page swap can remove the element that held the last lock
         without emitting a mouseout event. Never keep a dead lock alive. */
      if (currentLockTarget && !currentLockTarget.isConnected) clearCursorTarget();

      /* Telemetry HUD position & dynamic readout */
      hudEl.style.transform = "translate3d(" + (hx + 24).toFixed(1) + "px," + (hy + 18).toFixed(1) + "px,0)";
      if (now - lastHudT > 80) {
        lastHudT = now;
        if (currentLockLabel) {
          hudEl.innerHTML = '<b>[LOCK // ' + currentLockLabel + ']</b>';
        } else if (dist > 3) {
          hudEl.innerHTML = '<b>[VEL]</b> ' + speedKmh + ' km/h · ' + Math.round(curAng * 180 / Math.PI) + '°';
        } else {
          hudEl.innerHTML = '<b>[ORBIT]</b> 0 km/h · ' + currentPlanet.toUpperCase();
        }
      }

      glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0) translate(-50%,-50%)";

      /* ---- 5. CONSTELLATION ION WAKE PHYSICS ON CANVAS ---- */
      if (cctx && cw > 0 && ch > 0) {
        cctx.clearRect(0, 0, cw, ch);

        /* Spawn ion wake sparks during movement */
        if (dist > 1.5 && now - lastSpawnT > 28 && particles.length < MAX_PARTICLES) {
          lastSpawnT = now;
          particles.push({
            x: mx + (Math.random() - 0.5) * 6,
            y: my + (Math.random() - 0.5) * 6,
            vx: -vx * 0.12 + (Math.random() - 0.5) * 0.8,
            vy: -vy * 0.12 + (Math.random() - 0.5) * 0.8,
            life: 1.0,
            decay: 0.032 + Math.random() * 0.02,
            size: 2.2 + Math.random() * 2.2,
          });
        }

        /* Update & render particles + constellation vector lines */
        var activePts = [];
        for (var pi = particles.length - 1; pi >= 0; pi--) {
          var p = particles[pi];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          if (p.life <= 0) {
            particles.splice(pi, 1);
            continue;
          }
          activePts.push(p);

          /* Draw glowing stellar ember */
          var alpha = Math.max(0, p.life);
          cctx.fillStyle = "rgba(" + accentRgb.join(",") + "," + (0.55 * alpha).toFixed(3) + ")";
          cctx.beginPath();
          cctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          cctx.fill();

          /* Specular highlight glint */
          cctx.fillStyle = "rgba(255,255,255," + (0.75 * alpha).toFixed(3) + ")";
          cctx.beginPath();
          cctx.arc(p.x - 0.5, p.y - 0.5, (p.size * 0.45) * alpha, 0, Math.PI * 2);
          cctx.fill();
        }

        /* Draw vector constellation lines between nearby particles */
        for (var i = 0; i < activePts.length; i++) {
          for (var j = i + 1; j < activePts.length; j++) {
            var p1 = activePts[i], p2 = activePts[j];
            var pdist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            if (pdist < 55) {
              var lineAlpha = (1 - pdist / 55) * Math.min(p1.life, p2.life) * 0.35;
              cctx.strokeStyle = "rgba(" + accentRgb.join(",") + "," + lineAlpha.toFixed(3) + ")";
              cctx.lineWidth = 1;
              cctx.beginPath();
              cctx.moveTo(p1.x, p1.y);
              cctx.lineTo(p2.x, p2.y);
              cctx.stroke();
            }
          }
        }

        /* Update & render RCS shockwaves */
        for (var si = shockwaves.length - 1; si >= 0; si--) {
          var sw = shockwaves[si];
          sw.r += 2.8;
          sw.life -= 0.055;
          if (sw.life <= 0) {
            shockwaves.splice(si, 1);
            continue;
          }
          cctx.strokeStyle = "rgba(" + accentRgb.join(",") + "," + (0.65 * sw.life).toFixed(3) + ")";
          cctx.lineWidth = 1.5;
          cctx.beginPath();
          cctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          cctx.stroke();
        }
      }

      requestAnimationFrame(follow);
    }
    follow();

    /* ---- 6. INTERACTIVE TARGET LOCK & RCS THRUSTER PULSE ---- */
    document.addEventListener("mousedown", function () {
      reticle.classList.add("is-down");
      /* Spawn impulse RCS shockwave burst on canvas */
      if (cctx) {
        shockwaves.push({ x: mx, y: my, r: 4, life: 1.0 });
        for (var bi = 0; bi < 10; bi++) {
          var bAng = (bi / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          var bSpeed = 2 + Math.random() * 3.5;
          particles.push({
            x: mx, y: my,
            vx: Math.cos(bAng) * bSpeed,
            vy: Math.sin(bAng) * bSpeed,
            life: 1.0,
            decay: 0.045 + Math.random() * 0.03,
            size: 2.8 + Math.random() * 2,
          });
        }
      }
    });

    document.addEventListener("mouseup", function () {
      reticle.classList.remove("is-down");
    });
    /* ---- 3D tilt on cards — delegated, so rows swapped in by the router tilt too ---- */
    var tiltEl = null;
    function releaseTilt() {
      if (!tiltEl) return;
      tiltEl.style.transitionDuration = "";
      tiltEl.style.transform = "";
      tiltEl = null;
    }
    document.addEventListener("mousemove", function (e) {
      var el = e.target.closest ? e.target.closest(".row, .uni") : null;
      if (el !== tiltEl) releaseTilt();
      if (!el) return;
      tiltEl = el;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transitionDuration = "0.12s";
      el.style.transform = "perspective(700px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateZ(0)";
    }, { passive: true });
    document.addEventListener("mouseleave", releaseTilt);
  }

  /* ------------------------------------------------------------
     NAV — solid state, mobile menu, progress bar, rail
     ------------------------------------------------------------ */
  var nav = document.getElementById("nav");
  var progressBar = document.getElementById("progressBar");
  var navToggle = document.getElementById("navToggle");
  var navLinksEl = document.getElementById("navLinks");
  var railNodes = Array.prototype.slice.call(document.querySelectorAll(".rail__node"));

  if (navToggle && navLinksEl) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      var willOpen = !open;
      navToggle.setAttribute("aria-expanded", String(willOpen));
      navLinksEl.classList.toggle("is-open", willOpen);
      document.body.classList.toggle("menu-open", willOpen);
      if (lenis) { if (willOpen) lenis.stop(); else lenis.start(); }
    });
  }

  /* mark the current planet on the rail + nav */
  railNodes.forEach(function (node) {
    if (node.getAttribute("data-planet") === currentPlanet) node.classList.add("is-cur");
  });
  var navLinksArr = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  navLinksArr.forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var mine = href.replace(".html", "").replace("/", "");
    if (mine === currentPlanet || (currentPlanet === "sol" && mine === "index")) a.classList.add("is-active");
  });

  /* ------------------------------------------------------------
     SCROLL PARALLAX — optional, opt-in only. Tag any element with
     data-par="0.1" … "0.4" to drift it at that speed relative to
     its rest position while the page scrolls (0.3 = drifts fastest).
     Nothing is parallaxed by default: section headers stay glued
     together, and the 3D camera journey + hero scrub provide the
     scroll motion. Offsets are measured from the rest position
     captured at init, re-captured once fonts settle and on resize.
     ------------------------------------------------------------ */
  var parEls = [];
  function initParallax() {
    parEls = [];
    var seen = {};
    function add(el, speed) {
      if (!el || seen[el]) return;
      seen[el] = true;
      parEls.push({ el: el, speed: speed, base: 0 });
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-par]"), function (c) {
      add(c, parseFloat(c.getAttribute("data-par")) || 0.15);
    });
    captureParallaxBase();
    /* re-capture once fonts & reveal animations have settled */
    setTimeout(captureParallaxBase, 1500);
  }

  function captureParallaxBase() {
    var vh = window.innerHeight || 1;
    for (var i = 0; i < parEls.length; i++) {
      var r = parEls[i].el.getBoundingClientRect();
      parEls[i].base = r.top + r.height * 0.5 - vh * 0.5;
    }
  }

  function updateParallax() {
    if (reducedMotion || !parEls.length) return;
    var vh = window.innerHeight || 1;
    for (var i = 0; i < parEls.length; i++) {
      var p = parEls[i];
      var r = p.el.getBoundingClientRect();
      if (r.bottom < -280 || r.top > vh + 280) {
        if (p.el.style.transform) p.el.style.transform = "";
        continue;
      }
      var mid = r.top + r.height * 0.5 - vh * 0.5;
      p.el.style.transform = "translate3d(0," + ((mid - p.base) * p.speed).toFixed(1) + "px,0)";
    }
  }

  function onScroll() {
    var y = window.scrollY || 0;
    trackScroll(y);
    updateParallax();
    if (nav) nav.classList.toggle("is-solid", y > 24);
    if (progressBar) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      progressBar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ")";
    }
  }
  window.addEventListener("resize", captureParallaxBase, { passive: true });
  if (lenis) lenis.on("scroll", function (e) { onScroll(); });
  else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* warp overlay disabled — clean, instant page transition */
  var warp = document.getElementById("warp");
  if (warp) warp.style.display = "none";
  if (navFade) navFade.style.display = "none";

  /* ------------------------------------------------------------
     PAGE COMPONENT INITIALIZERS (called on load & SPA swaps)
     ------------------------------------------------------------ */
  var GLYPHS = "01X◈★⏣◬☿♁♂♃♄♅♆♇";
  function decryptText(el, duration) {
    if (!el || el.__decrypting || reducedMotion) return;
    el.__decrypting = true;
    var original = el.textContent;
    var chars = original.split("");
    var dur = duration || 850;
    var startTime = performance.now();

    function frame(now) {
      var progress = Math.min(1, (now - startTime) / dur);
      var result = "";
      for (var i = 0; i < chars.length; i++) {
        if (chars[i] === " " || chars[i] === "·" || chars[i] === "—" || chars[i] === "\n") {
          result += chars[i];
        } else if (i / chars.length < progress) {
          result += chars[i];
        } else {
          result += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      el.textContent = result;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = original;
        el.__decrypting = false;
      }
    }
    requestAnimationFrame(frame);
  }

  var revealIo = null;
  function initReveals() {
    var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal, .cascade"));
    if (revealIo) { revealIo.disconnect(); revealIo = null; }
    if ("IntersectionObserver" in window && !reducedMotion) {
      revealIo = new IntersectionObserver(function (entries) {
        /* stagger within one batch only — an element scrolled into view on
           its own reveals immediately instead of inheriting a page-wide delay */
        var batch = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          el.style.transitionDelay = Math.min(240, batch++ * 60) + "ms";
          el.classList.add("is-in");

          /* trigger celestial text decryption on prominent titles */
          var title = el.querySelector(".sec__title, .hero__name, .sec__num");
          if (title) decryptText(title, 380);

          revealIo.unobserve(el);
          /* once settled, drop the delay (hovers stay snappy) and the GPU layer */
          setTimeout(function () {
            el.style.transitionDelay = "";
            el.style.willChange = "auto";
          }, 1100);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach(function (el) { revealIo.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    }
  }

  var currentBlurObserver = null;
  function initBackgroundBlur() {
    var sceneCanvas = document.getElementById("scene3d");
    if (currentBlurObserver) { currentBlurObserver.disconnect(); currentBlurObserver = null; }
    if (sceneCanvas && currentPlanet === "sol" && "IntersectionObserver" in window && !reducedMotion) {
      var blurSections = Array.prototype.slice.call(
        document.querySelectorAll(".sec:not(#hero):not(.sys-sec), #teaser, .kpis")
      );
      var activeBlurMap = new Map();
      currentBlurObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          activeBlurMap.set(en.target, en.isIntersecting);
        });
        var hasVisibleSection = false;
        activeBlurMap.forEach(function (isVisible) {
          if (isVisible) hasVisibleSection = true;
        });
        sceneCanvas.classList.toggle("is-blurred", hasVisibleSection);
      }, { threshold: 0.1, rootMargin: "-8% 0px -15% 0px" });
      blurSections.forEach(function (sec) { currentBlurObserver.observe(sec); });
    } else if (sceneCanvas) {
      sceneCanvas.classList.remove("is-blurred");
    }
  }

  var clockTimer = null;
  function initHoustonClock() {
    var clock = document.getElementById("houstonClock");
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    if (!clock) return;
    function tickClock() {
      try {
        clock.textContent = new Date().toLocaleTimeString("en-US", {
          timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
      } catch (e) { /* leave as-is */ }
    }
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
  }

  function initDockSync() {
    var dockBtns = document.querySelectorAll(".sys__dock-btn");
    var sysPlanets = document.querySelectorAll(".sys__planet");
    dockBtns.forEach(function (btn, i) {
      btn.addEventListener("mouseenter", function () {
        if (sysPlanets[i]) sysPlanets[i].classList.add("is-dock-active");
      });
      btn.addEventListener("mouseleave", function () {
        if (sysPlanets[i]) sysPlanets[i].classList.remove("is-dock-active");
      });
    });
  }

  function initScheduleToggle() {
    var modeSchool = document.getElementById("modeSchool");
    var modeSummer = document.getElementById("modeSummer");
    var tableSchool = document.getElementById("tableSchool");
    var tableSummer = document.getElementById("tableSummer");
    if (!modeSchool || !modeSummer || !tableSchool || !tableSummer) return;
    function setMode(summer) {
      modeSchool.classList.toggle("is-on", !summer);
      modeSummer.classList.toggle("is-on", summer);
      modeSchool.setAttribute("aria-selected", String(!summer));
      modeSummer.setAttribute("aria-selected", String(summer));
      tableSchool.hidden = summer;
      tableSummer.hidden = !summer;
    }
    modeSchool.addEventListener("click", function () { setMode(false); });
    modeSummer.addEventListener("click", function () { setMode(true); });
  }

  function initTrainingToggle() {
    var modeGym = document.getElementById("modeGym");
    var modeHome = document.getElementById("modeHome");
    var progGym = document.getElementById("progGym");
    var progHome = document.getElementById("progHome");
    if (!modeGym || !modeHome || !progGym || !progHome) return;
    function setMode(home) {
      modeGym.classList.toggle("is-on", !home);
      modeHome.classList.toggle("is-on", home);
      modeGym.setAttribute("aria-selected", String(!home));
      modeHome.setAttribute("aria-selected", String(home));
      progGym.hidden = home;
      progHome.hidden = !home;
    }
    modeGym.addEventListener("click", function () { setMode(false); });
    modeHome.addEventListener("click", function () { setMode(true); });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function setStatus(el, text, cls) {
    if (el.textContent !== text) el.textContent = text;
    cls = "dl-card__status " + cls;
    if (el.className !== cls) el.className = cls;
  }

  /* status[data-kind="opens"] counts down to an application window opening
     (no deadline published yet); everything else counts down to a deadline */
  function renderCountdown(statusEl, countEl, target) {
    var opens = statusEl.dataset.kind === "opens";
    var diff = target - Date.now();
    var numEl = countEl.querySelector(".c-num");
    var lblEl = countEl.querySelector(".c-lbl");
    if (diff <= 0) {
      if (opens) {
        setStatus(statusEl, "Application open", "s-open");
        if (numEl) numEl.textContent = "◈";
        if (lblEl) lblEl.textContent = "deadline not posted";
      } else {
        setStatus(statusEl, "Cycle closed", "s-closed");
        if (numEl) numEl.textContent = "0";
        if (lblEl) lblEl.textContent = "deadline passed";
      }
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hrs = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    if (numEl) numEl.textContent = pad(days);
    if (lblEl) lblEl.textContent = "d " + pad(hrs) + "h " + pad(mins) + "m " + pad(secs) + "s · until " + (opens ? "apps open" : "deadline");

    if (opens) setStatus(statusEl, "Not yet open", "s-upcoming");
    else if (diff <= 60 * 86400000) setStatus(statusEl, "Deadline soon", "s-soon");
    else setStatus(statusEl, "Application open", "s-open");
  }

  /* ------------------------------------------------------------
     APPLIED MARKS — a checklist you keep.
     Marks are keyed off the program name (stable across reordering)
     and persisted to localStorage, so the list remembers what you
     have actually sent off. The dock reads marks back to filter,
     count, and clear them.
     ------------------------------------------------------------ */
  var APPLIED_KEY = "bw.deadlines.applied.v1";
  var appliedKeys = null;
  var dockMarkHook = null;

  function markKey(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function loadMarks() {
    if (appliedKeys) return appliedKeys;
    appliedKeys = [];
    try {
      var raw = window.localStorage.getItem(APPLIED_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Object.prototype.toString.call(parsed) === "[object Array]") {
        appliedKeys = parsed.filter(function (k) { return typeof k === "string"; });
      }
    } catch (err) { appliedKeys = []; }
    return appliedKeys;
  }

  function saveMarks() {
    try {
      window.localStorage.setItem(APPLIED_KEY, JSON.stringify(appliedKeys || []));
    } catch (err) { /* private mode / storage full — marks stay for this session */ }
  }

  function isMarked(key) { return loadMarks().indexOf(key) !== -1; }

  function setMark(key, on) {
    var list = loadMarks();
    var at = list.indexOf(key);
    if (on && at === -1) list.push(key);
    else if (!on && at !== -1) list.splice(at, 1);
    else return false;
    saveMarks();
    return true;
  }

  var dlTimer = null;

  function announce(text) {
    var el = document.getElementById("dlAnnounce");
    if (el) el.textContent = text;
  }

  /* the ink: a shockwave ring plus a spray of embers, thrown from the tick */
  function markInk(card) {
    var host = card.querySelector(".dl-card__top");
    var box = card.querySelector(".dl-card__check");
    if (!host || !box) return;
    var cx = box.offsetLeft + box.offsetWidth / 2;
    var cy = box.offsetTop + box.offsetHeight / 2;
    var live = canAnime && !reducedMotion;

    function spawn(cls, style, life) {
      var el = document.createElement("i");
      el.className = cls;
      el.setAttribute("aria-hidden", "true");
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      host.appendChild(el);
      if (!live) { host.removeChild(el); return null; }
      Object.keys(style).forEach(function (k) { el.style.setProperty(k, style[k]); });
      /* never let ink outlive its animation — a stalled frame loop
         (backgrounded tab) would otherwise leave it on the row */
      window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, life);
      return el;
    }

    var ring = spawn("dl-card__ring", {}, 1100);
    if (ring) {
      try {
        anime.animate(ring, {
          scale: [0.35, 2.5], opacity: [0.85, 0], duration: 720, ease: "out(3)",
          onComplete: function () { if (ring.parentNode) ring.parentNode.removeChild(ring); },
        });
      } catch (err) { if (ring.parentNode) ring.parentNode.removeChild(ring); }
    }

    for (var i = 0; i < 14; i++) {
      var spark = spawn("dl-card__spark", { "--sz": (2 + Math.random() * 3).toFixed(1) + "px" }, 1400);
      if (!spark) break;
      (function (el) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 22 + Math.random() * 54;
        try {
          anime.animate(el, {
            translateX: Math.cos(angle) * dist,
            translateY: Math.sin(angle) * dist - 8,
            scale: [1, 0.15],
            opacity: [1, 0],
            duration: 560 + Math.random() * 320,
            ease: "out(3)",
            onComplete: function () { if (el.parentNode) el.parentNode.removeChild(el); },
          });
        } catch (err) { if (el.parentNode) el.parentNode.removeChild(el); }
      })(spark);
    }
  }

  function markCard(card, on, animate) {
    var check = card.querySelector(".dl-card__check");
    var titleEl = card.querySelector(".dl-card__t b");
    var label = titleEl ? titleEl.textContent : "program";

    card.classList.toggle("is-applied", !!on);
    card.dataset.applied = on ? "true" : "false";
    if (check) {
      check.setAttribute("aria-pressed", String(!!on));
      check.setAttribute("aria-label", on ? "Unmark " + label : "Mark " + label + " as applied");
    }
    if (!animate) return;

    if (on) {
      card.classList.remove("is-stamping");
      void card.offsetWidth;
      card.classList.add("is-stamping");
      window.setTimeout(function () { card.classList.remove("is-stamping"); }, 760);
      markInk(card);
    }
    if (check && canAnime && !reducedMotion) {
      try {
        anime.animate(check, { scale: on ? [0.82, 1] : [1.08, 1], duration: 480, ease: "out(4)" });
      } catch (err) { /* decorative */ }
    }
  }

  function initDeadlines() {
    var grid = document.getElementById("dlGrid");
    if (dlTimer) { clearInterval(dlTimer); dlTimer = null; }
    /* leaving the deadlines planet — take the dock (and its observers) with us */
    if (!grid) { removeDeadlineDock(); return; }
    grid.innerHTML = "";
    DEADLINES.forEach(function (p, i) {
      var card = document.createElement("article");
      card.className = "dl-card";
      card.style.setProperty("--i", i);
      card.dataset.search = [p.name, p.org, p.type, p.note || ""].join(" ").toLowerCase();
      card.dataset.rolling = p.status === "rolling" ? "true" : "false";
      card.dataset.key = markKey(p.name);

      var head = document.createElement("button");
      head.className = "dl-card__head";
      head.type = "button";
      head.setAttribute("aria-expanded", "false");
      head.setAttribute("aria-controls", "dl-body-" + i);

      var idx = document.createElement("span");
      idx.className = "dl-card__idx";
      idx.textContent = pad(i + 1);

      var t = document.createElement("span");
      t.className = "dl-card__t";
      var tb = document.createElement("b");
      tb.textContent = p.name;
      var ti = document.createElement("i");
      ti.textContent = p.org + " · " + p.type;
      t.appendChild(tb);
      t.appendChild(ti);

      var status = document.createElement("span");
      status.className = "dl-card__status";

      var count = document.createElement("span");
      count.className = "dl-card__count";
      var cNum = document.createElement("span");
      cNum.className = "c-num";
      cNum.textContent = "--";
      var cLbl = document.createElement("span");
      cLbl.className = "c-lbl";
      count.appendChild(cNum);
      count.appendChild(cLbl);

      var plus = document.createElement("span");
      plus.className = "dl-card__plus";
      plus.textContent = "+";
      plus.setAttribute("aria-hidden", "true");

      if (p.status === "rolling") {
        status.textContent = "Rolling";
        status.classList.add("s-rolling");
        cLbl.textContent = "apply anytime";
        cNum.textContent = "∞";
      } else if (p.primary) {
        var target = new Date(p.primary).getTime();
        status.dataset.target = String(target);
        if (p.primaryKind) status.dataset.kind = p.primaryKind;
        renderCountdown(status, count, target);
      } else {
        status.textContent = "Window open";
        status.classList.add("s-open");
        cLbl.textContent = "no fixed deadline";
        cNum.textContent = "◈";
      }

      head.appendChild(idx);
      head.appendChild(t);
      head.appendChild(status);
      head.appendChild(count);
      head.appendChild(plus);

      /* body collapses through a 0fr → 1fr grid row, so open/close
         animates the real content height (clip → inner keeps padding out of the 0fr row) */
      var body = document.createElement("div");
      body.className = "dl-card__body";
      body.id = "dl-body-" + i;
      body.inert = true;
      var clip = document.createElement("div");
      clip.className = "dl-card__clip";
      var inner = document.createElement("div");
      inner.className = "dl-card__inner";

      var dates = document.createElement("div");
      dates.className = "dl-card__dates";
      p.events.forEach(function (ev) {
        var row = document.createElement("span");
        var b = document.createElement("b");
        b.textContent = ev[0] + ":";
        row.appendChild(b);
        row.appendChild(document.createTextNode(" " + ev[1]));
        dates.appendChild(row);
      });
      inner.appendChild(dates);

      if (p.note || p.link) {
        var aside = document.createElement("div");
        aside.className = "dl-card__aside";
        if (p.note) {
          var note = document.createElement("p");
          note.className = "dl-card__note";
          note.textContent = p.note;
          aside.appendChild(note);
        }
        if (p.link) {
          var link = document.createElement("a");
          link.className = "dl-card__link";
          link.href = p.link;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = "Program page ↗";
          aside.appendChild(link);
        }
        inner.appendChild(aside);
      }

      clip.appendChild(inner);
      body.appendChild(clip);

      head.addEventListener("click", function () {
        var open = !card.classList.contains("is-open");
        card.classList.toggle("is-open", open);
        body.inert = !open;
        head.setAttribute("aria-expanded", String(open));
      });

      /* the tick rail — a deliberate second affordance beside the row,
         so marking something applied never opens or closes the card */
      var rail = document.createElement("span");
      rail.className = "dl-card__rail";
      rail.setAttribute("aria-hidden", "true");

      var stamp = document.createElement("span");
      stamp.className = "dl-card__stamp";
      stamp.setAttribute("aria-hidden", "true");
      stamp.textContent = "Applied";

      var check = document.createElement("button");
      check.className = "dl-card__check";
      check.type = "button";
      check.setAttribute("aria-pressed", "false");
      check.setAttribute("aria-label", "Mark " + p.name + " as applied");
      check.innerHTML = '<span class="dl-card__box" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5.6 12.8l4.2 4.2L18.5 7.5"/></svg></span>';

      function setApplied(on) {
        if (!setMark(card.dataset.key, on)) return;
        markCard(card, on, true);
        if (dockMarkHook) dockMarkHook();
        announce((on ? "Marked " : "Unmarked ") + p.name + " — " +
          loadMarks().length + " of " + DEADLINES.length + " marked as applied.");
      }

      check.addEventListener("click", function (event) {
        event.stopPropagation();
        setApplied(!card.classList.contains("is-applied"));
      });

      var top = document.createElement("div");
      top.className = "dl-card__top";
      top.appendChild(head);
      top.appendChild(stamp);
      top.appendChild(check);

      card.appendChild(rail);
      card.appendChild(top);
      card.appendChild(body);
      if (isMarked(card.dataset.key)) markCard(card, true, false);
      grid.appendChild(card);
    });

    initDeadlineDock();
    dlTimer = setInterval(function () {
      var els = grid.querySelectorAll(".dl-card__status[data-target]");
      for (var i = 0; i < els.length; i++) {
        var st = els[i];
        var card = st.closest(".dl-card");
        var countEl = card ? card.querySelector(".dl-card__count") : null;
        if (countEl) renderCountdown(st, countEl, Number(st.dataset.target));
      }
    }, 1000);
  }

  /* ------------------------------------------------------------
     DEADLINE DOCK — floating bottom navigator.
     Injected into <body> (outside <main>) so the SPA router's
     innerHTML swap never detaches it, gated to the deadlines
     planet by CSS, and removed the moment the planet changes.
     ------------------------------------------------------------ */
  var DOCK_MARKUP = [
    '<div class="dl-dock__glow" aria-hidden="true"></div>',
    '<div class="dl-dock__shell">',
      '<div class="dl-dock__bar">',
        '<span class="dl-dock__brand" aria-hidden="true"><b>09</b><i>Orbit Index</i></span>',
        '<span class="dl-dock__rule" aria-hidden="true"></span>',
        '<label class="dl-dock__field">',
          '<span class="dl-dock__ico" aria-hidden="true"></span>',
          '<input id="dlSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Search programs, hosts, fields" aria-label="Search programs" />',
          '<kbd class="dl-dock__kbd" aria-hidden="true">/</kbd>',
        '</label>',
        '<div class="dl-dock__meter" aria-live="polite"><b id="dlResults">0</b><span>of <span id="dlTotal">0</span></span></div>',
        '<button type="button" class="dl-dock__applied" id="dlApplied" aria-pressed="false" title="Show only the programs you have applied to">',
          '<span class="dl-dock__tick" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 12.8l4.2 4.2L18.5 7.5"/></svg></span>',
          '<b id="dlAppliedN">0</b><i>applied</i>',
        '</button>',
        '<button type="button" class="dl-dock__wipe" id="dlWipe" aria-label="Clear all applied marks"><span aria-hidden="true">✕</span><em>Sure?</em></button>',
        '<div class="dl-dock__steps">',
          '<button type="button" id="dlPrev" title="Previous program (↑)" aria-label="Previous program">↑</button>',
          '<button type="button" id="dlNext" title="Next program (↓)" aria-label="Next program">↓</button>',
          '<button type="button" id="dlTop" title="Back to index (⌂)" aria-label="Back to top of list">⌂</button>',
        '</div>',
      '</div>',
      '<div class="dl-dock__filters">',
        '<div class="dl-dock__chips" role="group" aria-label="Filter programs">',
          '<span class="dl-dock__pill" id="dlPill" aria-hidden="true"></span>',
          '<button type="button" class="dl-chip is-on" data-filter="all" aria-pressed="true">All</button>',
          '<button type="button" class="dl-chip dl-chip--applied" data-filter="applied" aria-pressed="false">Applied</button>',
          '<button type="button" class="dl-chip" data-filter="ai" aria-pressed="false">AI · CS</button>',
          '<button type="button" class="dl-chip" data-filter="engineering" aria-pressed="false">Engineering</button>',
          '<button type="button" class="dl-chip" data-filter="business" aria-pressed="false">Business</button>',
          '<button type="button" class="dl-chip" data-filter="international" aria-pressed="false">International</button>',
          '<button type="button" class="dl-chip" data-filter="soon" aria-pressed="false">Closing soon</button>',
          '<button type="button" class="dl-chip" data-filter="rolling" aria-pressed="false">Rolling</button>',
        '</div>',
        '<span class="dl-dock__pos" id="dlPos" aria-hidden="true"></span>',
        '<span class="dl-dock__hint" aria-hidden="true">↑ ↓ step · / search · esc clear</span>',
      '</div>',
      '<div class="dl-dock__track" aria-hidden="true"><span id="dlTrackFill"></span></div>',
      '<span class="sr-only" id="dlAnnounce" aria-live="polite"></span>',
    '</div>',
  ].join("");

  var dockIO = null;
  var dockFloatStop = null;

  function removeDeadlineDock() {
    if (dockIO) { dockIO.disconnect(); dockIO = null; }
    if (dockFloatStop) { dockFloatStop(); dockFloatStop = null; }
    dockMarkHook = null;
    var old = document.getElementById("dlDock");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function initDeadlineDock() {
    var grid = document.getElementById("dlGrid");
    removeDeadlineDock();
    if (!grid) return;

    var dock = document.createElement("aside");
    dock.id = "dlDock";
    dock.className = "dl-dock";
    dock.setAttribute("aria-label", "Deadline navigator");
    dock.innerHTML = DOCK_MARKUP;
    document.body.appendChild(dock);

    var search = dock.querySelector("#dlSearch");
    var pill = dock.querySelector("#dlPill");
    var chips = Array.prototype.slice.call(dock.querySelectorAll(".dl-chip"));
    var results = dock.querySelector("#dlResults");
    var total = dock.querySelector("#dlTotal");
    var posOut = dock.querySelector("#dlPos");
    var appliedBtn = dock.querySelector("#dlApplied");
    var appliedN = dock.querySelector("#dlAppliedN");
    var wipe = dock.querySelector("#dlWipe");
    var wipeTimer = 0;
    var empty = document.getElementById("dlEmpty");
    var emptyReset = document.getElementById("dlReset");
    var deck = document.getElementById("deadlines");
    var prev = dock.querySelector("#dlPrev");
    var next = dock.querySelector("#dlNext");
    var top = dock.querySelector("#dlTop");
    var trackFill = dock.querySelector("#dlTrackFill");
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".dl-card"));
    var state = { filter: "all", cursor: -1, shown: cards.length };

    total.textContent = String(cards.length);
    search.placeholder = "Search " + cards.length + " programs, hosts, fields";

    /* ---- category tagging from the card's own search blob ---- */
    var TAGS = [
      ["ai", /ai|computer|software|cyber|data|programming|coding|informatics|algorithm|computing|technology|math|hackathon|robotics/],
      ["engineering", /engineering|aerospace|avionics|mechanical|electrical|hardware|robot|radar|space|manufactur|systems|physics|materials/],
      ["business", /business|entrepreneur|startup|finance|banking|management|economics|leadership|innovation|corporate|venture/],
      ["international", /international|exchange|abroad|global|canada|germany|india|singapore|china|indonesia|europe|egypt|foreign/],
    ];
    cards.forEach(function (card) {
      var text = card.dataset.search || "";
      card.dataset.tags = TAGS.filter(function (t) { return t[1].test(text); })
        .map(function (t) { return t[0]; }).join(" ");
    });

    /* ---- the sliding pill under the active chip ---- */
    function movePill(chip) {
      if (!chip) return;
      var width = chip.offsetWidth, left = chip.offsetLeft;
      pill.classList.add("is-on");
      pill.style.width = width + "px";
      pill.style.transform = "translateX(" + left + "px)";
      /* keep the active chip centred as the strip scrolls at narrow widths */
      var strip = chip.parentNode;
      var target = Math.max(0, left - (strip.clientWidth - width) / 2);
      if (strip.scrollTo) strip.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
      else strip.scrollLeft = target;
    }
    function setFilter(name, chip) {
      state.filter = name;
      state.cursor = -1;
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", String(on));
      });
      movePill(chip);
      refreshApplied();
      apply();
    }

    function matches(card) {
      var query = (search.value || "").trim().toLowerCase();
      if (query && (card.dataset.search || "").indexOf(query) === -1) return false;
      var f = state.filter;
      if (f === "all") return true;
      if (f === "applied") return card.classList.contains("is-applied");
      if (f === "soon") {
        var st = card.querySelector(".dl-card__status");
        return !!st && (st.classList.contains("s-soon") || st.classList.contains("s-upcoming"));
      }
      if (f === "rolling") {
        var s2 = card.querySelector(".dl-card__status");
        return card.dataset.rolling === "true" || (!!s2 && s2.classList.contains("s-open"));
      }
      return (" " + (card.dataset.tags || "") + " ").indexOf(" " + f + " ") !== -1;
    }

    /* ---- result meter counts to its new value instead of snapping ---- */
    function setCount(n) {
      var from = parseInt(results.textContent, 10);
      if (from === n) { results.textContent = String(n); return; }
      if (!canAnime || !isFinite(from)) { results.textContent = String(n); return; }
      var box = { v: from };
      try {
        anime.animate(box, {
          v: n, duration: 520, ease: "out(3)",
          onUpdate: function () {
            var v = Math.round(box.v);
            results.textContent = String(isFinite(v) ? v : n);
          },
          onComplete: function () { results.textContent = String(n); },
        });
      } catch (err) { results.textContent = String(n); return; }
      /* the count must land on the truth even if the frame loop stalls */
      window.setTimeout(function () {
        if (results.textContent !== String(n)) results.textContent = String(n);
      }, 620);
    }

    function apply() {
      var wasShown = state.shown;
      var visible = [];
      cards.forEach(function (card) {
        var wasHidden = card.classList.contains("is-filtered");
        var show = matches(card);
        card.classList.toggle("is-filtered", !show);
        if (show) {
          /* cards returning from a filter lift back in with a short stagger */
          if (wasHidden && canAnime && !reducedMotion) {
            var i = visible.length;
            try {
              anime.animate(card, {
                opacity: [0, 1],
                translateY: [12, 0],
                duration: 460,
                delay: Math.min(i, 12) * 24,
                ease: "out(3)",
              });
            } catch (err) { /* decorative */ }
          }
          visible.push(card);
        }
      });
      state.shown = visible.length;
      setCount(visible.length);
      /* only say it on the way down, so typing never repeats itself */
      if (!visible.length && wasShown) announce(emptyCopy());
      if (empty) {
        empty.hidden = visible.length > 0;
        if (!empty.hidden) {
          var msg = empty.querySelector("[data-empty-copy]");
          if (msg) msg.textContent = emptyCopy();
          /* the escape hatch only earns its place when something is narrowing the list */
          if (emptyReset) emptyReset.hidden = !isNarrowed();
        }
      }
      if (state.cursor >= visible.length) state.cursor = visible.length - 1;
      setPos(state.cursor, visible.length);
      /* an empty deck collapses the grid, so the shell's own visibility rule
         has to be re-checked the instant the filter changes */
      sync();
      return visible;
    }

    function isNarrowed() {
      return state.filter !== "all" || !!(search.value || "").trim();
    }

    /* the empty state has to say which filter emptied the deck */
    function emptyCopy() {
      var query = (search.value || "").trim();
      if (query) return "Nothing matches \u201c" + query + "\u201d. Clear the search, or pick another field.";
      if (state.filter === "applied") return "Nothing marked as applied yet \u2014 tick a program's rail to start your list.";
      if (state.filter === "soon") return "Nothing is closing soon. Try Rolling, or another field.";
      if (state.filter === "rolling") return "Nothing is rolling or open right now. Try Closing soon.";
      return "No programs in this field yet. Pick another filter above, or search the whole deck.";
    }

    /* ---- where you are in the deck, shown only once you start stepping ---- */
    function setPos(index, count) {
      if (!posOut) return;
      if (index < 0 || !count) { posOut.classList.remove("is-on"); return; }
      posOut.innerHTML = "<b>" + pad(index + 1) + "</b> / " + count;
      posOut.classList.add("is-on");
    }

    /* ---- the applied tally: counts what is ticked, and arms the wipe ---- */
    function markedCards() {
      return cards.filter(function (card) { return card.classList.contains("is-applied"); });
    }

    function disarmWipe() {
      if (!wipe) return;
      wipe.classList.remove("is-armed");
      wipe.setAttribute("aria-label", "Clear all applied marks");
    }

    function refreshApplied() {
      var n = markedCards().length;
      dock.classList.toggle("has-marks", n > 0);
      /* collapsed controls must not stay clickable or focusable */
      if (appliedBtn) appliedBtn.disabled = n === 0;
      if (wipe) wipe.disabled = n === 0;
      if (appliedN) {
        var before = appliedN.textContent;
        appliedN.textContent = String(n);
        if (before !== String(n) && canAnime && !reducedMotion) {
          try { anime.animate(appliedN, { scale: [1.45, 1], duration: 440, ease: "out(4)" }); } catch (err) { /* decorative */ }
        }
      }
      if (appliedBtn) {
        var on = state.filter === "applied";
        appliedBtn.classList.toggle("is-on", on);
        appliedBtn.setAttribute("aria-pressed", String(on));
      }
      disarmWipe();
    }

    /* wiping is destructive and one stray click away — so it asks once,
       then defuses itself if you carry on doing something else */
    function clearMarks() {
      var marked = markedCards();
      if (!marked.length) return;
      appliedKeys = [];
      saveMarks();
      /* state first — the tally must never claim marks that are already gone */
      marked.forEach(function (card) { markCard(card, false, false); });
      announce("Cleared all applied marks.");
      refreshApplied();

      /* then the unwind: each row dips and returns in a quick wave */
      if (canAnime && !reducedMotion) {
        marked.forEach(function (card, i) {
          try {
            anime.animate(card, {
              opacity: [1, 0.28], duration: 240, delay: i * 22, ease: "out(3)",
              onComplete: function () {
                try { anime.animate(card, { opacity: [0.28, 1], duration: 400, ease: "out(3)" }); } catch (err) { /* fine */ }
              },
            });
          } catch (err) { /* decorative */ }
        });
      }
      window.setTimeout(apply, 420);
    }

    /* ---- jump: filter → cursor → flash → scroll → open ---- */
    function focusCard(card, count) {
      cards.forEach(function (c) { c.classList.remove("is-nav-target"); });
      void card.offsetWidth;
      card.classList.add("is-nav-target");
      card.style.scrollMarginBottom = "8rem";
      /* Lenis rewrites the scroll position every frame, so a native smooth
         scrollIntoView gets yanked back — hand the jump to Lenis instead. */
      var rect = card.getBoundingClientRect();
      var top = (window.scrollY || window.pageYOffset || 0) + rect.top;
      var centre = Math.max(0, Math.round(top - (window.innerHeight - rect.height) / 2));
      if (lenis && lenis.scrollTo) lenis.scrollTo(centre, { duration: reducedMotion ? 0 : 0.85 });
      else card.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      var head = card.querySelector(".dl-card__head");
      if (head && head.getAttribute("aria-expanded") !== "true") head.click();
      setPos(state.cursor, count);
    }

    function jump(delta) {
      var visible = apply();
      if (!visible.length) return;
      state.cursor = state.cursor < 0
        ? (delta > 0 ? 0 : visible.length - 1)
        : (state.cursor + delta + visible.length) % visible.length;
      focusCard(visible[state.cursor], visible.length);
    }

    function jumpTo(index) {
      var visible = apply();
      if (!visible.length) return;
      state.cursor = Math.max(0, Math.min(visible.length - 1, index));
      focusCard(visible[state.cursor], visible.length);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var name = chip.dataset.filter;
        if (name === state.filter) { setFilter("all", chips[0]); return; }
        setFilter(name, chip);
      });
    });

    /* the tally doubles as the filter switch; the ✕ beside it clears */
    if (appliedBtn) {
      appliedBtn.addEventListener("click", function () {
        if (state.filter === "applied") { setFilter("all", chips[0]); return; }
        setFilter("applied", chips.filter(function (c) { return c.dataset.filter === "applied"; })[0] || chips[0]);
      });
    }
    if (wipe) {
      wipe.addEventListener("click", function () {
        if (!wipe.classList.contains("is-armed")) {
          wipe.classList.add("is-armed");
          wipe.setAttribute("aria-label", "Confirm clearing all applied marks");
          if (wipeTimer) window.clearTimeout(wipeTimer);
          wipeTimer = window.setTimeout(disarmWipe, 3400);
          return;
        }
        if (wipeTimer) window.clearTimeout(wipeTimer);
        clearMarks();
      });
    }

    /* any tick anywhere in the list routes back through here */
    dockMarkHook = function () { refreshApplied(); apply(); };
    search.addEventListener("input", function () { state.cursor = -1; apply(); });
    prev.addEventListener("click", function () { jump(-1); });
    next.addEventListener("click", function () { jump(1); });
    top.addEventListener("click", function () {
      /* an empty grid has no height to scroll to, so aim at the section itself */
      var anchor = state.shown ? grid : (deck || grid);
      if (lenis) lenis.scrollTo(anchor, { offset: -90, duration: 1.1 });
      else anchor.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
    if (emptyReset) {
      emptyReset.addEventListener("click", function () {
        search.value = "";
        setFilter("all", chips[0]);
        var anchor = deck || grid;
        if (lenis) lenis.scrollTo(anchor, { offset: -90, duration: 0.9 });
        else anchor.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      });
    }

    /* ---- keyboard: / focuses, ↑ ↓ step, Esc clears ---- */
    document.addEventListener("keydown", function (event) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      var typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (event.key === "/" && !typing) { event.preventDefault(); search.focus(); return; }
      if (event.key === "Escape" && document.activeElement === search) {
        search.value = ""; state.cursor = -1; apply(); search.blur(); return;
      }
      if (typing) return;
      if (event.key === "ArrowDown" || event.key === "j") { event.preventDefault(); jump(1); }
      else if (event.key === "ArrowUp" || event.key === "k") { event.preventDefault(); jump(-1); }
      else if (event.key === "Home") { event.preventDefault(); jumpTo(0); }
      else if (event.key === "End") { event.preventDefault(); jumpTo(state.shown - 1); }
      else if (event.key === "x") {
        event.preventDefault();
        var pick = document.querySelector(".dl-card.is-nav-target");
        if (!pick) { var shown = apply(); pick = shown.length ? shown[0] : null; }
        var tick = pick ? pick.querySelector(".dl-card__check") : null;
        if (tick) tick.click();
      }
    });

    /* ---- the float: an idle bob plus a nudge from scroll velocity ---- */
    var shell = dock.querySelector(".dl-dock__shell");
    var bob = { y: 0, push: 0, vel: 0, raf: 0, last: 0, y0: window.scrollY || 0, wrote: null, wroteVel: null };
    function bobStep(now) {
      bob.raf = window.requestAnimationFrame(bobStep);
      var t = now || performance.now();
      var dt = bob.last ? Math.min(48, t - bob.last) : 16;
      bob.last = t;
      bob.push *= Math.pow(0.9, dt / 16);
      bob.vel *= Math.pow(0.88, dt / 16);
      var idle = Math.sin(t / 1300) * 3;
      bob.y += (idle + bob.push - bob.y) * Math.min(1, dt / 150);
      var y = Math.round(bob.y * 100) / 100;
      if (y !== bob.wrote) {
        bob.wrote = y;
        shell.style.translate = "0 " + y + "px";
      }
      var vel = Math.round(bob.vel * 100) / 100;
      if (vel !== bob.wroteVel) {
        bob.wroteVel = vel;
        dock.style.setProperty("--vel", String(vel));
      }
    }
    function onFloatScroll() {
      var y = window.scrollY || window.pageYOffset || 0;
      var dy = y - bob.y0;
      bob.y0 = y;
      if (!dy) return;
      bob.push = Math.max(-9, Math.min(15, bob.push - dy * 0.55));
      bob.vel = Math.min(1, bob.vel + Math.abs(dy) / 90);
    }
    window.addEventListener("scroll", onFloatScroll, { passive: true });
    dockFloatStop = function () {
      if (bob.raf) { window.cancelAnimationFrame(bob.raf); bob.raf = 0; }
      window.removeEventListener("scroll", onFloatScroll);
      shell.style.translate = "";
    };

    /* ---- reveal while the list is on screen; tuck away at the footer ---- */
    function setLive(on) {
      dock.classList.toggle("is-live", !!on);
      if (on) {
        if (!reducedMotion && !bob.raf) { bob.last = 0; bob.raf = window.requestAnimationFrame(bobStep); }
        return;
      }
      if (bob.raf) { window.cancelAnimationFrame(bob.raf); bob.raf = 0; }
      shell.style.translate = "";
      dock.style.setProperty("--vel", "0");
    }
    var footer = document.querySelector(".foot");
    var gridSet = false, deckSet = false, footerSet = false;
    /* An empty result collapses the grid to zero height, which is exactly when
       the navigator matters most: it is the only way back out of that filter.
       So while nothing matches, the deck's own section keeps it awake and the
       footer stops tucking it away. */
    function deckEmpty() { return state.shown === 0; }
    function sync() {
      var wanting = deckEmpty();
      var onDeck = gridSet || (wanting && (deckSet || footerSet));
      /* the footer only tucks it away while there is still a list to leave */
      setLive(onDeck && !(footerSet && !wanting));
    }
    if (typeof IntersectionObserver === "function") {
      dockIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.target === grid) gridSet = e.isIntersecting;
          else if (e.target === deck) deckSet = e.isIntersecting;
          else if (e.target === footer) footerSet = e.isIntersecting;
        });
        sync();
      }, { rootMargin: "-15% 0px -20% 0px" });
      dockIO.observe(grid);
      if (deck && deck !== grid) dockIO.observe(deck);
      if (footer) dockIO.observe(footer);
    } else {
      gridSet = true; sync();
    }

    /* ---- progress rail: how far through the deck you are ---- */
    function trackProgress() {
      var rect = grid.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var span = rect.height - vh * 0.5;
      var p = span > 0 ? (vh * 0.35 - rect.top) / span : 0;
      trackFill.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)).toFixed(4) + ")";
    }
    trackProgress();
    if (lenis) lenis.on("scroll", trackProgress);
    window.addEventListener("scroll", trackProgress, { passive: true });
    window.addEventListener("resize", function () { movePill(dock.querySelector(".dl-chip.is-on")); trackProgress(); }, { passive: true });

    /* ---- entrance: the bar assembles itself, then the chips stagger in ---- */
    if (canAnime && !reducedMotion) {
      try {
        anime.animate([
          dock.querySelector(".dl-dock__brand"),
          dock.querySelector(".dl-dock__rule"),
          dock.querySelector(".dl-dock__field"),
          dock.querySelector(".dl-dock__meter"),
          dock.querySelector(".dl-dock__steps"),
        ], {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 640,
          delay: anime.stagger(55, { start: 300 }),
          ease: "out(3)",
        });
        anime.animate(chips, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 620,
          delay: anime.stagger(42, { start: 620 }),
          ease: "out(3)",
        });
      } catch (err) { /* decorative */ }
    }

    requestAnimationFrame(function () { movePill(dock.querySelector(".dl-chip.is-on")); });
    refreshApplied();
    apply();
  }

  /* ------------------------------------------------------------
     LIVE TIMES — any element with data-deadline renders a countdown
     that ticks every second; Operation Liftoff phases mark themselves
     live from their date ranges; the schedule page highlights the
     current CT row and auto-picks school vs summer by the calendar.
     ------------------------------------------------------------ */
  var liveTimer = null;
  var liveDeadlines = [];
  var livePhases = [];
  var schedNowRows = [];
  var lastNowRow = null;

  function parseTarget(v) {
    if (!v) return NaN;
    var t = new Date(v).getTime();
    return isNaN(t) ? NaN : t;
  }

  function cdShort(diff) {
    diff = Math.max(0, diff);
    return pad(Math.floor(diff / 86400000)) + "d " + pad(Math.floor((diff % 86400000) / 3600000)) + "h " + pad(Math.floor((diff % 3600000) / 60000)) + "m";
  }

  function cdLong(diff) {
    diff = Math.max(0, diff);
    return cdShort(diff) + " " + pad(Math.floor((diff % 60000) / 1000)) + "s";
  }

  function ctMinutes() {
    try {
      var parts = new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit" }).split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } catch (e) { return -1; }
  }

  function initScheduleNow() {
    // auto-pick school vs summer by the calendar (summer window Jun 4 – Aug 12)
    var modeSummer = document.getElementById("modeSummer");
    var modeSchool = document.getElementById("modeSchool");
    var n = new Date();
    var mo = n.getMonth() + 1, d = n.getDate();
    var isSummer = (mo === 6 && d >= 4) || mo === 7 || (mo === 8 && d <= 12);
    if (modeSummer && modeSchool && isSummer && !modeSummer.classList.contains("is-on")) {
      modeSummer.click();
    }
    // collect every time row from both tables for the now-highlight
    schedNowRows = [];
    Array.prototype.forEach.call(document.querySelectorAll(".schedule-wrap tbody tr"), function (tr) {
      var td = tr.querySelector("td");
      if (!td) return;
      var m = /^(\d{1,2}):(\d{2})/.exec(td.textContent.trim());
      if (!m) return;
      schedNowRows.push({ tr: tr, mins: parseInt(m[1], 10) * 60 + parseInt(m[2], 10) });
    });
    tickScheduleNow();
  }

  function tickScheduleNow() {
    if (!schedNowRows.length) return;
    var nowMin = ctMinutes();
    if (nowMin < 0) return;
    var current = null;
    for (var i = 0; i < schedNowRows.length; i++) {
      if (schedNowRows[i].mins <= nowMin) current = schedNowRows[i].tr;
    }
    if (current === lastNowRow) return;
    if (lastNowRow) lastNowRow.classList.remove("is-now");
    lastNowRow = current;
    if (current) current.classList.add("is-now");
  }

  function initLiveTimes() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }

    liveDeadlines = Array.prototype.filter.call(
      Array.prototype.map.call(document.querySelectorAll("[data-deadline]"), function (el) {
        return { el: el, target: parseTarget(el.getAttribute("data-deadline")), mode: el.getAttribute("data-mode") || "long" };
      }),
      function (d) { return !isNaN(d.target); }
    );

    livePhases = Array.prototype.filter.call(
      Array.prototype.map.call(document.querySelectorAll(".phase[data-phase-start]"), function (li) {
        var span = document.createElement("span");
        span.className = "live-cd phase-live-cd";
        var dEl = li.querySelector(".phase__d");
        if (dEl) dEl.appendChild(span);
        return {
          li: li,
          start: parseTarget(li.getAttribute("data-phase-start")),
          end: parseTarget(li.getAttribute("data-phase-end")),
          span: span
        };
      }),
      function (p) { return !isNaN(p.start) && !isNaN(p.end); }
    );

    function tick() {
      var now = Date.now();
      liveDeadlines.forEach(function (d) {
        var diff = d.target - now;
        if (diff <= 0) {
          d.el.textContent = "passed";
          d.el.classList.add("is-past");
        } else {
          d.el.textContent = d.mode === "short" ? cdShort(diff) : cdLong(diff);
          d.el.classList.remove("is-past");
        }
      });
      livePhases.forEach(function (p) {
        if (now >= p.start && now <= p.end) {
          p.li.classList.add("phase--live");
          p.span.classList.remove("is-past");
          p.span.textContent = "· " + cdShort(p.end - now) + " left";
        } else if (now > p.end) {
          p.li.classList.remove("phase--live");
          p.span.classList.add("is-past");
          p.span.textContent = "· ended";
        } else {
          p.li.classList.remove("phase--live");
          p.span.classList.remove("is-past");
          p.span.textContent = "· in " + cdShort(p.start - now);
        }
      });
      tickScheduleNow();
    }
    tick();
    liveTimer = setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------
     GSAP ORCHESTRA — ScrollTrigger reveals, hero SplitText,
     velocity-reactive marquee, 3D tilt cards.
     Augments the anime.js orchestra; GSAP handles scroll-driven
     effects while anime.js keeps springs, scramble, and motion paths.
     ------------------------------------------------------------ */
  var gsapAnims = [];
  var gsapSplits = [];

  function keepGsap(a) { if (a) gsapAnims.push(a); return a; }

  function revertGsapAnims() {
    gsapAnims.forEach(function (a) {
      try {
        if (a.kill) a.kill();
        else if (a.revert) a.revert();
      } catch (err) { /* already gone */ }
    });
    gsapAnims = [];
    gsapSplits.forEach(function (s) {
      try { if (s.revert) s.revert(); } catch (err) {}
    });
    gsapSplits = [];
    /* Clear the decrypting lock so new page's hero can use decryptText */
    var heroName = document.querySelector(".hero__name");
    if (heroName) heroName.__decrypting = false;
  }

  /* ---- lightweight vanilla SplitText (no plugin needed) ---- */
  function splitText(el, type) {
    if (!el) return { chars: [], words: [], lines: [], revert: function () {} };
    var original = el.innerHTML;
    var text = el.textContent;
    var result = { chars: [], words: [], lines: [], revert: function () { el.innerHTML = original; } };
    if (!type) type = "chars";

    if (type === "chars" || type === "both") {
      el.innerHTML = "";
      text.split("").forEach(function (c) {
        var span = document.createElement("span");
        span.className = "split-char";
        span.style.display = "inline-block";
        if (c === " ") { span.innerHTML = "&nbsp;"; span.style.width = "0.3em"; }
        else span.textContent = c;
        el.appendChild(span);
        result.chars.push(span);
      });
    } else if (type === "words") {
      el.innerHTML = "";
      text.split(/\s+/).forEach(function (w, i) {
        if (i > 0) {
          var space = document.createElement("span");
          space.innerHTML = "&nbsp;";
          space.style.display = "inline-block";
          el.appendChild(space);
        }
        var span = document.createElement("span");
        span.className = "split-word";
        span.style.display = "inline-block";
        span.textContent = w;
        el.appendChild(span);
        result.words.push(span);
      });
    }
    return result;
  }

  /* ---- GSAP hero entrance — per-character BENJAMIN WU ---- */
  function initGsapHero() {
    if (!canGsap) return;
    var heroName = document.querySelector(".hero__name");
    if (!heroName) return;

    /* Mark hero name so decryptText() (in initReveals IO callback) won't
       set el.textContent and destroy the split-char spans we create below.
       decryptText checks el.__decrypting at the top. */
    heroName.__decrypting = true;

    /* The CSS .reveal system already controls opacity + blur transitions.
       GSAP should ONLY drive supplementary transforms (y, rotateX, scale)
       and the per-character split — never opacity or filter, which would
       create inline styles that override the CSS class-based reveals. */

    var l1 = heroName.querySelector(".hero__l1");
    var l2 = heroName.querySelector(".hero__l2");

    if (l1) {
      var split1 = splitText(l1, "chars");
      gsapSplits.push(split1);
      keepGsap(gsap.from(split1.chars, {
        y: 60,
        rotateX: -90,
        stagger: 0.04,
        duration: 0.9,
        ease: "back.out(1.7)",
        delay: 0.2,
      }));
    }

    if (l2) {
      /* preserve the asterisk sup */
      var ast = l2.querySelector(".hero__ast");
      var mainText = l2.childNodes[0];
      if (mainText && mainText.nodeType === 3) {
        var wrapper = document.createElement("span");
        wrapper.className = "hero__l2-text";
        wrapper.textContent = mainText.textContent;
        l2.replaceChild(wrapper, mainText);
        var split2 = splitText(wrapper, "chars");
        gsapSplits.push(split2);
        keepGsap(gsap.from(split2.chars, {
          y: 80,
          rotateX: -90,
          stagger: 0.05,
          duration: 1,
          ease: "back.out(1.7)",
          delay: 0.55,
        }));
      }
    }

    /* subtitle, stats, tags — only add y/scale motion.
       DO NOT set opacity or filter here; the CSS .reveal.is-in
       transition already handles those on the parent .hero__meta.reveal */
    var sub = document.querySelector(".hero__sub");
    if (sub) {
      keepGsap(gsap.from(sub, {
        y: 30,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.9,
      }));
    }

    var stats = document.querySelectorAll(".hero__stat");
    if (stats.length) {
      keepGsap(gsap.from(stats, {
        y: 20,
        stagger: 0.08,
        duration: 0.7,
        ease: "power2.out",
        delay: 1.1,
      }));
    }

    var tags = document.querySelectorAll(".hero__tags span");
    if (tags.length) {
      keepGsap(gsap.from(tags, {
        scale: 0.8,
        stagger: 0.06,
        duration: 0.5,
        ease: "back.out(2)",
        delay: 1.3,
      }));
    }
  }

  /* ---- ScrollTrigger-powered section reveals ---- */
  function initGsapScrollReveals() {
    if (!canGsap) return;
    /* Augment the IntersectionObserver reveals with GSAP-powered
       section header animations that scrub with scroll position */
    var secHeads = document.querySelectorAll(".sec__head");
    secHeads.forEach(function (head) {
      /* sec__head lives inside .reveal — CSS handles opacity/blur.
         GSAP only adds a supplementary y-slide on scroll. */
      keepGsap(gsap.from(head, {
        y: 50,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: head,
          start: "top 85%",
          end: "top 50%",
          toggleActions: "play none none reverse",
        },
      }));
    });

    /* parallax drift on the system map while scrolling */
    var sysMap = document.querySelector(".sys");
    if (sysMap) {
      keepGsap(gsap.to(sysMap, {
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: ".sys-sec",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      }));
    }

    /* manifesto quote — inside .reveal, so CSS handles opacity */
    var manifesto = document.querySelector(".manifesto");
    if (manifesto) {
      keepGsap(gsap.from(manifesto, {
        scale: 0.95,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: manifesto,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      }));
    }

    /* giant footer text scrub */
    var footGiant = document.querySelector(".foot__giant");
    if (footGiant) {
      keepGsap(gsap.fromTo(footGiant,
        { x: "5%" },
        {
          x: "-10%",
          ease: "none",
          scrollTrigger: {
            trigger: ".foot",
            start: "top bottom",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      ));
    }
  }

  /* ---- velocity-reactive marquee ---- */
  function initGsapMarquee() {
    if (!canGsap) return;
    var track = document.querySelector(".marquee__track");
    if (!track) return;

    var baseSpeed = 1;
    var velocityFactor = { v: baseSpeed };

    keepGsap(gsap.to(track, {
      xPercent: -50,
      repeat: -1,
      duration: 30,
      ease: "none",
      modifiers: {
        xPercent: function (x) {
          return (parseFloat(x) * velocityFactor.v) % -50;
        },
      },
    }));

    /* speed up on scroll, decay back to base */
    if (lenis) {
      lenis.on("scroll", function (e) {
        var v = Math.abs(e.velocity);
        velocityFactor.v = baseSpeed + v * 0.004;
      });
      /* decay back */
      gsap.ticker.add(function () {
        velocityFactor.v += (baseSpeed - velocityFactor.v) * 0.05;
      });
    }
  }

  /* ---- 3D tilt cards (React Bits TiltedCard, vanilla) ---- */
  function initTiltCards() {
    if (!canGsap || !finePointer) return;
    var cards = document.querySelectorAll(".sys__dock-btn, .uni, .kpi, .dl-card");

    cards.forEach(function (card) {
      card.style.transformStyle = "preserve-3d";
      card.style.transition = "transform 0.15s ease-out";

      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 12,
          rotateX: -y * 8,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      card.addEventListener("mouseleave", function () {
        gsap.to(card, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.5)",
          overwrite: "auto",
        });
      });
    });
  }

  /* ---- spotlight cursor glow on section cards ---- */
  function initSpotlightCards() {
    if (!canGsap || !finePointer) return;
    var cards = document.querySelectorAll(".sys__dock-btn, .card, .uni, .kpi");

    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty("--spot-x", x + "px");
        card.style.setProperty("--spot-y", y + "px");
        card.classList.add("has-spotlight");
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("has-spotlight");
      });
    });
  }

  /* ---- master GSAP initializer (called alongside anime orchestra) ---- */
  function initGsapAnims() {
    if (!canGsap) return;
    revertGsapAnims();
    var fns = [initGsapHero, initGsapScrollReveals, initGsapMarquee, initTiltCards, initSpotlightCards];
    fns.forEach(function (fn) {
      try { fn(); } catch (err) { /* decorative — never break the page */ }
    });
  }

  function initPageFeatures() {
    initParallax();
    updateParallax();
    initReveals();
    initBackgroundBlur();
    initHoustonClock();
    initDockSync();
    initScheduleToggle();
    initTrainingToggle();
    initDeadlines();
    initScheduleNow();
    initLiveTimes();
    initPageAnims();
    initGsapAnims();
  }

  /* ------------------------------------------------------------
     ANIME ORCHESTRA — anime.js v4, wired in everywhere.

     1. MAGNETIC CTA   — anime.utils.damp pulls the button toward the
                         cursor; a spring blooms its shadow.
     2. STAT COUNTERS  — anime.animate + onUpdate count hero numbers up.
     3. SCROLL SCRUB   — paused createTimeline for the hero, the system
                         map and the giant footer type, linked to a
                         ScrollObserver (onScroll + link), so scroll
                         position scrubs the motion directly.
     4. MOTION-PATH COMET — svg.createMotionPath rides the ellipse in
                         the system map forever.
     5. SCRAMBLE LINKS — scrambleText modifier for every nav / CTA /
                         footer link hover (delegated once).

     1–4 are bound to page DOM, so initPageAnims() rebuilds them after
     every SPA swap and reverts the previous page's animations and
     scroll observers first — nothing keeps ticking against detached
     nodes. Each feature is individually guarded.
     ------------------------------------------------------------ */
  var canAnime = !!(window.anime && !reducedMotion);
  var canGsap = !!(window.gsap && !reducedMotion);
  if (canGsap) { gsap.registerPlugin(ScrollTrigger); }
  var pageAnims = [];
  var statIO = null;

  function keepAnim(a) {
    if (a) pageAnims.push(a);
    return a;
  }

  function revertPageAnims() {
    pageAnims.forEach(function (a) {
      try { if (typeof a.revert === "function") a.revert(); } catch (err) { /* already gone */ }
    });
    pageAnims = [];
    if (statIO) { statIO.disconnect(); statIO = null; }
    revertGsapAnims();
  }

  function initMagneticCta() {
    if (!finePointer) return;
    Array.prototype.forEach.call(document.querySelectorAll(".cta"), function (cta) {
      var curX = 0, curY = 0, tx = 0, ty = 0, magnetOn = false, rafId = 0, lastT = 0;
      function magnetLoop() {
        var now = performance.now();
        var dt = Math.min(50, now - (lastT || now));
        lastT = now;
        curX = anime.utils.damp(curX, tx, 15, dt);
        curY = anime.utils.damp(curY, ty, 15, dt);
        if (Math.abs(curX - tx) > 0.05 || Math.abs(curY - ty) > 0.05 || magnetOn) {
          cta.style.transform = "translate(" + curX.toFixed(2) + "px," + curY.toFixed(2) + "px)";
          rafId = requestAnimationFrame(magnetLoop);
        } else {
          rafId = 0;
          lastT = 0;
          cta.style.transform = "";
        }
      }
      /* shadow offset rides a spring on a plain number, so an interrupted
         hover picks up from wherever the shadow currently is */
      var shadow = { o: 8 };
      function shadowTo(o) {
        try {
          anime.animate(shadow, {
            o: o,
            ease: anime.spring({ stiffness: 160, damping: 14 }),
            onUpdate: function () {
              cta.style.boxShadow = shadow.o.toFixed(2) + "px " + shadow.o.toFixed(2) + "px 0 var(--text)";
            },
            onComplete: function () { if (o === 8) cta.style.boxShadow = ""; },
          });
        } catch (err) { /* shadow spring is decorative */ }
      }
      cta.addEventListener("mouseenter", function () { shadowTo(14); });
      cta.addEventListener("mousemove", function (e) {
        var r = cta.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var reach = Math.max(r.width, r.height) * 0.9;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        magnetOn = true;
        if (dist > reach) { tx = 0; ty = 0; return; }
        var pull = 1 - dist / reach;
        tx = dx * 0.22 * pull;
        ty = dy * 0.22 * pull;
        if (!rafId) magnetLoop();
      });
      cta.addEventListener("mouseleave", function () {
        magnetOn = false; tx = 0; ty = 0;
        if (!rafId) magnetLoop();
        shadowTo(8);
      });
    });
  }

  function initStatCounters() {
    var stats = Array.prototype.filter.call(document.querySelectorAll(".hero__stats b"), function (b) {
      return b.id !== "houstonClock" && /^\d+(\.\d+)?$/.test((b.textContent || "").trim());
    }).map(function (b) {
      var txt = b.textContent.trim();
      var dot = txt.indexOf(".");
      var target = parseFloat(txt);
      var frac = dot > -1 ? txt.length - dot - 1 : 0;
      /* a year counts up from a couple of decades back, not from zero */
      var from = !frac && target >= 1900 && target <= 2100 ? target - 24 : 0;
      return { el: b, target: target, frac: frac, from: from };
    });
    if (!stats.length) return;

    function fmt(d, v) { return d.frac ? v.toFixed(d.frac) : String(Math.round(v)); }
    function countUp(d) {
      var counter = { v: d.from };
      d.el.textContent = fmt(d, d.from);
      try {
        keepAnim(anime.animate(counter, {
          v: d.target,
          duration: 1500,
          delay: 120,
          ease: "outExpo",
          onUpdate: function () { d.el.textContent = fmt(d, counter.v); },
          onComplete: function () { d.el.textContent = fmt(d, d.target); },
        }));
      } catch (err) { /* fall through to the safety net */ }
      /* safety — a stalled engine must never leave a wrong number on screen */
      setTimeout(function () {
        if (d.el.isConnected && d.el.textContent !== fmt(d, d.target)) d.el.textContent = fmt(d, d.target);
      }, 2400);
    }
    if ("IntersectionObserver" in window) {
      statIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var d = stats.filter(function (s) { return s.el === en.target; })[0];
          if (!d) return;
          statIO.unobserve(en.target);
          countUp(d);
        });
      }, { threshold: 0.5 });
      stats.forEach(function (d) { statIO.observe(d.el); });
    } else {
      stats.forEach(countUp);
    }
  }

  function scrubTimeline(sel, addMotion, thresholds) {
    var target = document.querySelector(sel);
    if (!target) return;
    var tl = anime.createTimeline({ autoplay: false, defaults: { ease: "linear", duration: 1000 } });
    if (!addMotion(tl, target)) return;
    var params = { target: target, sync: true };
    if (thresholds) { params.enter = thresholds[0]; params.leave = thresholds[1]; }
    keepAnim(tl);
    keepAnim(anime.onScroll(params).link(tl));
  }

  function initScrubs() {
    /* hero content drifts down + dims as the first screen scrolls away —
       thresholds are "<container> <target>": from the hero's top at the
       viewport top until the hero's bottom reaches the viewport top */
    scrubTimeline(".hero", function (tl, hero) {
      var inner = hero.querySelector(".hero__inner");
      if (!inner) return false;
      tl.add(inner, { translateY: [0, 70], opacity: [1, 0] }, 0);
      return true;
    }, ["start start", "start end"]);
    /* the system map tilts + rises as it crosses the screen */
    scrubTimeline(".sys-sec", function (tl, sec) {
      var sys = sec.querySelector(".sys");
      if (!sys) return false;
      tl.add(sys, { translateY: [0, -34], rotate: [0, 2.4] }, 0);
      return true;
    });
    /* the giant footer type slides as the footer crosses the screen */
    scrubTimeline(".foot", function (tl, foot) {
      var giant = foot.querySelector(".foot__giant");
      if (!giant) return false;
      tl.add(giant, { translateX: ["0%", "-7%"], rotate: [0, 1.4] }, 0);
      return true;
    });
  }

  function initComet() {
    var sysMap = document.querySelector(".sys");
    if (!sysMap || !anime.svg || !anime.svg.createMotionPath) return;
    var SVGNS = "http://www.w3.org/2000/svg";
    var orbitSvg = document.createElementNS(SVGNS, "svg");
    orbitSvg.setAttribute("viewBox", "0 0 100 100");
    orbitSvg.setAttribute("class", "sys__orbitpath");
    orbitSvg.setAttribute("aria-hidden", "true");
    var orbitPath = document.createElementNS(SVGNS, "path");
    orbitPath.setAttribute("d", "M50,50 m-47,0 a47,31 0 1,1 94,0 a47,31 0 1,1 -94,0");
    orbitPath.setAttribute("fill", "none");
    orbitSvg.appendChild(orbitPath);
    sysMap.appendChild(orbitSvg);
    var comet = document.createElement("div");
    comet.className = "sys__comet";
    comet.setAttribute("aria-hidden", "true");
    sysMap.appendChild(comet);
    var mp = anime.svg.createMotionPath(orbitPath);
    keepAnim(anime.animate(comet, {
      translateX: mp.translateX,
      translateY: mp.translateY,
      rotate: mp.rotate,
      duration: 16000,
      loop: true,
      ease: "linear",
    }));
  }

  function initPageAnims() {
    if (!canAnime) return;
    revertPageAnims();
    [initMagneticCta, initStatCounters, initScrubs, initComet].forEach(function (fn) {
      try { fn(); } catch (err) { /* decorative — one failure never takes the page down */ }
    });
  }

  initPageFeatures();

  /* ---- scramble links — delegated once, survives SPA swaps ---- */
  if (canAnime) {
    var scrambleBusy = new WeakMap();
    var scrambleIn = function (el) {
      if (scrambleBusy.get(el)) return;
      var original = (el.textContent || "").trim();
      if (!original) return;
      scrambleBusy.set(el, true);
      try {
        anime.animate(el, {
          text: { value: original, modifier: anime.scrambleText({ duration: 640, revealDelay: 60 }) },
          duration: 640,
          ease: "linear",
        });
      } catch (err) { /* text property unsupported here — hover stays plain */ }
      setTimeout(function () { scrambleBusy.set(el, false); }, 780);
    };
    document.addEventListener("mouseover", function (e) {
      var a = e.target && e.target.closest ? e.target.closest(".nav__links a, .nav__brand, .cta__large, .foot__sol a") : null;
      if (a) scrambleIn(a);
    });
  }
})();
