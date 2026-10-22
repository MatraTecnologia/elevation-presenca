import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { identityKey, normalize, transition } from "../lib/attendance";
import { summarize, timeline } from "../lib/stats";
import type { Snapshot } from "../lib/contracts";

describe("controle de presença", () => {
  it("permite entrada, pausa, reentrada e saída definitiva", () => {
    assert.equal(transition("EXPECTED", "ENTRY"), "INSIDE");
    assert.equal(transition("INSIDE", "EXIT"), "OUTSIDE");
    assert.equal(transition("OUTSIDE", "ENTRY"), "INSIDE");
    assert.equal(transition("INSIDE", "DEPARTURE"), "LEFT");
    assert.equal(transition("LEFT", "ENTRY"), "INSIDE");
    assert.equal(transition("OUTSIDE", "DEPARTURE"), "LEFT");
  });
  it("recusa entrada duplicada e saída sem chegada", () => {
    assert.throws(() => transition("INSIDE", "ENTRY"));
    assert.throws(() => transition("EXPECTED", "EXIT"));
    assert.throws(() => transition("EXPECTED", "DEPARTURE"));
    assert.throws(() => transition("LEFT", "EXIT"));
  });
  it("normaliza busca e contatos sem usar só o nome como identificador", () => {
    assert.equal(normalize("  Júlia CONCEIÇÃO "), "julia conceicao");
    assert.equal(identityKey(" ANA@EMAIL.COM ", "43999999999"), "email:ana@email.com");
    assert.equal(identityKey(null, "(43) 99999-9999"), "phone:43999999999");
    assert.equal(identityKey(null, null), null);
  });
  it("não duplica comparecimento nas reentradas nem inclui movimentos desfeitos", () => {
    const data = {
      event: { startsAt: "2026-10-23T17:00:00Z", endsAt: "2026-10-23T22:00:00Z" },
      registrations: [{ id: "a", state: "INSIDE" }, { id: "b", state: "EXPECTED" }, { id: "c", state: "LEFT" }],
      movements: [
        { registrationId: "a", kind: "ENTRY", previousState: "EXPECTED", nextState: "INSIDE", recordedAt: "2026-10-23T17:00:00Z", voidedAt: null },
        { registrationId: "a", kind: "EXIT", previousState: "INSIDE", nextState: "OUTSIDE", recordedAt: "2026-10-23T17:20:00Z", voidedAt: null },
        { registrationId: "a", kind: "ENTRY", previousState: "OUTSIDE", nextState: "INSIDE", recordedAt: "2026-10-23T17:30:00Z", voidedAt: null },
        { registrationId: "b", kind: "ENTRY", previousState: "EXPECTED", nextState: "INSIDE", recordedAt: "2026-10-23T17:40:00Z", voidedAt: "2026-10-23T17:41:00Z" },
        { registrationId: "c", kind: "ENTRY", previousState: "EXPECTED", nextState: "INSIDE", recordedAt: "2026-10-23T17:45:00Z", voidedAt: null },
        { registrationId: "c", kind: "DEPARTURE", previousState: "INSIDE", nextState: "LEFT", recordedAt: "2026-10-23T18:00:00Z", voidedAt: null },
      ],
    } as Snapshot;
    assert.deepEqual(summarize(data), { total: 3, attended: 2, inside: 1, outside: 0, departed: 1, waiting: 1, rate: 67 });
    const chart = timeline(data);
    assert.equal(chart.reduce((sum, bucket) => sum + bucket.entradas, 0), 3);
    assert.equal(chart.at(-1)?.ocupacao, 1);
  });
});
