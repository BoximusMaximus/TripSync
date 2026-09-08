import {
  aboutPageClass,
  aboutHeaderClass,
  aboutTitleClass,
  aboutSubtitleClass,
  aboutPurposeClass,
  aboutGridClass,
  aboutMemberCardClass,
  aboutAvatarClass,
  aboutMemberNameClass,
  aboutMemberRoleClass,
} from "./styles/tailwindStyles";

// Team 2 roster, per resources/README.md — no bios beyond what's documented.
const TEAM_MEMBERS = [
  { name: "Cody", role: "Back End · Project Manager" },
  { name: "Dom", role: "Back End · Project Manager" },
  { name: "Kaylee", role: "Back End · AWS / CI-CD" },
  { name: "Mohamed", role: "Front End · AWS / CI-CD" },
  { name: "Simon", role: "Front End" },
  { name: "Abdel", role: "Front End · QA/QC" },
];

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const AboutPage = () => (
  <div className={aboutPageClass}>
    <header className={aboutHeaderClass}>
      <h1 className={aboutTitleClass}>Team 2</h1>

      <p className={aboutSubtitleClass}>
        Code Platoon · Dakota cohort — the humans behind TripSync
      </p>
    </header>

    <p className={aboutPurposeClass}>
      TripSync helps groups coordinate destinations and activities by
      allowing members to collaboratively plan and vote.
    </p>

    <ul className={aboutGridClass}>
      {TEAM_MEMBERS.map((member) => (
        <li key={member.name} className={aboutMemberCardClass}>
          <span className={aboutAvatarClass} aria-hidden="true">
            {getInitials(member.name)}
          </span>

          <span className={aboutMemberNameClass}>{member.name}</span>
          <span className={aboutMemberRoleClass}>{member.role}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default AboutPage;
