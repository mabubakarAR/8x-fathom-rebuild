import { buildMeeting, type BuiltMeeting, type MeetingSpec } from "./build";
import { PERSON_BY_ID } from "./cast";
import { ROADMAP_LOCK } from "./meetings/roadmap-lock";
import { BRIGHTWATER_QBR, KESTREL_DISCOVERY } from "./meetings/customer";
import {
  AUGUST_RETRO,
  CANDIDATE_INTERVIEW,
  KESTREL_FOLLOWUP,
  ONE_ON_ONE,
  PLATFORM_STANDUP,
  SUPPORT_REVIEW,
} from "./meetings/internal";

export const SPECS: MeetingSpec[] = [
  ROADMAP_LOCK,
  BRIGHTWATER_QBR,
  KESTREL_DISCOVERY,
  KESTREL_FOLLOWUP,
  ONE_ON_ONE,
  PLATFORM_STANDUP,
  SUPPORT_REVIEW,
  CANDIDATE_INTERVIEW,
  AUGUST_RETRO,
];

export function buildAll(): BuiltMeeting[] {
  return SPECS.map((spec) => {
    const built = buildMeeting(spec);
    // The builder doesn't know the cast, so external-guest detection happens here.
    built.meeting.hasExternal = built.meeting.participants.some(
      (p) => PERSON_BY_ID.get(p.personId)?.external,
    );
    return built;
  }).sort(
    (a, b) =>
      new Date(b.meeting.startedAt).getTime() -
      new Date(a.meeting.startedAt).getTime(),
  );
}
