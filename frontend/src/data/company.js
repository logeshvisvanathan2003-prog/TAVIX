// Edit this file to change company facts, products and open roles. After editing, rebuild the frontend.
// Also tell Tavix AI about changes: Admin > Teach Tavix AI.
export const COMPANY = { name: "TAVIX", legal: "TavixAI Technologies Solution Private Limited", motto: "Innovation with Honour", email: "logesh@tavix.in" };

export const PRODUCTS = [
  { id: "one", name: "ONE TAVIX AI", status: "Live", url: "https://one.tavixai.in", external: true,
    tag: "Learn · Play · Build",
    blurb: "A gamified platform where you describe a real problem and get a complete project, then learn it level by level.",
    points: ["Kingdom: quests, XP and badges", "Endless Tower: adaptive question floors", "Build Track: your project, level by level", "Studio: change your project by chatting"] },
];

export const ROLES = [
  { id: "fullstack", title: "Full-Stack Developer", type: "Full-time · Internship", skills: ["React", "FastAPI", "PostgreSQL"], blurb: "Build product features end to end, from screen to database." },
  { id: "aiml", title: "AI & ML Engineer", type: "Full-time · Internship", skills: ["Python", "PyTorch", "Model serving"], blurb: "Train, evaluate and serve the models behind our products." },
  { id: "embedded", title: "Embedded & IoT Engineer", type: "Full-time", skills: ["C++", "ESP32", "MQTT"], blurb: "Pair sensors and controllers with the software that makes them useful." },
  { id: "qa", title: "QA & Test Automation Engineer", type: "Full-time · Internship", skills: ["Playwright", "pytest", "API testing"], blurb: "Make sure what we ship works, and keeps working." },
  { id: "chain", title: "Blockchain Developer", type: "Full-time", skills: ["Solidity", "Web3", "Security"], blurb: "Tamper-proof records and smart contracts for real industries." },
  { id: "design", title: "UI/UX & Motion Designer", type: "Full-time · Internship", skills: ["Figma", "Motion", "Design systems"], blurb: "Shape how learners and clients feel when they use TAVIX." },
  { id: "intern", title: "Technical Content & Community Intern", type: "Internship", skills: ["Writing", "Teaching", "Social"], blurb: "Explain what we build and grow the ONE TAVIX AI community." },
];

export const HIRING = [
  ["Apply", "Send your profile with a GitHub, portfolio or project link."],
  ["Portfolio review", "The team reads what you built, not just where you studied."],
  ["Practical challenge", "A small real mission, so we see how you think and build."],
  ["Technical conversation", "We talk through your solution and your choices."],
  ["Founder round", "Meet the founder, agree the role and start onboarding."],
];

export const LIFE = [
  ["Real problems", "You work on products people use, from your first weeks."],
  ["Open progress", "We say what is done and what is not. No hiding."],
  ["Learn by building", "Growth comes from shipping, reviewing and improving."],
  ["Direct access", "A small team where ideas reach the founder quickly."],
];
