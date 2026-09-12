"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SectionOption = {
  id: string;
  name: string;
};

export function EstimateLineForm({
  quoteId,
  sections,
  disabled
}: {
  quoteId: string;
  sections: SectionOption[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [lineType, setLineType] = useState("material");
  const [manufacturer, setManufacturer] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [uom, setUom] = useState("EA");
  const [quantity, setQuantity] = useState("1");
  const [unitMaterialCost, setUnitMaterialCost] = useState("0");
  const [laborHoursPerUnit, setLaborHoursPerUnit] = useState("0");
  const [laborRate, setLaborRate] = useState("0");
  const [unitOtherCost, setUnitOtherCost] = useState("0");
  const [unitSell, setUnitSell] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const response = await fetch(`/api/v1/quotes/${quoteId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          lineType,
          manufacturer: manufacturer || null,
          partNumber: partNumber || null,
          description,
          uom,
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
        setMessage(result.error ?? "Unable to add estimate line.");
        return;
      }

      setManufacturer("");
      setPartNumber("");
      setDescription("");
      setQuantity("1");
      setUnitMaterialCost("0");
      setLaborHoursPerUnit("0");
      setLaborRate("0");
      setUnitOtherCost("0");
      setUnitSell("0");
      router.refresh();
    } catch {
      setMessage("Unable to add estimate line.");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return null;
  }

  return (
    <details className="estimate-add-panel">
      <summary>Add Estimate Line</summary>
      <form className="estimate-line-form" onSubmit={submit}>
        <div className="field-grid estimate-form-grid">
          <label>
            Section
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} required>
              {sections.map((section) => (
                <option value={section.id} key={section.id}>{section.name}</option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select value={lineType} onChange={(event) => setLineType(event.target.value)}>
              <option value="material">Material</option>
              <option value="equipment">Equipment</option>
              <option value="labor">Labor</option>
              <option value="subcontract">Subcontract</option>
              <option value="service">Service</option>
              <option value="rental">Rental</option>
              <option value="allowance">Allowance</option>
              <option value="fee">Fee</option>
              <option value="misc">Miscellaneous</option>
            </select>
          </label>

          <label>
            Manufacturer
            <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
          </label>

          <label>
            Part #
            <input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} />
          </label>

          <label className="span-2">
            Description
            <input value={description} onChange={(event) => setDescription(event.target.value)} required />
          </label>

          <label>
            UOM
            <input value={uom} onChange={(event) => setUom(event.target.value.toUpperCase())} required />
          </label>

          <label>
            Qty
            <input type="number" step="0.0001" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </label>

          <label>
            Material Unit Cost
            <input type="number" step="0.01" min="0" value={unitMaterialCost} onChange={(event) => setUnitMaterialCost(event.target.value)} />
          </label>

          <label>
            Labor Hrs / Unit
            <input type="number" step="0.0001" min="0" value={laborHoursPerUnit} onChange={(event) => setLaborHoursPerUnit(event.target.value)} />
          </label>

          <label>
            Labor Rate
            <input type="number" step="0.01" min="0" value={laborRate} onChange={(event) => setLaborRate(event.target.value)} />
          </label>

          <label>
            Other Unit Cost
            <input type="number" step="0.01" min="0" value={unitOtherCost} onChange={(event) => setUnitOtherCost(event.target.value)} />
          </label>

          <label>
            Unit Sell
            <input type="number" step="0.01" min="0" value={unitSell} onChange={(event) => setUnitSell(event.target.value)} />
          </label>
        </div>

        {message ? <div className="form-message">{message}</div> : null}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={busy || !sectionId}>
            {busy ? "Adding..." : "Add Line"}
          </button>
        </div>
      </form>
    </details>
  );
}
