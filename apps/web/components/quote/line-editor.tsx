"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LineEditor({
  quoteId,
  line
}: {
  quoteId: string;
  line: {
    id: string;
    quantity: number;
    unit_material_cost: number;
    labor_hours_per_unit: number;
    labor_rate: number;
    unit_other_cost: number;
    unit_sell: number;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [unitMaterialCost, setUnitMaterialCost] = useState(String(line.unit_material_cost));
  const [laborHoursPerUnit, setLaborHoursPerUnit] = useState(String(line.labor_hours_per_unit));
  const [laborRate, setLaborRate] = useState(String(line.labor_rate));
  const [unitOtherCost, setUnitOtherCost] = useState(String(line.unit_other_cost));
  const [unitSell, setUnitSell] = useState(String(line.unit_sell));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/quotes/${quoteId}/lines/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(quantity),
          unitMaterialCost: Number(unitMaterialCost),
          laborHoursPerUnit: Number(laborHoursPerUnit),
          laborRate: Number(laborRate),
          unitOtherCost: Number(unitOtherCost),
          unitSell: Number(unitSell)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to update line.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setMessage("Unable to update line.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="line-edit-wrap">
      <button className="text-button compact-text-button" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Close" : "Edit"}
      </button>

      {open ? (
        <div className="line-edit-popover">
          <label>Qty<input type="number" step="0.0001" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
          <label>Mat. Unit Cost<input type="number" step="0.01" min="0" value={unitMaterialCost} onChange={(e) => setUnitMaterialCost(e.target.value)} /></label>
          <label>Labor Hrs/Unit<input type="number" step="0.0001" min="0" value={laborHoursPerUnit} onChange={(e) => setLaborHoursPerUnit(e.target.value)} /></label>
          <label>Labor Rate<input type="number" step="0.01" min="0" value={laborRate} onChange={(e) => setLaborRate(e.target.value)} /></label>
          <label>Other Unit Cost<input type="number" step="0.01" min="0" value={unitOtherCost} onChange={(e) => setUnitOtherCost(e.target.value)} /></label>
          <label>Unit Sell<input type="number" step="0.01" min="0" value={unitSell} onChange={(e) => setUnitSell(e.target.value)} /></label>
          {message ? <span className="inline-error">{message}</span> : null}
          <button className="primary-button" type="button" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
