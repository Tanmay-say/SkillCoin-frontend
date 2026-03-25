import type { DealResult } from "../types";
import { getSynapse, hasFilecoinKey } from "./filecoin-storage";

const PDP_EXPLORER = "https://pdp.vxb.ai/calibration/dataset";

export class SynapseService {
  /**
   * Look up the dataset that contains the given CID after upload.
   * Returns the matching dataset info or null if not found.
   */
  static async lookupDataset(cid: string): Promise<DealResult | null> {
    if (!hasFilecoinKey()) {
      return null;
    }

    try {
      const synapse = await getSynapse();
      const datasets = await synapse.storage.findDataSets();

      const matching = datasets.find((ds: any) =>
        String(ds.dataSetId) === cid || ds.pieces?.some((p: any) => p.pieceCid?.toString() === cid)
      );

      if (matching) {
        const dsId = Number(matching.dataSetId || matching.clientDataSetId);
        return {
          dealId: `dataset-${dsId}`,
          cid,
          provider: "filecoin-calibration",
          status: matching.isLive ? "active" : "pending",
          explorerUrl: `${PDP_EXPLORER}/${dsId}`,
        };
      }

      return null;
    } catch (error: any) {
      console.warn("[Synapse] Dataset lookup failed:", error.message);
      return null;
    }
  }

  /**
   * Check deal/dataset status on Calibration testnet via Synapse SDK.
   */
  static async getDealStatus(
    dealId: string
  ): Promise<{ active: boolean; provider: string; status: string }> {
    if (!hasFilecoinKey()) {
      return { active: false, provider: "none", status: "not-configured" };
    }

    const datasetId = this._extractDatasetId(dealId);
    if (datasetId === null) {
      return { active: false, provider: "none", status: "unknown" };
    }

    try {
      const synapse = await getSynapse();
      const datasets = await synapse.storage.findDataSets();
      const ds = datasets.find((d: any) => Number(d.dataSetId) === datasetId);

      return {
        active: !!ds?.isLive,
        provider: "filecoin-calibration",
        status: ds?.isLive ? "live" : "unknown",
      };
    } catch {
      return { active: false, provider: "filecoin-calibration", status: "error" };
    }
  }

  static getExplorerUrl(dealId: string): string {
    const datasetId = this._extractDatasetId(dealId);
    if (datasetId !== null) {
      return `${PDP_EXPLORER}/${datasetId}`;
    }
    return "";
  }

  private static _extractDatasetId(dealId: string): number | null {
    if (dealId.startsWith("dataset-")) {
      const id = parseInt(dealId.replace("dataset-", ""), 10);
      return isNaN(id) ? null : id;
    }
    return null;
  }
}

export default SynapseService;
