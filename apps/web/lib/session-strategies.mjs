// A bounded teaching model of Demo 05/06/09 semantics, not a Java run or benchmark.
export const sessionPolicies = ["serial", "first-commit", "latest-start"];
export const sessionCases = ["a-first", "b-first", "b-fails"];
export const defaultSessionView = {
  policy: "latest-start",
  scenario: "b-fails",
};

export function readSessionView(search) {
  const query = new URLSearchParams(search);
  const policy = query.get("sessionPolicy");
  const scenario = query.get("sessionCase");
  return {
    policy:
      typeof policy === "string" && sessionPolicies.includes(policy)
        ? policy
        : defaultSessionView.policy,
    scenario:
      typeof scenario === "string" && sessionCases.includes(scenario)
        ? scenario
        : defaultSessionView.scenario,
  };
}

export function sessionViewUrl(base, view) {
  if (
    !sessionPolicies.includes(view.policy) ||
    !sessionCases.includes(view.scenario)
  )
    throw Error("Unknown session view");
  const url = new URL(base);
  url.searchParams.set("sessionPolicy", view.policy);
  url.searchParams.set("sessionCase", view.scenario);
  url.hash = "java-session-guide";
  return url.pathname + url.search + url.hash;
}

export function sessionTrace(policy, scenario) {
  if (!sessionPolicies.includes(policy) || !sessionCases.includes(scenario))
    throw Error("Unknown session scenario");
  /** @type {string[]} */
  const history = [];
  /** @type {Array<{request: string, action: string, history: string[]}>} */
  const events = [];
  /** @type {Record<string, string[]>} */
  const snapshots = {};
  /** @type {Record<string, string>} */
  const outcomes = {};
  const tickets = {};
  let version = 0,
    epoch = 0,
    active = null;
  const record = (request, action) =>
    events.push({ request, action, history: [...history] });
  function start(request) {
    snapshots[request] = [...history];
    tickets[request] = { version, epoch: ++epoch };
    active = request;
    record(request, "start");
  }
  function finish(request, success) {
    if (!success) {
      outcomes[request] = "FAILED";
      if (policy === "latest-start" && active === request) {
        active = null;
        ++epoch;
      }
      record(request, "fail");
      return;
    }
    const accepted =
      policy === "serial" ||
      (policy === "first-commit"
        ? tickets[request].version === version
        : active === request && tickets[request].epoch === epoch);
    outcomes[request] = accepted ? "COMMITTED" : "STALE";
    if (accepted) {
      history.push(request);
      ++version;
      if (policy === "latest-start") active = null;
    }
    record(request, accepted ? "commit" : "stale");
  }
  start("A");
  if (policy === "serial") {
    // B is a submitted intention, not a dispatched transport request yet.
    record("B", "queue");
    finish("A", true);
    start("B");
    finish("B", scenario !== "b-fails");
  } else {
    start("B");
    for (const request of scenario === "a-first" ? ["A", "B"] : ["B", "A"])
      finish(request, request !== "B" || scenario !== "b-fails");
  }
  return { events, snapshots, outcomes, history: [...history] };
}
