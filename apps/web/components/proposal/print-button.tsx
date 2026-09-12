"use client";
export function PrintProposalButton() {
  return <button className="primary-button" type="button" onClick={()=>window.print()}>Print / Save as PDF</button>;
}
