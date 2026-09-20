import { additionalWorks } from './other-work.ts';
export interface Project {
  slug: string; featured: boolean; name: string; number: string; year: string;
  type: string; description: string; menuDescription?: string; image: string; cover?: string; gallery?: string;
  role: string; tools: string; intro: string; story: string; approach?: string; detail?: string;
  outcomes: { value: string; label: string }[];
  category?: string; organization?: string; brief?: boolean; coverAlt?: string; galleryAlt?: string;
  note?: string;
}
const coreProjects: Project[] = [
  {
    "slug": "dreamin-engine",
    "menuDescription": "Create a game through conversation.",
    "featured": true,
    "name": "DreamIn Engine",
    "number": "01",
    "year": "2023",
    "type": "AI · Creative tools",
    "description": "A conversational game engine for creators without a programming background.",
    "image": "v2c",
    "cover": "proj3",
    "gallery": "i3-6",
    "role": "Team lead · product & AI",
    "tools": "Unity, generative AI, cloud infrastructure",
    "intro": "From a game idea to something you can play.",
    "story": "DreamIn Engine lets creators turn an idea into a playable game without learning a traditional game engine. I led product design and AI development, from the creation experience to the community around it.",
    "approach": "We tested demand with a small Gather Town prototype before building the engine. Creator interviews shaped a conversational flow: an AI copilot asks questions, develops the idea, and generates the game.",
    "detail": "Sharing was part of the product from the start. We connected the website to Discord and gave every game its own link, so creators could publish their work and find players in the same flow.",
    "outcomes": [
      {
        "value": "3,000+",
        "label": "beta users"
      },
      {
        "value": "3,200+",
        "label": "games created"
      },
      {
        "value": "200,000+",
        "label": "gameplay sessions"
      }
    ]
  },
  {
    "slug": "echo-of-mobius",
    "menuDescription": "Create AI characters. Play their stories.",
    "featured": true,
    "name": "Echo of Mobius",
    "number": "02",
    "year": "2024",
    "type": "AI · Game design",
    "description": "A launched RPG where players create AI characters and shape their stories.",
    "image": "v1c",
    "cover": "proj1",
    "gallery": "i1-6",
    "role": "Team lead · game design, engineering & AI",
    "tools": "Unity, generative AI, Blender",
    "intro": "AI characters with a world to inhabit.",
    "story": "Echo of Mobius turns player-created AI characters into a role-playing game. I led the team from a Discord prototype to launch, working across game design, engineering, and AI.",
    "approach": "We tested character creation and text adventures in Discord before committing to a full game. Turn-based combat and illustrated storytelling gave players room to create while keeping production manageable.",
    "detail": "I built character-generation tools and worked on memory and 3D scenes, connecting AI characters to the choices players made. Community creations and streamer collaborations helped bring the game to new players.",
    "outcomes": [
      {
        "value": "4,000+",
        "label": "players"
      },
      {
        "value": "300+",
        "label": "paying players"
      },
      {
        "value": "26%",
        "label": "week-two retention"
      }
    ]
  },
  {
    "slug": "undecimber",
    "menuDescription": "A clothing brand, from concept to market.",
    "featured": true,
    "name": "Undecimber",
    "number": "03",
    "year": "2021",
    "type": "Art · Fashion",
    "description": "A clothing brand built around the events of 2020, taken from concept through production and launch.",
    "image": "v5c",
    "cover": "proj5",
    "gallery": "i5-5",
    "role": "Team lead · product & marketing",
    "tools": "CLO 3D, Adobe tools, sustainable materials",
    "intro": "Build the collection. Bring it to market.",
    "story": "Undecimber translated the events of 2020 into a clothing collection. I led product design and marketing, working with suppliers to turn the concept into products we could sell.",
    "approach": "We designed for artists and performers who would wear bold, expressive pieces. Rainbow-reflective fabric became the signature: dark in everyday light, colorful under direct illumination.",
    "detail": "The work extended beyond the designs: sourcing materials, adapting prototypes to production constraints, and building a launch around artist collaborations. All profits went to COVID-19 relief organizations.",
    "outcomes": [
      {
        "value": "$30,000+",
        "label": "revenue"
      },
      {
        "value": "100+",
        "label": "artists & celebrities wore the collection"
      },
      {
        "value": "100%",
        "label": "of profits donated to COVID-19 relief"
      }
    ]
  },
  {
    "slug": "notion-ai-meeting-notes",
    "menuDescription": "Bring recordings and meeting history into Notion.",
    "featured": true,
    "name": "Notion AI Meeting Notes",
    "number": "04",
    "year": "2026",
    "type": "AI · Productivity",
    "image": "notion-audio-upload",
    "cover": "notion-audio-upload",
    "coverAlt": "Notion AI Meeting Notes: Upload your own audio",
    "gallery": "notion-meeting-library",
    "galleryAlt": "Meeting notes organized together in a Notion workspace — official product screenshot",
    "role": "Software engineering intern · AI Meeting Notes",
    "tools": "Full-stack development, AI, integrations",
    "description": "Bringing recordings and existing meeting history into Notion.",
    "intro": "Your recordings, part of your workspace.",
    "story": "I built Bring Your Own File during my Notion internship, turning existing audio and video recordings into searchable transcripts and summaries. It extended AI Meeting Notes to conversations recorded outside Notion.",
    "approach": "The work covered audio and video uploads, playback, and API support for bringing in recordings from other tools. I worked across the product experience and the systems behind it.",
    "detail": "I also worked on Granola migration, so users could bring their meeting history with them. Uploads and migration addressed the same problem: useful context was scattered across tools.",
    "outcomes": [
      {
        "value": "~20,000",
        "label": "pre-recorded meetings processed at internship presentation"
      },
      {
        "value": "Audio + video",
        "label": "file uploads shipped to production"
      },
      {
        "value": "Public API",
        "label": "meeting-note creation shipped"
      }
    ]
  },
  {
    "slug": "sixth",
    "menuDescription": "A wearable designed to work off-grid.",
    "featured": true,
    "name": "SIXTH",
    "number": "05",
    "year": "2026",
    "type": "AI · Wearable systems",
    "image": "sixth-complete",
    "cover": "sixth-complete",
    "coverAlt": "Complete SIXTH wearable concept shown in an exploded view with its textile layers, sensors, and electronics",
    "gallery": "sixth-personalization",
    "galleryAlt": "SIXTH companion app concept: pairing the wearable, establishing a personal baseline, and preparing for offline use",
    "role": "AI architecture & offline decision logic",
    "tools": "Time-series models, LLMs, personalized heuristics, ESP32",
    "description": "A wearable prototype that uses connected learning to support personalized feedback offline.",
    "intro": "Personalized feedback, beyond Wi-Fi.",
    "story": "SIXTH is a wearable prototype for female athletes in cold, high-altitude environments. Fabric sensors monitor the body and trigger physical feedback. I designed the AI decision system around a central constraint: connectivity could disappear.",
    "approach": "While connected, the system learns a personal baseline and translates it into lightweight rules. The wearable stores those rules locally before an expedition.",
    "detail": "In Extreme Mode, it uses those rules to interpret sensor readings and trigger feedback without a cloud request. Keeping learning online and decisions on the device makes the system less dependent on a reliable connection.",
    "outcomes": [
      {
        "value": "4",
        "label": "sensing modalities in the prototype"
      },
      {
        "value": "Personalized",
        "label": "rules derived from connected learning"
      },
      {
        "value": "Offline",
        "label": "local decisions in Extreme Mode"
      }
    ],
    "note": "Research prototype with Xixi Li, Izzy Shen, and Alfred Wong; extreme-environment field validation remains future work."
  },
  {
    "slug": "relicvr",
    "menuDescription": "Cultural heritage in VR.",
    "featured": false,
    "category": "New interfaces",
    "name": "RelicVR",
    "number": "05",
    "year": "2023",
    "type": "VR · Cultural heritage",
    "description": "An interactive VR experience built from archaeological scan data.",
    "image": "v3c",
    "cover": "proj4",
    "gallery": "i4-6",
    "role": "Product design, software development & UI/UX",
    "tools": "Unity VR, CloudCompare, Blender",
    "intro": "Archaeological scans you can step inside.",
    "story": "I turned archaeological scan data into a VR experience, taking historical sites from raw point clouds to explorable environments.",
    "approach": "I used open archaeological datasets and processed the scans into models suitable for real-time VR.",
    "detail": "I processed the scans in CloudCompare and Blender, then built the experience in Unity with controller and hand-gesture navigation.",
    "outcomes": []
  },
  {
    "slug": "orpheus",
    "menuDescription": "An AI interface driven by EEG signals.",
    "featured": false,
    "category": "New interfaces",
    "name": "Orpheus",
    "number": "06",
    "year": "2024",
    "type": "AI · Human interfaces",
    "description": "An experimental AI interface combining EEG signals and real-time visuals.",
    "image": "v4c",
    "cover": "proj2",
    "gallery": "i2-6",
    "role": "Product design, BCI development, AI & UI/UX",
    "tools": "EEG hardware, Three.js, generative AI",
    "intro": "An interface that responds to brainwaves.",
    "story": "I built an experimental interface combining a Muse 2 EEG headset, real-time visuals, and an AI conversation. The prototype explored how brainwave signals could become another input to an interface.",
    "approach": "I began by collecting and visualizing signals from a Muse 2 headset, then worked on filtering noise and translating the data into a changing particle system.",
    "detail": "I worked on signal collection, noise filtering, and a particle system that responds to the data. Orpheus is an interaction prototype, not a clinical tool.",
    "outcomes": []
  }
];

export const projects: Project[] = [...coreProjects, ...additionalWorks.map(work => ({
  ...work, name: work.organization, featured: false, brief: true, number: '', intro: work.name,
  cover: work.image, coverAlt: `${work.name} — ${work.organization}`,
  role: work.type, story: work.description, outcomes: [],
}))];

export const featuredProjects = projects.filter(project => project.featured);
export const otherProjects = projects.filter(project => !project.featured);
