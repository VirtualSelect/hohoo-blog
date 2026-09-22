export const outcomes = [
  "timeout",
  "http-error",
  "invalid-json",
  "empty-answer",
  "success",
];
export function initialFailureState() {
  return { safe: [], naive: [], pending: null, attempts: [], nextId: 1 };
}
// Deliberately naive append-on-send is compared with atomic commit-on-success.
export function failureReducer(state, action) {
  if (action.type === "reset") return initialFailureState();
  if (action.type === "send") {
    if (state.pending || !action.question?.trim() || state.attempts.length >= 8)
      return state;
    const user = { role: "user", content: action.question.trim() };
    return {
      ...state,
      naive: [...state.naive, user],
      pending: { id: state.nextId, user, request: [...state.safe, user] },
      nextId: state.nextId + 1,
    };
  }
  if (action.type === "resolve") {
    if (
      !state.pending ||
      action.id !== state.pending.id ||
      !outcomes.includes(action.outcome)
    )
      return state;
    const success = action.outcome === "success";
    const reply = { role: "assistant", content: "fixture-response" };
    return {
      ...state,
      safe: success ? [...state.safe, state.pending.user, reply] : state.safe,
      naive: success ? [...state.naive, reply] : state.naive,
      pending: null,
      attempts: [
        ...state.attempts,
        {
          id: state.pending.id,
          outcome: action.outcome,
          safeCount: success ? state.safe.length + 2 : state.safe.length,
          naiveCount: success ? state.naive.length + 1 : state.naive.length,
        },
      ],
    };
  }
  return state;
}
