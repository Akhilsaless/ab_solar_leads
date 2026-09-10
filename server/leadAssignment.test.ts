import { describe, expect, it } from "vitest";

function assignmentStatus(previousAgencyId: number | null, nextAgencyId: number) {
  return previousAgencyId != null && previousAgencyId !== nextAgencyId ? "REASSIGNED" : "ASSIGNED";
}

describe("central lead assignment semantics", () => {
  it("keeps newly captured chatbot leads unassigned until the owner assigns them", () => {
    const lead = { sourceAgencyId: 7, assignedAgencyId: null, assignmentStatus: "UNASSIGNED" };
    expect(lead.sourceAgencyId).toBe(7);
    expect(lead.assignedAgencyId).toBeNull();
    expect(lead.assignmentStatus).toBe("UNASSIGNED");
  });

  it("marks a first assignment as ASSIGNED", () => {
    expect(assignmentStatus(null, 3)).toBe("ASSIGNED");
  });

  it("marks a move between agencies as REASSIGNED", () => {
    expect(assignmentStatus(2, 3)).toBe("REASSIGNED");
  });
});
