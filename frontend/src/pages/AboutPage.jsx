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

import { FaGithub, FaLinkedin } from "react-icons/fa";

const TEAM_MEMBERS = [
  {
    name: "Cody",
    role: "Back End · Project Manager",
    image: "/images/cody.jpg",
    github: "https://github.com/BoximusMaximus",
    linkedin: "https://www.linkedin.com/in/christaphorbox/",
  },
  {
    name: "Dom",
    role: "Back End",
    image: "/images/dom.jpg",
    github: "https://github.com/maunahaole",
    linkedin: "https://www.linkedin.com/in/dombhi/",
  },
  {
    name: "Kaylee",
    role: "Back End · AWS / CI-CD",
    image: "/images/kaylee.jpg",
    github: "https://github.com/kayle-ervin1510",
    linkedin:
      "https://www.linkedin.com/in/jayme-ervin-646636419/",
  },
  {
    name: "Mohamed",
    role: "Front End · AWS / CI-CD",
    image: "/images/mohamed.jpg",
    github: "https://github.com/gadm12",
    linkedin: "https://www.linkedin.com/in/gadm12/",
  },
  {
    name: "Simon",
    role: "Front End",
    image: "/images/simon.jpg",
    github: "https://github.com/SimonGBaum",
    linkedin:
      "https://www.linkedin.com/in/simon-g-baum-11b3p5wf7/",
  },
  {
    name: "Abdel",
    role: "Front End · QA/QC",
    image: "/images/abdel.jpg",
    github: "https://github.com/AbdelrahmanSandresy",
    linkedin:
      "https://www.linkedin.com/in/abdelrahman-s-482b8a10a/",
  },
];

const AboutPage = () => (
  <div className={aboutPageClass}>
    <header className={aboutHeaderClass}>
      <h1 className={aboutTitleClass}>Team 2</h1>

      <p className={aboutSubtitleClass}>
        Code Platoon · Dakota cohort — the humans behind
        TripSync
      </p>
    </header>

    <p className={aboutPurposeClass}>
      TripSync helps groups coordinate destinations and
      activities by allowing members to collaboratively plan
      and vote.
    </p>

    <ul className={aboutGridClass}>
      {TEAM_MEMBERS.map((member) => (
        <li
          key={member.name}
          className={aboutMemberCardClass}
        >
          <img
            src={member.image}
            alt={member.name}
            className={aboutAvatarClass}
          />

          <div className="flex justify-center gap-4">
            <a
              href={member.github}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} GitHub`}
            >
              <FaGithub size={26} />
            </a>

            <a
              href={member.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label={`${member.name} LinkedIn`}
            >
              <FaLinkedin size={26} />
            </a>
          </div>

          <span className={aboutMemberNameClass}>
            {member.name}
          </span>

          <span className={aboutMemberRoleClass}>
            {member.role}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default AboutPage;
