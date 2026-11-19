// Runs the built @unicep/core (ESM and CJS) with a fake `fetch`, so it can be executed on the
// oldest supported Node.js without any of the repository tooling.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from '../packages/core/dist/index.js';

const require = createRequire(import.meta.url);
const cjs = require('../packages/core/dist/index.cjs');

const viaCepBody = {
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
  ibge: '3550308',
  complemento: '',
};

const fakeFetch = async (url) =>
  new Response(JSON.stringify(String(url).includes('99999999') ? { erro: 'true' } : viaCepBody), {
    status: 200,
  });

for (const [format, lib] of [
  ['esm', esm],
  ['cjs', cjs],
]) {
  const unicep = new lib.Unicep({
    providers: [lib.viaCep({ fetch: fakeFetch })],
    timeoutMs: 2000,
  });

  const address = await unicep.lookup('01310-100');
  assert.equal(address.cep, '01310100', `${format}: cep`);
  assert.equal(address.city, 'São Paulo', `${format}: city`);
  assert.equal(address.provider, 'viacep', `${format}: provider`);

  await assert.rejects(unicep.lookup('99999999'), lib.CepNotFoundError, `${format}: not found`);
  console.log(`${format}: ok`);
}

console.log(`Smoke test passed on Node ${process.versions.node}`);
