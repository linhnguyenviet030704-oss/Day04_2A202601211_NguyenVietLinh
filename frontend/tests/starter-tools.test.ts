import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STARTER_TOOL_FUNCTION_MAP,
  STARTER_TOOL_NAMES,
  STARTER_TOOL_UI_ACTIONS,
  searchPapers,
} from '../src/utils/starterTools.ts';

test('maps every starter_v0 tool to a web function', () => {
  assert.deepEqual(STARTER_TOOL_NAMES, [
    'clarify',
    'timeline',
    'social_search',
    'lookup',
    'fetch',
    'format',
    'send',
    'policy',
    'papers',
    'paper_text',
    'paper_code',
    'citation_lookup',
    'method_extract',
    'rerank',
    'source_audit',
    'citation_export',
    'compare_sources',
    'rss_search',
    'claim_extract',
  ]);

  for (const name of STARTER_TOOL_NAMES) {
    assert.equal(typeof STARTER_TOOL_FUNCTION_MAP[name].fn, 'function');
    assert.ok(STARTER_TOOL_FUNCTION_MAP[name].webFunction);
  }
});

test('provides one UI action with sample args for every starter tool', () => {
  assert.deepEqual(
    STARTER_TOOL_UI_ACTIONS.map((action) => action.tool),
    STARTER_TOOL_NAMES,
  );

  for (const action of STARTER_TOOL_UI_ACTIONS) {
    assert.equal(action.run, STARTER_TOOL_FUNCTION_MAP[action.tool].fn);
    assert.ok(action.label);
    assert.ok(action.description);
    assert.equal(typeof action.args, 'object');
  }

  assert.deepEqual(STARTER_TOOL_UI_ACTIONS.find((action) => action.tool === 'send')?.args, {
    text: 'ScholarHub starter tool dry run',
    confirmed: false,
  });
});

test('tool function posts to the starter bridge', async () => {
  const calls: unknown[] = [];
  const fetchStub = async (url: string, init?: RequestInit) => {
    calls.push({url, init});
    return Response.json({success: true, result: {tool: 'papers', result: {items: []}}});
  };

  const data = await searchPapers({query: 'RAG', max_results: 1}, fetchStub);

  assert.equal(data.success, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    url: '/api/agent/run',
    init: {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({tool: 'papers', args: {query: 'RAG', max_results: 1}}),
    },
  });
});
