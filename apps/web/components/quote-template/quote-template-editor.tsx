"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  description: string | null;
  trade_scope: string | null;
  default_material_markup: number;
  active: boolean;
};

type Section = { id: string; name: string; sort_order: number };
type TemplateLine = {
  id: string;
  section_id: string;
  line_type: string;
  catalog_item_id: string | null;
  manufacturer: string | null;
  part_number: string | null;
  description: string;
  uom: string;
  quantity: number;
  unit_material_cost: number;
  labor_hours_per_unit: number;
  labor_rate: number;
  unit_other_cost: number;
  unit_sell: number;
  show_on_bom: boolean;
};

type QuoteOption = { id: string; label: string };
type CatalogItem = {
  id: string;
  item_type: string;
  manufacturer: string | null;
  part_number: string | null;
  description: string;
  uom: string;
  approved_cost: number;
};

type LineDraft = {
  sectionId: string;
  quantity: number;
  unitMaterialCost: number;
  laborHoursPerUnit: number;
  laborRate: number;
  unitOtherCost: number;
  unitSell: number;
  showOnBom: boolean;
};

async function readResult(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Action could not be completed.");
  return result;
}

export function QuoteTemplateEditor({
  template,
  sections,
  lines,
  quoteOptions
}: {
  template: Template;
  sections: Section[];
  lines: TemplateLine[];
  quoteOptions: QuoteOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [tradeScope, setTradeScope] = useState(template.trade_scope ?? "");
  const [defaultMaterialMarkup, setDefaultMaterialMarkup] = useState(Number(template.default_material_markup ?? 1.2));
  const [active, setActive] = useState(template.active);
  const [newSectionName, setNewSectionName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id ?? "");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [adHoc, setAdHoc] = useState({ manufacturer: "", partNumber: "", description: "", uom: "EA", quantity: 1, cost: 0, laborHours: 0, laborRate: 0, otherCost: 0, sell: 0 });
  const [targetQuoteId, setTargetQuoteId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>(() => Object.fromEntries(lines.map((line) => [line.id, {
    sectionId: line.section_id,
    quantity: Number(line.quantity),
    unitMaterialCost: Number(line.unit_material_cost),
    laborHoursPerUnit: Number(line.labor_hours_per_unit),
    laborRate: Number(line.labor_rate),
    unitOtherCost: Number(line.unit_other_cost),
    unitSell: Number(line.unit_sell),
    showOnBom: line.show_on_bom
  }])));

  function beginAction() {
    setMessage(null);
    setError(null);
    setBusy(true);
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginAction();
    try {
      await readResult(await fetch(`/api/v1/quote-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, tradeScope, defaultMaterialMarkup, active })
      }));
      setMessage("Template settings saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save template.");
    } finally { setBusy(false); }
  }

  async function addSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    beginAction();
    try {
      const result = await readResult(await fetch(`/api/v1/quote-templates/${template.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName })
      }));
      setNewSectionName("");
      setSelectedSectionId(result.sectionId);
      setMessage("Template section added.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add section.");
    } finally { setBusy(false); }
  }

  async function searchCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCatalogBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/catalog/items?q=${encodeURIComponent(catalogSearch)}&limit=50`);
      const result = await readResult(response);
      setCatalogItems(result.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to search catalog.");
    } finally { setCatalogBusy(false); }
  }

  async function addCatalogItem(item: CatalogItem) {
    if (!selectedSectionId) return setError("Create or select a section first.");
    beginAction();
    try {
      const cost = Number(item.approved_cost ?? 0);
      await readResult(await fetch(`/api/v1/quote-templates/${template.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          lineType: item.item_type,
          catalogItemId: item.id,
          manufacturer: item.manufacturer,
          partNumber: item.part_number,
          description: item.description,
          uom: item.uom,
          quantity: 1,
          unitMaterialCost: cost,
          laborHoursPerUnit: 0,
          laborRate: 0,
          unitOtherCost: 0,
          unitSell: cost * defaultMaterialMarkup,
          showOnBom: true
        })
      }));
      setMessage(`${item.part_number ?? item.description} added to template.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add catalog item.");
    } finally { setBusy(false); }
  }

  async function addAdHoc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSectionId) return setError("Create or select a section first.");
    beginAction();
    try {
      await readResult(await fetch(`/api/v1/quote-templates/${template.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          lineType: "material",
          catalogItemId: null,
          manufacturer: adHoc.manufacturer,
          partNumber: adHoc.partNumber,
          description: adHoc.description,
          uom: adHoc.uom,
          quantity: adHoc.quantity,
          unitMaterialCost: adHoc.cost,
          laborHoursPerUnit: adHoc.laborHours,
          laborRate: adHoc.laborRate,
          unitOtherCost: adHoc.otherCost,
          unitSell: adHoc.sell,
          showOnBom: true
        })
      }));
      setAdHoc({ manufacturer: "", partNumber: "", description: "", uom: "EA", quantity: 1, cost: 0, laborHours: 0, laborRate: 0, otherCost: 0, sell: 0 });
      setMessage("Ad-hoc item added to template.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add ad-hoc item.");
    } finally { setBusy(false); }
  }

  async function saveLine(line: TemplateLine) {
    const draft = lineDrafts[line.id];
    if (!draft) return;
    beginAction();
    try {
      await readResult(await fetch(`/api/v1/quote-templates/lines/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      }));
      setMessage(`${line.part_number ?? line.description} updated.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update line.");
    } finally { setBusy(false); }
  }

  async function deleteLine(line: TemplateLine) {
    beginAction();
    try {
      await readResult(await fetch(`/api/v1/quote-templates/lines/${line.id}`, { method: "DELETE" }));
      setMessage(`${line.part_number ?? line.description} removed.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove line.");
    } finally { setBusy(false); }
  }

  async function applyTemplate() {
    if (!targetQuoteId) return setError("Select a draft quote first.");
    beginAction();
    try {
      const result = await readResult(await fetch(`/api/v1/quote-templates/${template.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: targetQuoteId })
      }));
      setMessage(`Template applied. ${result.linesAdded} line${result.linesAdded === 1 ? "" : "s"} added; existing quote work was preserved.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to apply template.");
    } finally { setBusy(false); }
  }

  async function deleteTemplate() {
    beginAction();
    try {
      await readResult(await fetch(`/api/v1/quote-templates/${template.id}`, { method: "DELETE" }));
      router.push("/quote-templates");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete template.");
      setConfirmDelete(false);
    } finally { setBusy(false); }
  }

  function patchLineDraft(id: string, patch: Partial<LineDraft>) {
    setLineDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  return (
    <>
      <div className="template-editor-grid">
        <form className="panel template-settings-panel" onSubmit={saveTemplate}>
          <div className="panel-heading"><div><p className="section-kicker">Template</p><h2>Settings</h2></div></div>
          <div className="template-settings-body">
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>Trade / System<input value={tradeScope} onChange={(event) => setTradeScope(event.target.value)} /></label>
            <label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label>Default Material Markup Factor<input type="number" min="0" step="0.01" value={defaultMaterialMarkup} onChange={(event) => setDefaultMaterialMarkup(Number(event.target.value))} /></label>
            <label className="template-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active template</label>
            <div className="template-settings-actions"><button className="primary-button" disabled={busy}>Save Settings</button><button className="danger-button" type="button" onClick={() => setConfirmDelete(true)}>Delete Template</button></div>
          </div>
        </form>

        <section className="panel template-apply-panel">
          <div className="panel-heading"><div><p className="section-kicker">Quote Builder</p><h2>Apply Template</h2></div></div>
          <div className="template-apply-body">
            <p>Adds this template into the selected draft quote. Existing sections and estimator-entered lines are preserved.</p>
            <select value={targetQuoteId} onChange={(event) => setTargetQuoteId(event.target.value)}><option value="">Select draft quote...</option>{quoteOptions.map((quote) => <option key={quote.id} value={quote.id}>{quote.label}</option>)}</select>
            <button className="primary-button" type="button" disabled={busy || !targetQuoteId} onClick={applyTemplate}>Apply to Quote</button>
          </div>
        </section>
      </div>

      {message ? <div className="template-action-message success">{message}</div> : null}
      {error ? <div className="template-action-message error">{error}</div> : null}

      <section className="panel template-bom-panel">
        <div className="panel-heading">
          <div><p className="section-kicker">Template BOM</p><h2>Sections & Items</h2></div>
          <form className="inline-section-form" onSubmit={addSection}><input value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} placeholder="New section / header" /><button className="secondary-button" disabled={busy}>Add Section</button></form>
        </div>

        <div className="template-add-tools">
          <label>Target Section<select value={selectedSectionId} onChange={(event) => setSelectedSectionId(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <form className="template-catalog-search" onSubmit={searchCatalog}><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search manufacturer, part number, or description" /><button className="secondary-button" disabled={catalogBusy}>{catalogBusy ? "Searching..." : "Search Catalog"}</button></form>
        </div>

        {catalogItems.length ? <div className="template-catalog-results">{catalogItems.map((item) => <button type="button" key={item.id} onClick={() => addCatalogItem(item)} disabled={busy}><span><strong>{item.part_number ?? "NO PART #"}</strong><small>{item.manufacturer ?? "—"} · {item.description}</small></span><b>${Number(item.approved_cost).toFixed(2)}</b></button>)}</div> : null}

        <div className="table-wrap">
          <table className="data-table template-line-table">
            <thead><tr><th>Section</th><th>Mfr</th><th>Part #</th><th>Description</th><th className="numeric">Qty</th><th>UOM</th><th className="numeric">Unit Cost</th><th className="numeric">Labor Hrs</th><th className="numeric">Labor Rate</th><th className="numeric">Sell</th><th>BOM</th><th /></tr></thead>
            <tbody>
              {sections.flatMap((section) => lines.filter((line) => line.section_id === section.id).map((line, index) => {
                const draft = lineDrafts[line.id];
                return <tr key={line.id}>
                  <td><select value={draft?.sectionId ?? line.section_id} onChange={(event) => patchLineDraft(line.id, { sectionId: event.target.value })}>{sections.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></td>
                  <td>{line.manufacturer ?? "—"}</td><td className="mono">{line.part_number ?? "AD-HOC"}</td><td><strong>{line.description}</strong></td>
                  <td><input className="numeric-input" type="number" min="0" step="0.01" value={draft?.quantity ?? 0} onChange={(event) => patchLineDraft(line.id, { quantity: Number(event.target.value) })} /></td>
                  <td>{line.uom}</td>
                  <td><input className="numeric-input" type="number" min="0" step="0.01" value={draft?.unitMaterialCost ?? 0} onChange={(event) => patchLineDraft(line.id, { unitMaterialCost: Number(event.target.value) })} /></td>
                  <td><input className="numeric-input" type="number" min="0" step="0.01" value={draft?.laborHoursPerUnit ?? 0} onChange={(event) => patchLineDraft(line.id, { laborHoursPerUnit: Number(event.target.value) })} /></td>
                  <td><input className="numeric-input" type="number" min="0" step="0.01" value={draft?.laborRate ?? 0} onChange={(event) => patchLineDraft(line.id, { laborRate: Number(event.target.value) })} /></td>
                  <td><input className="numeric-input" type="number" min="0" step="0.01" value={draft?.unitSell ?? 0} onChange={(event) => patchLineDraft(line.id, { unitSell: Number(event.target.value) })} /></td>
                  <td><input type="checkbox" checked={draft?.showOnBom ?? true} onChange={(event) => patchLineDraft(line.id, { showOnBom: event.target.checked })} /></td>
                  <td><div className="template-line-actions"><button className="text-button" type="button" disabled={busy} onClick={() => saveLine(line)}>Save</button><button className="text-button danger-text" type="button" disabled={busy} onClick={() => deleteLine(line)}>Remove</button></div></td>
                </tr>;
              }))}
              {!lines.length ? <tr><td colSpan={12} className="table-empty">No template items yet. Search the Item Catalog or add an ad-hoc item below.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <form className="template-adhoc-form" onSubmit={addAdHoc}>
          <div className="template-adhoc-head"><div><p className="section-kicker">Ad-Hoc Item</p><h3>Add Non-Catalog Item</h3></div></div>
          <div className="template-adhoc-grid">
            <input placeholder="Manufacturer" value={adHoc.manufacturer} onChange={(event) => setAdHoc({ ...adHoc, manufacturer: event.target.value })} />
            <input placeholder="Part #" value={adHoc.partNumber} onChange={(event) => setAdHoc({ ...adHoc, partNumber: event.target.value })} />
            <input className="template-wide-field" placeholder="Description" required value={adHoc.description} onChange={(event) => setAdHoc({ ...adHoc, description: event.target.value })} />
            <input placeholder="UOM" value={adHoc.uom} onChange={(event) => setAdHoc({ ...adHoc, uom: event.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Qty" value={adHoc.quantity} onChange={(event) => setAdHoc({ ...adHoc, quantity: Number(event.target.value) })} />
            <input type="number" min="0" step="0.01" placeholder="Unit Cost" value={adHoc.cost} onChange={(event) => setAdHoc({ ...adHoc, cost: Number(event.target.value) })} />
            <input type="number" min="0" step="0.01" placeholder="Labor Hrs" value={adHoc.laborHours} onChange={(event) => setAdHoc({ ...adHoc, laborHours: Number(event.target.value) })} />
            <input type="number" min="0" step="0.01" placeholder="Labor Rate" value={adHoc.laborRate} onChange={(event) => setAdHoc({ ...adHoc, laborRate: Number(event.target.value) })} />
            <input type="number" min="0" step="0.01" placeholder="Unit Sell" value={adHoc.sell} onChange={(event) => setAdHoc({ ...adHoc, sell: Number(event.target.value) })} />
            <button className="primary-button" disabled={busy || !selectedSectionId}>Add Ad-Hoc Item</button>
          </div>
        </form>
      </section>

      {confirmDelete ? <div className="app-modal-backdrop"><section className="app-modal"><p className="section-kicker">Delete Quote Template</p><h2>Delete “{template.name}”?</h2><p>This removes the reusable template. Quotes that previously received template lines are not changed.</p><div className="app-modal-actions"><button className="secondary-button" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="danger-button" type="button" disabled={busy} onClick={deleteTemplate}>Delete Template</button></div></section></div> : null}
    </>
  );
}
