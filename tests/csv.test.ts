import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseParticipants } from "../lib/csv";

describe("importação da lista", () => {
  it("aceita CSV brasileiro com BOM, acentos e ponto e vírgula", () => {
    const result = parseParticipants('\uFEFFNome completo;E-mail;Telefone;Empresa;Ingresso\n"Ana, Maria";ana@example.com;(43) 99999-9999;Empresa A;1º lote');
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0].name, "Ana, Maria");
    assert.equal(result.rows[0].ticket, "1º lote");
  });
  it("detecta contatos inválidos em vez de importar silenciosamente", () => {
    const result = parseParticipants("Nome,Email,Telefone\nAna,email-invalido,123");
    assert.equal(result.rows.length, 0);
    assert.match(result.errors[0], /Linha 2/);
  });
  it("exige uma coluna de identificação da participante", () => {
    assert.throws(() => parseParticipants("Produto,Valor\nIngresso,97"), /coluna Nome/);
  });
  it("aceita nomes iguais com contatos diferentes", () => {
    const result = parseParticipants("Nome;Email\nAna Silva;ana1@example.com\nAna Silva;ana2@example.com");
    assert.equal(result.rows.length, 2);
  });
});
