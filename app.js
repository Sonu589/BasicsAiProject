(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const briefInput = $('#briefInput');
  const outputInput = $('#outputInput');
  const checklistEl = $('#checklist');
  const repairPrompt = $('#repairPrompt');
  const requirementsInput = $('#requirementsInput');
  const checklistEditor = $('#checklistEditor');
  const toast = $('#toast');
  let toastTimer;
  let customRequirements = null;
  let currentResults = [];

  const demoBrief = 'Create a three-day vegetarian meal plan for two people, within ₹1,200, with preparation taking no more than 20 minutes per meal. Include a complete shopping list.';
  const demoOutput = 'Day 1 breakfast: Oats & banana (10 minutes). Lunch: chickpea salad (15 minutes). Dinner: paneer wraps (15 minutes).\nDay 2 breakfast: poha (15 minutes). Lunch: vegetable pulao (20 minutes). Dinner: paneer tikka and salad, preparation around 45 minutes.\nDay 3 breakfast: upma (20 minutes). Lunch: rajma rice (35 minutes). Dinner: khichdi (20 minutes).\nAll dishes are vegetarian. Estimated total cost ₹1,150. Quantities are listed for one person.\nShopping list: oats 200g, bananas 3, chickpeas 250g, paneer 400g, rice 1kg, vegetables 1.5kg.';

  const initialRequirements = () => [
    { id: 'vegetarian', title: 'Vegetarian meals', type: 'vegetarian', detail: 'All meals must be vegetarian.' },
    { id: 'budget', title: 'Budget under ₹1,200', type: 'budget', limit: 1200, detail: 'Total estimated cost must stay within ₹1,200.' },
    { id: 'servings', title: 'Serves two people', type: 'servings', people: 2, detail: 'Portions need to cover two people.' },
    { id: 'prep', title: 'Maximum 20-minute prep', type: 'prep', limit: 20, detail: 'Each meal should take no more than 20 minutes.' },
    { id: 'shopping', title: 'Complete shopping list', type: 'shopping', detail: 'Include a shopping list of ingredients.' }
  ];

  let requirements = initialRequirements();

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalise(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9₹.\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function findSentence(text, pattern) {
    const sentences = String(text || '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    return sentences.find(sentence => pattern.test(sentence)) || '';
  }

  function amountCandidates(text) {
    const matches = [];
    const pattern = /(?:₹\s*|rs\.?\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(parsed)) matches.push({ amount: parsed, text: match[0].trim(), index: match.index });
    }
    const fallback = /(?:total cost|estimated cost|budget|costs? of|costs?ing)\s*(?:is|of|:)?\s*([\d,]+)(?!\s*(?:minutes?|mins?))/gi;
    while ((match = fallback.exec(text)) !== null) {
      const parsed = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(parsed) && !matches.some(item => Math.abs(item.amount - parsed) < .001)) matches.push({ amount: parsed, text: match[0].trim(), index: match.index });
    }
    return matches;
  }

  function analyseRequirement(requirement, brief, output) {
    const text = String(output || '');
    const lower = normalise(text);
    const empty = !text.trim();
    if (empty) return { ...requirement, status: 'review', statusLabel: 'Needs review', finding: 'Paste an AI-generated result to check this requirement.', evidence: 'No output provided yet.' };

    if (requirement.type === 'vegetarian') {
      const contradiction = findSentence(text, /\b(chicken|beef|pork|bacon|fish|salmon|tuna|lamb|turkey)\b/i);
      if (contradiction) return { ...requirement, status: 'contradicted', statusLabel: 'Contradicted', finding: 'A non-vegetarian ingredient appears in the result.', evidence: contradiction };
      const evidence = findSentence(text, /\b(vegetarian|vegan|plant[- ]based|meat[- ]free)\b/i);
      if (evidence) return { ...requirement, status: 'met', statusLabel: 'Met', finding: 'The result explicitly describes the meals as vegetarian.', evidence };
      const dishEvidence = findSentence(text, /\b(chickpea|paneer|oats|vegetable|dal|lentil|tofu|beans|khichdi|upma|poha)\b/i);
      return { ...requirement, status: 'review', statusLabel: 'Needs review', finding: 'No explicit dietary confirmation was found. Ingredient-level review is still needed.', evidence: dishEvidence || 'No clear dietary evidence found.' };
    }

    if (requirement.type === 'budget') {
      const amounts = amountCandidates(text);
      if (amounts.length) {
        const totalMention = amounts.find(a => /total|estimated|budget|cost/i.test(a.text)) || amounts[amounts.length - 1];
        const evidence = findSentence(text, /(?:₹|\brs\.?\s*|\binr\s*)[\d,]+/i) || totalMention.text;
        if (totalMention.amount <= Number(requirement.limit)) return { ...requirement, status: 'met', statusLabel: 'Met', finding: `The stated amount ₹${Math.round(totalMention.amount).toLocaleString('en-IN')} is within the ₹${Number(requirement.limit).toLocaleString('en-IN')} limit.`, evidence };
        return { ...requirement, status: 'contradicted', statusLabel: 'Contradicted', finding: `The stated amount ₹${Math.round(totalMention.amount).toLocaleString('en-IN')} exceeds the ₹${Number(requirement.limit).toLocaleString('en-IN')} limit.`, evidence };
      }
      return { ...requirement, status: 'review', statusLabel: 'Needs review', finding: 'No clear total cost was found, so the budget cannot be checked from this text.', evidence: 'No total amount located.' };
    }

    if (requirement.type === 'servings') {
      const negative = findSentence(text, /\b(for one person|one person|single serving|serves? one|servings? for one|for 1 person|1 serving)\b/i);
      if (negative) return { ...requirement, status: 'contradicted', statusLabel: 'Contradicted', finding: 'The output explicitly describes a single-person quantity.', evidence: negative };
      const positive = findSentence(text, /\b(for two people|for 2 people|serves? two|serves? 2|two servings|2 servings|serves? both people|for a couple)\b/i);
      if (positive) return { ...requirement, status: 'met', statusLabel: 'Met', finding: 'The result explicitly mentions two-person portions.', evidence: positive };
      return { ...requirement, status: 'review', statusLabel: 'Needs review', finding: 'The serving size is not explicit in the result.', evidence: 'No clear serving-size statement located.' };
    }

    if (requirement.type === 'prep') {
      const timeRegex = /(\d{1,3})\s*(?:-|\s)?\s*(?:minutes?|mins?)\b/gi;
      const timeMentions = [];
      let match;
      while ((match = timeRegex.exec(text)) !== null) timeMentions.push({ minutes: Number(match[1]), index: match.index, phrase: match[0] });
      const tooLong = timeMentions.find(t => t.minutes > Number(requirement.limit));
      if (tooLong) {
        const evidence = findSentence(text, new RegExp(`\\b${tooLong.minutes}\\s*(?:-|\\s)?\\s*(?:minutes?|mins?)\\b`, 'i')) || tooLong.phrase;
        return { ...requirement, status: 'contradicted', statusLabel: 'Contradicted', finding: `At least one stated preparation time (${tooLong.minutes} minutes) exceeds the ${requirement.limit}-minute limit.`, evidence };
      }
      if (timeMentions.length) return { ...requirement, status: 'met', statusLabel: 'Met', finding: `All ${timeMentions.length} detected time mentions are at or below ${requirement.limit} minutes. This is a text check, not a full recipe validation.`, evidence: timeMentions.slice(0, 4).map(t => t.phrase).join(' · ') };
      return { ...requirement, status: 'review', statusLabel: 'Needs review', finding: 'No explicit preparation times were found.', evidence: 'No minute-based preparation times located.' };
    }

    if (requirement.type === 'shopping') {
      const evidence = findSentence(text, /\b(shopping list|grocery list|ingredients to buy|items to buy)\b/i);
      if (evidence) return { ...requirement, status: 'met', statusLabel: 'Met', finding: 'A shopping list is present in the output.', evidence };
      return { ...requirement, status: 'missing', statusLabel: 'Missing', finding: 'No shopping list or list of items to buy was found.', evidence: 'No shopping-list heading or equivalent phrase located.' };
    }

    const keywords = requirement.keywords || deriveKeywords(requirement.title);
    const matched = keywords.filter(keyword => normalise(text).includes(normalise(keyword)));
    if (matched.length >= Math.max(1, Math.ceil(keywords.length * .6))) {
      const firstKeyword = matched[0];
      const evidence = findSentence(text, new RegExp(escapeRegExp(firstKeyword), 'i')) || text.slice(0, 180);
      return { ...requirement, status: 'met', statusLabel: 'Text match', finding: `Found ${matched.length} of ${keywords.length} configured signal phrases. Confirm that the match satisfies the meaning.`, evidence };
    }
    if (matched.length) {
      const evidence = findSentence(text, new RegExp(escapeRegExp(matched[0]), 'i')) || matched[0];
      return { ...requirement, status: 'review', statusLabel: 'Partial match', finding: `Only ${matched.length} of ${keywords.length} signal phrases were found. Review manually.`, evidence };
    }
    return { ...requirement, status: 'missing', statusLabel: 'No match', finding: 'No configured signal phrase was found in the output. This is not proof the requirement is absent.', evidence: 'No matching excerpt found.' };
  }

  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function deriveKeywords(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 3 && !['requirement','include','provide','must','should','complete','result','original','brief'].includes(word)).slice(0, 4);
  }

  function parseRequirements(brief) {
    const text = String(brief || '').trim();
    const out = [];
    const add = (requirement) => { if (!out.some(item => item.type === requirement.type && item.title === requirement.title)) out.push(requirement); };
    if (/\bvegetarian\b|\bvegan\b|plant[- ]based/i.test(text)) add({ id: cryptoId(), title: 'Vegetarian meals', type: 'vegetarian', detail: 'Check the dietary constraint.' });
    const currencyLimit = text.match(/(?:within|under|below|maximum(?: of)?|budget(?: of)?|no more than)\s*(?:₹|rs\.?\s*|inr\s*)?([\d,]+)\s*(?:rupees?|₹|rs\.?|inr)?/i);
    if (currencyLimit && (/₹|\brs\b|\binr\b|rupees?|budget|cost/i.test(text) || Number(currencyLimit[1].replace(/,/g,'')) >= 100)) {
      const limit = Number(currencyLimit[1].replace(/,/g, ''));
      if (Number.isFinite(limit) && limit > 0) add({ id: cryptoId(), title: `Budget under ₹${limit.toLocaleString('en-IN')}`, type: 'budget', limit, detail: `Check the stated total against ₹${limit.toLocaleString('en-IN')}.` });
    }
    if (/\b(two|2) people\b|\b(two|2) persons\b|\bserves? two\b/i.test(text)) add({ id: cryptoId(), title: 'Serves two people', type: 'servings', people: 2, detail: 'Check for an explicit serving-size statement.' });
    const prep = text.match(/(?:no more than|at most|maximum(?: of)?|under|within|less than)\s*(\d{1,3})\s*(?:-|\s)?\s*(?:minutes?|mins?)(?:\s+per\s+(?:meal|dish|task))?/i) || text.match(/(\d{1,3})\s*[- ]minute\s+(?:prep|preparation|meals?)/i);
    if (prep) add({ id: cryptoId(), title: `Maximum ${Number(prep[1])}-minute prep`, type: 'prep', limit: Number(prep[1]), detail: `Check stated preparation times against ${Number(prep[1])} minutes.` });
    if (/shopping list|grocery list|ingredients to buy/i.test(text)) add({ id: cryptoId(), title: 'Complete shopping list', type: 'shopping', detail: 'Look for a shopping list or equivalent.' });
    if (out.length === 0) {
      const chunks = text.split(/\n+|(?<=[.!?])\s+/).map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(s => s.length >= 8).slice(0, 7);
      chunks.forEach((chunk, index) => add({ id: cryptoId(), title: chunk.length > 72 ? `${chunk.slice(0, 69)}…` : chunk, type: 'generic', keywords: deriveKeywords(chunk), detail: 'Generic text-match check; edit signal phrases for more reliable results.' }));
    }
    if (!out.length) out.push({ id: cryptoId(), title: 'Clarify the main deliverable', type: 'generic', keywords: [], detail: 'Add a more specific requirement to check.' });
    return out;
  }

  function cryptoId() { return `req-${Math.random().toString(36).slice(2, 10)}`; }

  function statusIcon(status) {
    if (status === 'met') return '✓';
    if (status === 'contradicted') return '!';
    if (status === 'missing') return '×';
    return '◷';
  }

  function renderResults(results) {
    checklistEl.innerHTML = results.map(item => `
      <div class="requirement-row status-${escapeHTML(item.status)}">
        <div class="row-status-icon" aria-hidden="true">${statusIcon(item.status)}</div>
        <div class="requirement-main">
          <div class="requirement-title">${escapeHTML(item.title)}</div>
          <div class="requirement-detail">${escapeHTML(item.finding)}</div>
          <div class="evidence-label">EVIDENCE</div>
          <div class="evidence-snippet">${escapeHTML(item.evidence)}</div>
        </div>
        <span class="status-badge badge-${escapeHTML(item.status)}">${escapeHTML(item.statusLabel)}</span>
      </div>`).join('');
    const met = results.filter(item => item.status === 'met').length;
    const attention = results.length - met;
    $('#metricTotal').textContent = results.length;
    $('#metricMet').textContent = met;
    $('#metricIssues').textContent = attention;
    $('#auditCompleteText').textContent = `${results.length} requirement${results.length === 1 ? '' : 's'} checked`;
    const complete = $('#auditComplete');
    complete.classList.toggle('needs-attention', attention > 0);
    complete.querySelector('strong').textContent = attention ? 'Review findings' : 'Audit complete';
    currentResults = results;
    updateRepairPrompt(results);
  }

  function updateRepairPrompt(results) {
    const issues = results.filter(item => item.status !== 'met');
    const satisfied = results.filter(item => item.status === 'met').map(item => item.title.toLowerCase());
    if (!issues.length) {
      repairPrompt.value = 'Review the evidence for each requirement. The current text check found a match for every configured requirement, but please verify factual correctness before relying on the result.';
      return;
    }
    const issueLines = issues.map((item, index) => `${index + 1}. ${item.title}: ${item.finding}`).join('\n');
    const preserve = satisfied.length ? `Preserve the requirements that already appear satisfied: ${satisfied.join(', ')}.` : 'Preserve all parts of the original request that are already satisfied.';
    repairPrompt.value = `Revise the output to address only these requirement gaps:\n${issueLines}\n\n${preserve} Do not add unrelated features. Keep the original scope and structure, and briefly explain what changed. If a requirement cannot be verified from the supplied information, say so rather than guessing.`;
  }

  function runAudit(showFeedback = true) {
    const brief = briefInput.value.trim();
    const output = outputInput.value.trim();
    if (!brief) { briefInput.focus(); showToast('Add your brief', 'Paste the original request before running the audit.'); return; }
    if (!output) { outputInput.focus(); showToast('Add the AI result', 'Paste the answer you want to check.'); return; }
    if (!requirements.length) requirements = parseRequirements(brief);
    const results = requirements.map(item => analyseRequirement(item, brief, output));
    renderResults(results);
    if (showFeedback) showToast('Audit updated', `${results.length} requirements checked against the pasted text.`);
  }

  function showToast(title, message) {
    $('#toastTitle').textContent = title;
    $('#toastMessage').textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function updateCounts() {
    $('#briefCount').textContent = `${briefInput.value.length.toLocaleString()} characters`;
    $('#outputCount').textContent = `${outputInput.value.length.toLocaleString()} characters`;
  }

  function openEditor() {
    requirementsInput.value = requirements.map(item => item.title).join('\n');
    checklistEditor.hidden = false;
    $('#editChecklist').setAttribute('aria-expanded', 'true');
    requirementsInput.focus();
  }
  function closeEditor() { checklistEditor.hidden = true; $('#editChecklist').setAttribute('aria-expanded', 'false'); }

  function saveEditedRequirements() {
    const labels = requirementsInput.value.split(/\n+/).map(text => text.trim()).filter(Boolean).slice(0, 12);
    if (!labels.length) { showToast('Keep at least one requirement', 'Add a line to your checklist, then apply it.'); return; }
    const previous = new Map(requirements.map(item => [item.title, item]));
    requirements = labels.map(title => previous.get(title) || ({ id: cryptoId(), title, type: 'generic', keywords: deriveKeywords(title), detail: 'Generic text-match check. Review the evidence carefully.' }));
    customRequirements = true;
    closeEditor();
    runAudit();
  }

  async function copyText(value, successTitle) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const temp = document.createElement('textarea'); temp.value = value; temp.style.position = 'fixed'; temp.style.opacity = '0'; document.body.appendChild(temp); temp.select();
        const success = document.execCommand('copy'); temp.remove(); if (!success) throw new Error('Copy unavailable');
      }
      showToast(successTitle || 'Copied to clipboard', 'Ready to paste into your AI tool.');
    } catch (error) {
      showToast('Copy not available', 'Select the text manually and copy it.');
    }
  }

  function buildReport() {
    const lines = [
      '# BriefGuard audit report', '',
      `Generated: ${new Date().toLocaleString()}`, '',
      '## Original brief', briefInput.value.trim(), '',
      '## AI-generated result', outputInput.value.trim(), '',
      '## Findings',
      ...currentResults.flatMap(item => [`### ${item.title}`, `Status: ${item.statusLabel}`, item.finding, `Evidence: ${item.evidence}`, '']),
      '## Targeted repair prompt', repairPrompt.value.trim(), '',
      '> Note: This prototype uses transparent text patterns. A text match is not proof of factual correctness.'
    ];
    return lines.join('\n');
  }

  function exportReport() {
    const blob = new Blob([buildReport()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'briefguard-audit-report.md'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    showToast('Report exported', 'Your Markdown report was downloaded.');
  }

  function resetExample() {
    briefInput.value = demoBrief;
    outputInput.value = demoOutput;
    requirements = initialRequirements();
    customRequirements = null;
    closeEditor(); updateCounts(); runAudit();
  }

  function clearBrief() { briefInput.value = ''; updateCounts(); briefInput.focus(); }
  function clearOutput() { outputInput.value = ''; updateCounts(); outputInput.focus(); }

  function showInfo(which) {
    const how = $('#howPanel'); const principles = $('#principlesPanel');
    how.hidden = which !== 'how'; principles.hidden = which !== 'principles';
    document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === which || (which === 'workspace' && button.dataset.nav === 'workspace')));
    if (which !== 'workspace') (which === 'how' ? how : principles).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    else $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#runAudit').addEventListener('click', () => runAudit(true));
  $('#runAuditTop').addEventListener('click', () => runAudit(true));
  $('#resetButton').addEventListener('click', resetExample);
  $('#extractButton').addEventListener('click', () => {
    const parsed = parseRequirements(briefInput.value);
    if (!parsed.length) { showToast('No clear requirements found', 'Add a more specific brief or write checklist items manually.'); return; }
    requirements = parsed;
    customRequirements = true;
    runAudit();
    showToast('Checklist built', `${requirements.length} candidate requirements extracted. Review them for accuracy.`);
  });
  $('#editChecklist').addEventListener('click', openEditor);
  $('#closeEditor').addEventListener('click', closeEditor);
  $('#cancelEditor').addEventListener('click', closeEditor);
  $('#saveEditor').addEventListener('click', saveEditedRequirements);
  $('#copyPrompt').addEventListener('click', () => copyText(repairPrompt.value, 'Repair prompt copied'));
  $('#exportReport').addEventListener('click', exportReport);
  $('#clearBrief').addEventListener('click', clearBrief);
  $('#clearOutput').addEventListener('click', clearOutput);
  $('#helpButton').addEventListener('click', () => showInfo('how'));
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => showInfo(button.dataset.nav)));
  document.querySelectorAll('.close-info').forEach(button => button.addEventListener('click', () => showInfo('workspace')));
  briefInput.addEventListener('input', updateCounts);
  outputInput.addEventListener('input', updateCounts);

  updateCounts();
  runAudit(false);
})();
